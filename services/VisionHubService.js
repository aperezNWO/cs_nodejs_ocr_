const Tesseract = require("tesseract.js");
const fs = require("fs");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");

// ---------------------------------------------------------------------------
// OpenCV via @techstark/opencv-js (pure WASM — no native compilation needed)
// ---------------------------------------------------------------------------
let cv = null;
let cvReady = false;

async function getCV() {
  if (cvReady) return cv;
  // @techstark/opencv-js calls factory() immediately and exports the Promise
  cv = await require("@techstark/opencv-js");
  cvReady = true;
  return cv;
}

function cvUnavailable(res) {
  res.status(503).json({
    success: false,
    error: "OpenCV WASM module failed to load.",
  });
}

class VisionHubService {
  //============================================================================
  // COMMON UTILITIES
  //============================================================================

  static async saveBase64Image(base64Image) {
    return new Promise((resolve, reject) => {
      const matches = base64Image.match(/^data:image\/([A-Za-z-+/]+);base64,(.+)$/);
      if (!matches) {
        reject(new Error("Invalid base64 image format"));
        return;
      }

      const fileExtension = matches[1];
      const base64Data = matches[2];
      const imageBuffer = Buffer.from(base64Data, "base64");
      const filename = `image_${Date.now()}.${fileExtension}`;
      const filePath = path.join("img/signatures/", "dest", filename);

      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFile(filePath, imageBuffer, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log("Image saved successfully:", filePath);
          resolve({ filePath, fileExtension, imageBuffer });
        }
      });
    });
  }

  //============================================================================
  // OCR FUNCTIONS
  //============================================================================

  static async recognizeText(imagePath) {
    try {
      const { data: { text } } = await Tesseract.recognize(imagePath, "eng");
      return text;
    } catch (error) {
      throw new Error(`OCR recognition failed: ${error.message}`);
    }
  }

  static async doOcr(base64Image, res) {
    try {
      const { filePath } = await this.saveBase64Image(base64Image);
      const text = await this.recognizeText(filePath);
      const message = "Text from image: " + text;
      console.debug(message);
      res.status(200).json({ message: message });
    } catch (error) {
      console.error("OCR Error:", error);
      res.status(500).json({ error: "Failed to process image" });
    }
  }

  //============================================================================
  // COMPUTER VISION - SHAPE DETECTION (opencv.js / @techstark/opencv-js)
  //============================================================================

  /**
   * Loads an image file into an OpenCV Mat using node-canvas.
   * @techstark/opencv-js has no imreadAsync — we load via canvas instead.
   */
  static async loadImageToMat(cv, imagePath) {
    const image = await loadImage(imagePath);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(0, 0, image.width, image.height);

    // imageData.data is RGBA — convert to cv.Mat
    const mat = cv.matFromImageData(imageData);
    return mat;
  }

  static async detectShapes(imagePath) {
    const shapes = [];
    let src, gray, edges, contours, hierarchy;

    try {
      const cv = await getCV();

      // Load image into Mat via canvas
      src = await VisionHubService.loadImageToMat(cv, imagePath);

      // Convert RGBA → Grayscale
      gray = new cv.Mat();
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

      // Canny edge detection
      edges = new cv.Mat();
      cv.Canny(gray, edges, 50, 150);

      // Find contours
      contours = new cv.MatVector();
      hierarchy = new cv.Mat();
      cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

      for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i);
        const perimeter = cv.arcLength(contour, true);
        const approx = new cv.Mat();
        cv.approxPolyDP(contour, approx, 0.04 * perimeter, true);

        let shape = "";
        const vertices = approx.rows;

        if (vertices === 3) {
          shape = "Triangle";
        } else if (vertices === 4) {
          const rect = cv.boundingRect(contour);
          const aspectRatio = rect.width / rect.height;
          shape = aspectRatio >= 0.95 && aspectRatio <= 1.05 ? "Square" : "Rectangle";
        } else if (vertices > 4) {
          shape = "Circle";
        }

        approx.delete();
        contour.delete();

        if (shape) shapes.push(shape);
      }

      return shapes;
    } catch (error) {
      console.error("Shape detection error:", error);
      throw new Error(`Shape detection failed: ${error.message}`);
    } finally {
      // Always free OpenCV Mats to avoid WASM memory leaks
      if (src) src.delete();
      if (gray) gray.delete();
      if (edges) edges.delete();
      if (contours) contours.delete();
      if (hierarchy) hierarchy.delete();
    }
  }

  static async doCv(base64Image, res) {
    try {
      const { filePath } = await this.saveBase64Image(base64Image);
      const detectedShapes = await this.detectShapes(filePath);
      const uniqueShapes = [...new Set(detectedShapes)];
      const shapes = uniqueShapes.length > 0 ? uniqueShapes : ["No shapes detected"];
      const message = "Detected Shapes : " + shapes.join(", ");
      console.debug(message);

      res.status(200).json({
        success: true,
        shapes: shapes,
        count: shapes.length,
        message: message,
      });
    } catch (error) {
      console.error("CV Processing Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  //============================================================================
  // LEGACY OPENCV FRACTAL GENERATION (now via @techstark/opencv-js)
  //============================================================================

  static async doGenerateJulia(width, height, maxIterations, cReal, cImag, res) {
    let mat;
    try {
      const cv = await getCV();

      // Generate pixel data using pure math
      const data = new Uint8Array(height * width * 4); // RGBA

      for (let y = 0; y < height; ++y) {
        for (let x = 0; x < width; ++x) {
          let zReal = -1.5 + (x / width) * 3.0;
          let zImag = -1.5 + (y / height) * 3.0;
          let iteration = 0;

          while (zReal * zReal + zImag * zImag < 4 && iteration < maxIterations) {
            const nextZReal = zReal * zReal - zImag * zImag + cReal;
            const nextZImag = 2 * zReal * zImag + cImag;
            zReal = nextZReal;
            zImag = nextZImag;
            ++iteration;
          }

          let r = 0, g = 0, b = 0;
          if (iteration !== maxIterations) {
            const t = iteration / maxIterations;
            r = Math.floor(9 * (1 - t) * t * t * t * 255);
            g = Math.floor(15 * (1 - t) * (1 - t) * t * t * 255);
            b = Math.floor(8.5 * (1 - t) * (1 - t) * (1 - t) * t * 255);
          }

          const index = (y * width + x) * 4;
          data[index] = r;
          data[index + 1] = g;
          data[index + 2] = b;
          data[index + 3] = 255; // alpha
        }
      }

      // Encode to PNG via canvas
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");
      const imageData = ctx.createImageData(width, height);
      imageData.data.set(data);
      ctx.putImageData(imageData, 0, 0);

      const base64Image = canvas.toDataURL("image/png");
      res.status(200).json({
        success: true,
        message: "Fractal generated successfully",
        image: base64Image,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async generateJuliaImage(width, height, maxIterations, cReal, cImag, res) {
    try {
      const data = new Uint8Array(height * width * 4);

      for (let y = 0; y < height; ++y) {
        for (let x = 0; x < width; ++x) {
          let zReal = -1.5 + (x / width) * 3.0;
          let zImag = -1.5 + (y / height) * 3.0;
          let iteration = 0;

          while (zReal * zReal + zImag * zImag < 4 && iteration < maxIterations) {
            const nextZReal = zReal * zReal - zImag * zImag + cReal;
            const nextZImag = 2 * zReal * zImag + cImag;
            zReal = nextZReal;
            zImag = nextZImag;
            ++iteration;
          }

          let r = 0, g = 0, b = 0;
          if (iteration !== maxIterations) {
            const t = iteration / maxIterations;
            r = Math.floor(9 * (1 - t) * t * t * t * 255);
            g = Math.floor(15 * (1 - t) * (1 - t) * t * t * 255);
            b = Math.floor(8.5 * (1 - t) * (1 - t) * (1 - t) * t * 255);
          }

          const index = (y * width + x) * 4;
          data[index] = r;
          data[index + 1] = g;
          data[index + 2] = b;
          data[index + 3] = 255;
        }
      }

      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");
      const imageData = ctx.createImageData(width, height);
      imageData.data.set(data);
      ctx.putImageData(imageData, 0, 0);

      const buffer = canvas.toBuffer("image/png");
      res.set("Content-Type", "image/png");
      res.send(buffer);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  //============================================================================
  // PURE MATHEMATICAL FRACTAL SEEDING (No OpenCV Dependency)
  //============================================================================

  static generateJuliaPureMath(width, height, maxIterations, cReal, cImag, bounds) {
    const matrix = [];
    const xMin = parseFloat(bounds.xMin);
    const xMax = parseFloat(bounds.xMax);
    const yMin = parseFloat(bounds.yMin);
    const yMax = parseFloat(bounds.yMax);

    const xStep = (xMax - xMin) / width;
    const yStep = (yMax - yMin) / height;

    for (let y = 0; y < height; y++) {
      const row = new Int32Array(width);
      const cy = yMin + y * yStep;

      for (let x = 0; x < width; x++) {
        const cx = xMin + x * xStep;
        let zReal = cx;
        let zImag = cy;
        let iteration = 0;

        while (zReal * zReal + zImag * zImag < 4.0 && iteration < maxIterations) {
          const nextZReal = zReal * zReal - zImag * zImag + cReal;
          const nextZImag = 2 * zReal * zImag + cImag;
          zReal = nextZReal;
          zImag = nextZImag;
          iteration++;
        }

        row[x] = (iteration === 0 && (zReal * zReal + zImag * zImag) >= 4.0) ? 1 : iteration;
      }
      matrix.push(Array.from(row));
    }
    return matrix;
  }

  static generateMandelbrotPureMath(width, height, maxIterations, bounds) {
    const matrix = [];
    const xMin = parseFloat(bounds.xMin);
    const xMax = parseFloat(bounds.xMax);
    const yMin = parseFloat(bounds.yMin);
    const yMax = parseFloat(bounds.yMax);

    const xStep = (xMax - xMin) / width;
    const yStep = (yMax - yMin) / height;

    for (let y = 0; y < height; y++) {
      const row = new Int32Array(width);
      const cy = yMin + y * yStep;

      for (let x = 0; x < width; x++) {
        const cx = xMin + x * xStep;
        let zReal = 0.0;
        let zImag = 0.0;
        let iteration = 0;

        while (zReal * zReal + zImag * zImag < 4.0 && iteration < maxIterations) {
          const nextZReal = zReal * zReal - zImag * zImag + cx;
          const nextZImag = 2 * zReal * zImag + cy;
          zReal = nextZReal;
          zImag = nextZImag;
          iteration++;
        }
        row[x] = (iteration === 0 && (zReal * zReal + zImag * zImag) >= 4.0) ? 1 : iteration;
      }
      matrix.push(Array.from(row));
    }
    return matrix;
  }

  static generateBarnsleyFernPureMath(totalPoints = 50000) {
    const pointsArray = [];
    let x = 0.0;
    let y = 0.0;

    for (let i = 0; i < totalPoints; i++) {
      const r = Math.random();
      let nextX, nextY;

      if (r < 0.01) {
        nextX = 0.0;
        nextY = 0.16 * y;
      } else if (r < 0.86) {
        nextX = 0.85 * x + 0.04 * y;
        nextY = -0.04 * x + 0.85 * y + 1.6;
      } else if (r < 0.93) {
        nextX = 0.2 * x - 0.26 * y;
        nextY = 0.23 * x + 0.22 * y + 1.6;
      } else {
        nextX = -0.15 * x + 0.28 * y;
        nextY = 0.26 * x + 0.24 * y + 0.44;
      }

      x = nextX;
      y = nextY;

      const normalizedX = (x + 2.182) / (2.655 + 2.182);
      const normalizedY = y / 9.998;
      pointsArray.push({ x: normalizedX, y: normalizedY });
    }
    return pointsArray;
  }
}

module.exports = VisionHubService;