// index.js (unchanged)
const _express = require("express");
const app = _express();
const cors = require("cors");
const port = 3000;
const VisionHubService = require("./services/VisionHubService");
const engine = require("./services/FractalEngine"); // Import the engine we just create
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

app.get('/api/fractal/julia', (req, res) => {

  // Frontend sends 'zoominout' (lowercase) — match it exactly
  const zoomInOut = req.query.zoominout === 'true';

  // Default zoomStep to 1 if missing or zero
  const zoomStep = parseFloat(req.query.zoomStep) || 1.0;

  console.log(`Generating Julia: zoomIn=${zoomInOut}, step=${zoomStep}`);

  const points = engine.generateJulia(zoomInOut, zoomStep);
  res.json(points);
});

app.get('/api/fractal/leaf', (req, res) => {
  const points = engine.generateLeaf();
  res.json(points);
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
      "GET  /api/fractal/julia                        - Javascript -- (fractal generation)",
      "GET  /api/fractal/leaf                         - Javascript -- (fractal generation)",
      "GET  /health                                   - Service health check)",
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
      `  GET  /api/fractal/julia             - Javascript   -- (fractal generation)`
    ),
    console.log(
      `  GET  /api/fractal/leaf              - Javascript   -- (fractal generation)`
    ),
    console.log(`  GET  /health              - Service health check`);
});
