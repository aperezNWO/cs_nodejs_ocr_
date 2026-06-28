// services/VisionHubService.js
const Tesseract = require("tesseract.js");
const fs = require("fs");
const path = require("path");
const cv = require("@u4/opencv4nodejs");

class VisionHubService {
  //============================================================================
  // COMMON UTILITIES
  //============================================================================

  /**
   * Saves a base64 image to disk
   * @param {string} base64Image - Base64 encoded image data
   * @returns {Promise<Object>} - Object containing filePath and fileExtension
   */
  static async saveBase64Image(base64Image) {
    return new Promise((resolve, reject) => {
      // Extract the file extension and data from the base64 string
      const matches = base64Image.match(
        /^data:image\/([A-Za-z-+/]+);base64,(.+)$/
      );

      if (!matches) {
        reject(new Error("Invalid base64 image format"));
        return;
      }

      const fileExtension = matches[1];
      const base64Data = matches[2];

      // Create a buffer from the base64 data
      const imageBuffer = Buffer.from(base64Data, "base64");

      // Create a unique filename based on timestamp
      const filename = `image_${Date.now()}.${fileExtension}`;

      // Specify the file path where the image will be saved
      const filePath = path.join("img/signatures/", "dest", filename);

      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Write the buffer to a file
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

  /**
   * Performs OCR on an image file and returns the recognized text
   * @param {string} imagePath - Path to the image file
   * @returns {Promise<string>} - The recognized text from the image
   */
  static async recognizeText(imagePath) {
    try {
      const {
        data: { text },
      } = await Tesseract.recognize(imagePath, "eng");
      return text;
    } catch (error) {
      throw new Error(`OCR recognition failed: ${error.message}`);
    }
  }

  /**
   * Performs OCR and sends response to client
   * @param {string} base64Image - Base64 encoded image data
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  static async doOcr(base64Image, res) {
    try {
      // Save the image to disk first
      const { filePath } = await this.saveBase64Image(base64Image);

      // Perform OCR on the saved image
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

  /**
   * Detects shapes in an image using OpenCV
   * @param {string} imagePath - Path to the image file
   * @returns {Promise<string[]>} - Array of detected shapes
   */
  static async detectShapes(imagePath) {
    const shapes = [];

    try {
      // Read the image from disk
      const src = await cv.imreadAsync(imagePath);

      // Convert to grayscale
      const gray = await src.cvtColor(cv.COLOR_BGR2GRAY);

      // Apply Canny edge detector
      const edges = await gray.canny(50, 150, 3, false);

      // Find contours
      const contours = await edges.findContours(
        cv.RETR_EXTERNAL,
        cv.CHAIN_APPROX_SIMPLE
      );

      // Iterate over contours and classify shapes
      for (let i = 0; i < contours.length; i++) {
        const contour = contours[i];

        // Calculate epsilon for polygon approximation
        const epsilon = 0.04 * contour.arcLength(true);

        // Approximate contour to polygon
        const approx = contour.approxPolyDP(epsilon, true);

        let shape = "";

        // Classify based on number of vertices
        if (approx.length === 3) {
          shape = "Triangle";
        } else if (approx.length === 4) {
          // Calculate aspect ratio for square vs rectangle
          const rect = contour.boundingRect();
          const aspectRatio = rect.width / rect.height;
          shape =
            aspectRatio >= 0.95 && aspectRatio <= 1.05 ? "Square" : "Rectangle";
        } else if (approx.length > 4) {
          shape = "Circle";
        }

        if (shape) {
          shapes.push(shape);
        }
      }

      // Release resources
      //src.delete();
      //gray.delete();
      //edges.delete();

      return shapes;
    } catch (error) {
      console.error("Shape detection error:", error);
      throw new Error(`Shape detection failed: ${error.message}`);
    }
  }

  /**
   * Performs CV shape detection and sends response to client
   * @param {string} base64Image - Base64 encoded image data
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  static async doCv(base64Image, res) {
    try {
      // Save the image to disk first
      const { filePath } = await this.saveBase64Image(base64Image);

      // BEGIN COMPUTER VISION LOGIC

      // Detect shapes using OpenCV
      const detectedShapes = await this.detectShapes(filePath);

      // Remove duplicates while preserving order
      const uniqueShapes = [...new Set(detectedShapes)];

      // END COMPUTER VISION LOGIC

      // RETURN RESULT
      const shapes =
        uniqueShapes.length > 0 ? uniqueShapes : ["No shapes detected"];
      const message = "Detected Shapes : " + shapes.join(", ");
      console.debug(message);

      res.status(200).json({
        success: true,
        shapes: shapes,
        count: shapes.length,
        message: message,
      });

      // RETURN RESULT
      /*
      const shapes  = ["Triangle", "Circle", "Square", "Rectangle"];
      const message = "Detected Shapes : " + shapes;
      console.debug(message);

      res.status(200).json({ message: message });*/
    } catch (error) {
      console.error("CV Processing Error:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  //============================================================================
  // FRACTAL GENERATION FUNCTIONS
  //============================================================================

  /**
   * Calculates the color for a specific iteration in the Julia set
   * @param {number} iteration - Current iteration count
   * @param {number} maxIterations - Maximum iterations
   * @returns {cv.Vec3} - BGR color vector
   */
  static getJuliaColor(iteration, maxIterations) {
    if (iteration === maxIterations) {
      return new cv.Vec3(0, 0, 0); // Black for points inside the set
    }

    // Map iteration count to RGB
    const t = iteration / maxIterations;
    const r = Math.floor(9 * (1 - t) * t * t * t * 255);
    const g = Math.floor(15 * (1 - t) * (1 - t) * t * t * 255);
    const b = Math.floor(8.5 * (1 - t) * (1 - t) * (1 - t) * t * 255);

    // OpenCV uses BGR format
    return new cv.Vec3(b, g, r);
  }

  /**
   * Generates a Julia set fractal image (Highly Optimized for Node.js)
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @param {number} maxIterations - Maximum iterations for the fractal
   * @param {number} cReal - Real part of the complex constant c
   * @param {number} cImag - Imaginary part of the complex constant c
   * @returns {cv.Mat} - The generated OpenCV Mat image
   */
  static generateJulia(width, height, maxIterations, cReal, cImag) {
    // 1. Allocate a Buffer for the pixel data (3 bytes per pixel for BGR).
    // Buffer is an ArrayBufferView, which prevents the C++ assertion crash.
    const data = Buffer.alloc(height * width * 3);

    for (let y = 0; y < height; ++y) {
      for (let x = 0; x < width; ++x) {
        // Map pixel position to a point in the complex plane
        const zx = -1.5 + (x / width) * 3.0;
        const zy = -1.5 + (y / height) * 3.0;

        let zReal = zx;
        let zImag = zy;

        let iteration = 0;
        // abs(z) < 2 is mathematically equivalent to zReal^2 + zImag^2 < 4
        while (zReal * zReal + zImag * zImag < 4 && iteration < maxIterations) {
          const nextZReal = zReal * zReal - zImag * zImag + cReal;
          const nextZImag = 2 * zReal * zImag + cImag;

          zReal = nextZReal;
          zImag = nextZImag;
          ++iteration;
        }

        // Calculate color directly to avoid function call overhead in the loop
        let r, g, b;
        if (iteration === maxIterations) {
          r = 0;
          g = 0;
          b = 0;
        } else {
          const t = iteration / maxIterations;
          r = Math.floor(9 * (1 - t) * t * t * t * 255);
          g = Math.floor(15 * (1 - t) * (1 - t) * t * t * 255);
          b = Math.floor(8.5 * (1 - t) * (1 - t) * (1 - t) * t * 255);
        }

        // OpenCV uses BGR format.
        // Calculate the 1D index for the current pixel (y * width + x) * 3 channels
        const index = (y * width + x) * 3;
        data[index] = b;
        data[index + 1] = g;
        data[index + 2] = r;
      }
    }

    // 2. Create the Mat directly from the Buffer.
    // This satisfies the C++ binding's requirement and skips the slow img.set() method.
    return new cv.Mat(height, width, cv.CV_8UC3, data);
  }

  /**
   * Generates a Julia fractal and sends it as a base64 image to the client
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @param {number} maxIterations - Maximum iterations
   * @param {number} cReal - Real part of complex constant c
   * @param {number} cImag - Imaginary part of complex constant c
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  static async doGenerateJulia(
    width,
    height,
    maxIterations,
    cReal,
    cImag,
    res
  ) {
    try {
      console.log(
        `Generating Julia fractal: ${width}x${height}, maxIter: ${maxIterations}, c: ${cReal} + ${cImag}i`
      );

      // 1. Generate the fractal image (returns a cv.Mat)
      const img = this.generateJulia(
        width,
        height,
        maxIterations,
        cReal,
        cImag
      );

      // 2. Encode the image to a PNG buffer using the ASYNC OpenCV method.
      // This runs the C++ encoding in the background without blocking Node.js.
      const imageBuffer = await cv.imencodeAsync(".png", img);

      // 3. Convert the raw buffer to a base64 string
      const base64Image = `data:image/png;base64,${imageBuffer.toString(
        "base64"
      )}`;

      // 4. Send the response
      res.status(200).json({
        success: true,
        message: "Fractal generated successfully",
        image: base64Image,
      });
    } catch (error) {
      console.error("Fractal Generation Error:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
  /**
   * Generates a Julia fractal and sends the raw PNG image directly to the client
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @param {number} maxIterations - Maximum iterations
   * @param {number} cReal - Real part of complex constant c
   * @param {number} cImag - Imaginary part of complex constant c
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  static async generateJuliaImage(
    width,
    height,
    maxIterations,
    cReal,
    cImag,
    res
  ) {
    try {
      console.log(
        `Generating Julia image directly: ${width}x${height}, maxIter: ${maxIterations}, c: ${cReal} + ${cImag}i`
      );

      // 1. Generate the fractal image
      const img = this.generateJulia(
        width,
        height,
        maxIterations,
        cReal,
        cImag
      );

      // 2. Encode to PNG buffer asynchronously
      const imageBuffer = await cv.imencodeAsync(".png", img);

      // 3. Set the HTTP header to tell the browser this is an image
      res.set("Content-Type", "image/png");

      // 4. Send the raw binary buffer
      res.send(imageBuffer);
    } catch (error) {
      console.error("Fractal Image Generation Error:", error);
      res.status(500).json({ error: error.message });
    }
  }
  //============================================================================
  // MANDELBROT PURE MATHEMATICS ENGINE (With Viewport Boundaries Tracking)
  //============================================================================

  /**
   * Generates a raw iteration matrix for the Mandelbrot Set based on adaptive viewports
   * @param {number} width - Horizontal resolution grid size
   * @param {number} height - Vertical resolution grid size
   * @param {number} maxIterations - Computational depth limit
   * @param {Object} bounds - Bounding complex coordinate viewport box (Zoom handling parameters)
   * @returns {number[][]} - 2D Matrix grid containing point resolution integers
   */
  static async generateMandelbrotPureMath(
    width,
    height,
    maxIterations,
    bounds
  ) {
    const matrix = [];

    const xMin = parseFloat(bounds.xMin);
    const xMax = parseFloat(bounds.xMax);
    const yMin = parseFloat(bounds.yMin);
    const yMax = parseFloat(bounds.yMax);

    const xStep = (xMax - xMin) / width;
    const yStep = (yMax - yMin) / height;

    for (let y = 0; y < height; y++) {
      const row = new Int32Array(width);
      const cy = yMin + y * yStep; // Imaginary coordinate constant for this row

      for (let x = 0; x < width; x++) {
        const cx = xMin + x * xStep; // Real coordinate constant for this pixel column

        let zReal = 0.0;
        let zImag = 0.0;
        let iteration = 0;

        // Mandelbrot Formula: Z_{n+1} = Z_n^2 + C
        while (
          zReal * zReal + zImag * zImag < 4.0 &&
          iteration < maxIterations
        ) {
          const nextZReal = zReal * zReal - zImag * zImag + cx;
          const nextZImag = 2 * zReal * zImag + cy;

          zReal = nextZReal;
          zImag = nextZImag;
          iteration++;
        }
        row[x] = iteration;
      }
      matrix.push(Array.from(row));
    }
    return matrix;
  }
  //============================================================================
  // JULIA FRACTAL PURE MATHEMATICAL FRACTAL SEEDING (No OpenCV Dependency)
  //============================================================================

  /**
   * Generates a raw iteration matrix for the Julia Set to be mapped by an external canvas
   * @param {number} width - Horizontal resolution grid size
   * @param {number} height - Vertical resolution grid size
   * @param {number} maxIterations - Computational depth limit
   * @param {number} cReal - Real constant mapping coordinate
   * @param {number} cImag - Imaginary constant mapping coordinate
   * @param {Object} bounds - Bounding complex coordinate viewport box
   * @returns {number[][]} - 2D Matrix grid containing point resolution integers
   */
  static generateJuliaPureMath(
    width,
    height,
    maxIterations,
    cReal,
    cImag,
    bounds
  ) {
    const matrix = [];

    const xMin = parseFloat(bounds.xMin);
    const xMax = parseFloat(bounds.xMax);
    const yMin = parseFloat(bounds.yMin);
    const yMax = parseFloat(bounds.yMax);

    const xStep = (xMax - xMin) / width;
    const yStep = (yMax - yMin) / height;

    for (let y = 0; y < height; y++) {
      const row = new Int32Array(width); // Using typed arrays internally for processing speed
      const cy = yMin + y * yStep;

      for (let x = 0; x < width; x++) {
        const cx = xMin + x * xStep;

        let zReal = cx;
        let zImag = cy;
        let iteration = 0;

        while (
          zReal * zReal + zImag * zImag < 4.0 &&
          iteration < maxIterations
        ) {
          const nextZReal = zReal * zReal - zImag * zImag + cReal;
          const nextZImag = 2 * zReal * zImag + cImag;

          zReal = nextZReal;
          zImag = nextZImag;
          iteration++;
        }
        row[x] = iteration;
      }
      // Convert typed array back to standard array format for easy native JSON parsing serialization
      matrix.push(Array.from(row));
    }

    return matrix;
  }

  //============================================================================
  // BARNSLEY FERN PURE MATHEMATICS ENGINE (Iterated Function System Attractor)
  //============================================================================

  /**
   * Generates an array of calculated coordinates representing the Barnsley Fern point-cloud
   * @param {number} totalPoints - Total number of random mutations to execute (e.g., 50000)
   * @returns {Object[]} - Array of point objects containing raw coordinate ratios [{x, y}]
   */
  static generateBarnsleyFernPureMath(totalPoints = 50000) {
    const pointsArray = [];

    // Initial starting point at the origin vector matrix
    let x = 0.0;
    let y = 0.0;

    for (let i = 0; i < totalPoints; i++) {
      const r = Math.random();
      let nextX, nextY;

      // Chaos Game Matrix Rules Matrix Transformations:
      if (r < 0.01) {
        // 1. Stem generation
        nextX = 0.0;
        nextY = 0.16 * y;
      } else if (r < 0.86) {
        // 2. Successive smaller leaflets scaling mutation
        nextX = 0.85 * x + 0.04 * y;
        nextY = -0.04 * x + 0.85 * y + 1.6;
      } else if (r < 0.93) {
        // 3. Left-side major leaflet branch
        nextX = 0.2 * x - 0.26 * y;
        nextY = 0.23 * x + 0.22 * y + 1.6;
      } else {
        // 4. Right-side major leaflet branch
        nextX = -0.15 * x + 0.28 * y;
        nextY = 0.26 * x + 0.24 * y + 0.44;
      }

      x = nextX;
      y = nextY;

      // Map mathematical space onto a safe, clean uniform distribution ratio (0.0 to 1.0)
      // The classic fern normally maps inside bounds: X: [-2.182, 2.655] and Y: [0.0, 9.998]
      const normalizedX = (x + 2.182) / (2.655 + 2.182);
      const normalizedY = y / 9.998;

      pointsArray.push({ x: normalizedX, y: normalizedY });
    }

    return pointsArray;
  }
}
//
module.exports = VisionHubService;
