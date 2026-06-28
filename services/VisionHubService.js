const Tesseract = require("tesseract.js");
const fs = require("fs");
const path = require("path");
const cv = require("@u4/opencv4nodejs");

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
  // COMPUTER VISION (CV) FUNCTIONS - Using opencv.js
  //============================================================================

  static async detectShapes(imagePath) {
    const shapes = [];
    try {
      const src = await cv.imreadAsync(imagePath);
      const gray = await src.cvtColor(cv.COLOR_BGR2GRAY);
      const edges = await gray.canny(50, 150, 3, false);
      const contours = await edges.findContours(cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

      for (let i = 0; i < contours.length; i++) {
        const contour = contours[i];
        const epsilon = 0.04 * contour.arcLength(true);
        const approx = contour.approxPolyDP(epsilon, true);

        let shape = "";
        if (approx.length === 3) {
          shape = "Triangle";
        } else if (approx.length === 4) {
          const rect = contour.boundingRect();
          const aspectRatio = rect.width / rect.height;
          shape = aspectRatio >= 0.95 && aspectRatio <= 1.05 ? "Square" : "Rectangle";
        } else if (approx.length > 4) {
          shape = "Circle";
        }

        if (shape) {
          shapes.push(shape);
        }
      }
      return shapes;
    } catch (error) {
      console.error("Shape detection error:", error);
      throw new Error(`Shape detection failed: ${error.message}`);
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
  // LEGACY OPENCV FRACTAL GENERATION (Keep for old configurations)
  //============================================================================

  static getJuliaColor(iteration, maxIterations) {
    if (iteration === maxIterations) return new cv.Vec3(0, 0, 0);
    const t = iteration / maxIterations;
    const r = Math.floor(9 * (1 - t) * t * t * t * 255);
    const g = Math.floor(15 * (1 - t) * (1 - t) * t * t * 255);
    const b = Math.floor(8.5 * (1 - t) * (1 - t) * (1 - t) * t * 255);
    return new cv.Vec3(b, g, r);
  }

  static generateJulia(width, height, maxIterations, cReal, cImag) {
    const data = Buffer.alloc(height * width * 3);
    for (let y = 0; y < height; ++y) {
      for (let x = 0; x < width; ++x) {
        const zx = -1.5 + (x / width) * 3.0;
        const zy = -1.5 + (y / height) * 3.0;
        let zReal = zx;
        let zImag = zy;
        let iteration = 0;

        while (zReal * zReal + zImag * zImag < 4 && iteration < maxIterations) {
          const nextZReal = zReal * zReal - zImag * zImag + cReal;
          const nextZImag = 2 * zReal * zImag + cImag;
          zReal = nextZReal;
          zImag = nextZImag;
          ++iteration;
        }

        let r, g, b;
        if (iteration === maxIterations) {
          r = g = b = 0;
        } else {
          const t = iteration / maxIterations;
          r = Math.floor(9 * (1 - t) * t * t * t * 255);
          g = Math.floor(15 * (1 - t) * (1 - t) * t * t * 255);
          b = Math.floor(8.5 * (1 - t) * (1 - t) * (1 - t) * t * 255);
        }

        const index = (y * width + x) * 3;
        data[index] = b;
        data[index + 1] = g;
        data[index + 2] = r;
      }
    }
    return new cv.Mat(height, width, cv.CV_8UC3, data);
  }

  static async doGenerateJulia(width, height, maxIterations, cReal, cImag, res) {
    try {
      const img = this.generateJulia(width, height, maxIterations, cReal, cImag);
      const imageBuffer = await cv.imencodeAsync(".png", img);
      const base64Image = `data:image/png;base64,${imageBuffer.toString("base64")}`;
      res.status(200).json({ success: true, message: "Fractal generated successfully", image: base64Image });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async generateJuliaImage(width, height, maxIterations, cReal, cImag, res) {
    try {
      const img = this.generateJulia(width, height, maxIterations, cReal, cImag);
      const imageBuffer = await cv.imencodeAsync(".png", img);
      res.set("Content-Type", "image/png");
      res.send(imageBuffer);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  //============================================================================
  // PURE MATHEMATICAL FRACTAL SEEDING (No OpenCV Dependency)
  //============================================================================

  /**
   * Generates a raw iteration matrix for the Julia Set
   */
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
        
        // If it escapes instantly at the very boundary edges, flag it explicitly as 1
        // instead of 0 to stop the client from confusing it with the inner core.
        row[x] = (iteration === 0 && (zReal * zReal + zImag * zImag) >= 4.0) ? 1 : iteration;
      }
      matrix.push(Array.from(row));
    }
    return matrix;
  }

  /**
   * Generates a raw iteration matrix for the Mandelbrot Set
   */
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

  /**
   * Generates an array of calculated coordinates representing the Barnsley Fern point-cloud
   */
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