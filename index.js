// index.js (unchanged)
const _express = require("express");
const app = _express();
const cors = require("cors");
const port = 3000;
const VisionHubService = require("./services/VisionHubService");

app.use(_express.json({ limit: "10mb" }));
app.use(cors());

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

app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "OK", 
    service: "VisionHub",
    endpoints: [
      "POST /uploadOCR - OCR only (text extraction)",
      "POST /uploadCV - Computer Vision only (shape detection)"
    ]
  });
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  console.log(`Available endpoints:`);
  console.log(`  POST /uploadOCR - OCR only (extract text from images)`);
  console.log(`  POST /uploadCV - Computer Vision only (detect shapes)`);
  console.log(`  GET  /health - Service health check`);
});
