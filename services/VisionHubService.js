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
   * Generates a Julia set fractal image
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @param {number} maxIterations - Maximum iterations for the fractal
   * @param {number} cReal - Real part of the complex constant c
   * @param {number} cImag - Imaginary part of the complex constant c
   * @returns {cv.Mat} - The generated OpenCV Mat image
   */
  static generateJulia(width, height, maxIterations, cReal, cImag) {
    // Create a blank image (height, width, type, color)
    const img = new cv.Mat(height, width, cv.CV_8UC3, new cv.Vec3(0, 0, 0));

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
          // z = z * z + c
          // (zReal + i*zImag)^2 = (zReal^2 - zImag^2) + i*(2*zReal*zImag)
          const nextZReal = zReal * zReal - zImag * zImag + cReal;
          const nextZImag = 2 * zReal * zImag + cImag;

          zReal = nextZReal;
          zImag = nextZImag;
          ++iteration;
        }

        // Color the pixel based on the number of iterations
        img.set(y, x, this.getJuliaColor(iteration, maxIterations));
      }
    }
    return img;
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

      // Generate the fractal image
      const img = this.generateJulia(
        width,
        height,
        maxIterations,
        cReal,
        cImag
      );

      // Encode the image to PNG buffer
      const imageBuffer = img.imencode(".png");

      // Convert to base64
      const base64Image = `data:image/png;base64,${imageBuffer.toString(
        "base64"
      )}`;

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
}

//
module.exports = VisionHubService;
