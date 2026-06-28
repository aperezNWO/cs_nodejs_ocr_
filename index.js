// index.js (unchanged)
const _express = require("express");
const app = _express();
const cors = require("cors");
const port = 3000;
const VisionHubService = require("./services/VisionHubService");

//
app.use(_express.json({ limit: "10mb" }));
app.use(cors());

//////////////////////////////////////////////////
// TESSERACT  - OCR
//////////////////////////////////////////////////

app.post("/api/OCR/uploadOCR", async (req, res) => {
  try {
    const { base64Image } = req.body;
    if (!base64Image) {
      return res.status(400).json({ error: "No image provided" });
    }
    await VisionHubService.doOcr(base64Image, res);
  } catch (error) {
    console.error("Upload OCR error:", error);
    res.status(500).json({ error: "Failed to process OCR upload" });
  }
});

//////////////////////////////////////////////////
// OPENCV - SHAPES
//////////////////////////////////////////////////

app.post("/api/OpenCv/uploadCV", async (req, res) => {
  try {
    const { base64Image } = req.body;
    if (!base64Image) {
      return res.status(400).json({ error: "No image provided" });
    }
    await VisionHubService.doCv(base64Image, res);
  } catch (error) {
    console.error("Upload CV error:", error);
    res.status(500).json({ error: "Failed to process CV upload" });
  }
});

//////////////////////////////////////////////////
// OPENCV - FRACTAL DEMO
//////////////////////////////////////////////////

//
app.get("/api/OpenCv/generateJulia", async (req, res) => {
  try {
    // --- PROTECT THE FREE VM ---
    // Cap the maximum dimensions to prevent users from crashing the Codesandbox
    const MAX_WIDTH = 800;
    const MAX_HEIGHT = 600;
    const MAX_ITERATIONS = 150;

    // Lowered defaults for instant generation on free tiers
    let width = parseInt(req.query.width) || 400;
    let height = parseInt(req.query.height) || 300;
    let maxIterations = parseInt(req.query.maxIterations) || 50;

    // Enforce limits so the server never processes more than it can handle
    width = Math.min(width, MAX_WIDTH);
    height = Math.min(height, MAX_HEIGHT);
    maxIterations = Math.min(maxIterations, MAX_ITERATIONS);

    const cReal = req.query.cReal ? parseFloat(req.query.cReal) : -0.7;
    const cImag = req.query.cImag ? parseFloat(req.query.cImag) : 0.27015;

    await VisionHubService.doGenerateJulia(
      width,
      height,
      maxIterations,
      cReal,
      cImag,
      res
    );
  } catch (error) {
    console.error("Generate Julia error:", error);
    res.status(500).json({ error: "Failed to generate fractal" });
  }
});

//
app.get("/api/OpenCv/generateJuliaImage", async (req, res) => {
  try {
    // --- PROTECT THE FREE VM ---
    const MAX_WIDTH = 800;
    const MAX_HEIGHT = 600;
    const MAX_ITERATIONS = 500;

    let width = parseInt(req.query.width) || MAX_WIDTH;
    let height = parseInt(req.query.height) || MAX_HEIGHT;
    let maxIterations = parseInt(req.query.maxIterations) || MAX_ITERATIONS;
    width = Math.min(width, MAX_WIDTH);
    height = Math.min(height, MAX_HEIGHT);
    maxIterations = Math.min(maxIterations, MAX_ITERATIONS);

    const cReal = req.query.cReal ? parseFloat(req.query.cReal) : -0.4;
    const cImag = req.query.cImag ? parseFloat(req.query.cImag) : 0.6;

    // Call the new method that sends raw image data
    await VisionHubService.generateJuliaImage(
      width,
      height,
      maxIterations,
      cReal,
      cImag,
      res
    );
  } catch (error) {
    console.error("Generate Julia Image error:", error);
    res.status(500).json({ error: "Failed to generate fractal image" });
  }
});

