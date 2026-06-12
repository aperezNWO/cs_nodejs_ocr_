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

app.post("/uploadOCR", async (req, res) => {
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

app.post("/uploadCV", async (req, res) => {
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

app.get("/generateJulia", async (req, res) => {
  try {
    // Read parameters from the URL query string (req.query) instead of req.body
    // We use parseInt/parseFloat because query parameters are always strings
    const width = parseInt(req.query.width) || 800;
    const height = parseInt(req.query.height) || 600;
    const maxIterations = parseInt(req.query.maxIterations) || 100;

    // Default 'c' values create a classic, beautiful Julia set
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

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    service: "VisionHub",
    endpoints: [
      "POST /uploadOCR     - Tesseract -- (ocr / text extraction)",
      "POST /uploadCV      - OpenCv    -- (shape   detection)",
      "GET  /generateJulia - OpenCv    -- (fractal generation)",
    ],
  });
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  console.log(`Available endpoints:`);
  console.log(`  POST /uploadOCR     - Tesseract -- (ocr / text extraction)`);
  console.log(`  POST /uploadCV      - OpenCv    -- (shape   detection)`);
  console.log(`  GET  /generateJulia - OpenCv    -- (fractal generation)`),
    console.log(`  GET  /health        - Service health check`);
});