//////////////////////////////////////////////////
// PURE MATH EXTRACTOR - MANDELBROT
//////////////////////////////////////////////////
app.get("/api/fractal/generateMandelbrotPureMath", async (req, res) => {
  try {
    const MAX_WIDTH = 800;
    const MAX_HEIGHT = 600;
    const MAX_ITERATIONS = 300;

    let width         = parseInt(req.query.width) || 350;
    let height        = parseInt(req.query.height) || 350;
    let maxIterations = parseInt(req.query.maxIterations) || 100;

    width = Math.min(width, MAX_WIDTH);
    height = Math.min(height, MAX_HEIGHT);
    maxIterations = Math.min(maxIterations, MAX_ITERATIONS);

    // Zoom framing coordinates provided by your frontend "Robocop" tracking reticle
    const bounds = {
      xMin: req.query.xMin ? parseFloat(req.query.xMin) : -2.0,
      xMax: req.query.xMax ? parseFloat(req.query.xMax) : 1.0,
      yMin: req.query.yMin ? parseFloat(req.query.yMin) : -1.2,
      yMax: req.query.yMax ? parseFloat(req.query.yMax) : 1.2,
    };

    const iterationMatrix = VisionHubService.generateMandelbrotPureMath(
      width,
      height,
      maxIterations,
      bounds
    );

    res.status(200).json({
      success: true,
      width: width,
      height: height,
      maxIterations: maxIterations,
      bounds: bounds,
      matrix: iterationMatrix,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

//////////////////////////////////////////////////
// PURE MATH EXTRACTOR - NO IMAGE OVERHEAD
//////////////////////////////////////////////////

app.get("/api/Fractal/generateJuliaPureMath", async (req, res) => {
  try {
    // Keep baseline sanity guardrails active to avoid malicious over-allocation
    const MAX_WIDTH = 800;
    const MAX_HEIGHT = 600;
    const MAX_ITERATIONS = 300;

    let width = parseInt(req.query.width) || 350;
    let height = parseInt(req.query.height) || 350;
    let maxIterations = parseInt(req.query.maxIterations) || 100;

    width = Math.min(width, MAX_WIDTH);
    height = Math.min(height, MAX_HEIGHT);
    maxIterations = Math.min(maxIterations, MAX_ITERATIONS);

    const cReal = req.query.cReal ? parseFloat(req.query.cReal) : -0.4;
    const cImag = req.query.cImag ? parseFloat(req.query.cImag) : 0.6;

    // Viewport matrix framing boundaries passed by front-end coordinates tracker (Zoom in/out handler)
    const bounds = {
      xMin: req.query.xMin ? parseFloat(req.query.xMin) : -1.5,
      xMax: req.query.xMax ? parseFloat(req.query.xMax) : 1.5,
      yMin: req.query.yMin ? parseFloat(req.query.yMin) : -1.5,
      yMax: req.query.yMax ? parseFloat(req.query.yMax) : 1.5,
    };

    // Calculate structural numbers completely detached from OpenCV frameworks
    const iterationMatrix = VisionHubService.generateJuliaPureMath(
      width,
      height,
      maxIterations,
      cReal,
      cImag,
      bounds
    );

    res.status(200).json({
      success: true,
      width: width,
      height: height,
      maxIterations: maxIterations,
      bounds: bounds,
      matrix: iterationMatrix,
    });
  } catch (error) {
    console.error("Pure Math Fractal Calculation Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});



//////////////////////////////////////////////////
// PURE MATH EXTRACTOR - BARNSLEY FERN (STATIC)
//////////////////////////////////////////////////
app.get("/api/fractal/generateBarnsleyFernPureMath", async (req, res) => {
  try {
    // Prevent client requests from over-allocating points and hanging the event loop thread
    const MAX_POINTS = 100000;
    let points       = parseInt(req.query.points) || 50000;
    points           = Math.min(points, MAX_POINTS);

    const pointCloud = VisionHubService.generateBarnsleyFernPureMath(points);

    res.status(200).json({
      success: true,
      count: pointCloud.length,
      isZoomable: false, // Explicitly letting frontend know navigation options don't apply here!
      points: pointCloud,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

//////////////////////////////////////////////////
// DIAGNOSTICS
//////////////////////////////////////////////////

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    service: "VisionHub",
    endpoints: [
      "POST /api/ocr/uploadOCR                        - Tesseract  -- (ocr / text extraction)",
      "POST /api/opencv/uploadCV                      - OpenCv     -- (shape   detection)",
      "GET  /api/opencv/generateJulia                 - OpenCv     -- (fractal generation)",
      "GET  /api/opencv/generateJuliaImage            - OpenCv     -- (fractal generation)",
      "GET  /api/fractal/generateJuliaPureMath        - Javascript -- (fractal generation)",
      "GET  /api/fractal/generateMandelbrotPureMath   - Javascript -- (fractal generation)",
      "GET  /api/fractal/generateBarnsleyFernPureMath - Javascript -- (fractal generation)",
      "GET  /health                        - Service health check)",
    ],
  });
});

//////////////////////////////////////////////////
// DRIVER CODE
//////////////////////////////////////////////////

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  console.log(`Available endpoints:`);
  console.log(
    `  POST /api/ocr/uploadOCR             - Tesseract -- (ocr / text extraction)`
  );
  console.log(
    `  POST /api/opencv/uploadCV           - OpenCv    -- (shape   detection)`
  );
  console.log(
    `  GET  /api/opencv/generateJulia      - OpenCv    -- (fractal generation)`
  ),
    console.log(
      `  GET  /api/opencv/generateJuliaImage - OpenCv    -- (fractal generation)`
    ),
    console.log(
      `  GET  /api/opencv/generateJuliaPureMath         - Javascript   -- (fractal generation)`
    ),
    console.log(
      `  GET  /api/opencv/generateMandelbrotPureMath    - Javascript   -- (fractal generation)`
    ),
    console.log(
      `  GET  /api/opencv/generateBarnsleyFernPureMath  - Javascript   -- (fractal generation)`
    ),
    console.log(
      `  GET  /api/opencv/health              - Service health check`
    );
});
