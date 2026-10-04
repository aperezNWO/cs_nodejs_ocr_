import express            from "express";
import cors               from "cors";
import {VisionHubService} from "./services/VisionHubService.js";
import {FractalEngine}    from './services/FractalEngine.js';
import swaggerUi          from 'swagger-ui-express';
import swaggerJsdoc       from 'swagger-jsdoc';
import { readFileSync }   from 'fs';
const packageJson         = JSON.parse(readFileSync(new URL('./package.json', import.meta.url)));
const port                = process.env.PORT || 3000;   // Render injects $PORT at runtime 
//
const app            = express();
const fractalEngine  = new FractalEngine();
app.use(express.json({ limit: "10mb" }));
app.use(cors());

//////////////////////////////////////////////////
// MIDDLEWARE: HTTP Request Logger for Render
//////////////////////////////////////////////////
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logMessage = `[HTTP] ${req.method} ${req.originalUrl || req.url} - Status: ${res.statusCode} - ${duration}ms - IP: ${req.ip}`;
    console.log(logMessage);
  });
  next();
});

//////////////////////////////////////////////////
// PING ENDPOINT: Returns zero kb data
//////////////////////////////////////////////////
app.get("/ping", (req, res) => {
  res.status(204).send(); // 204 No Content responds with zero bytes of data
});

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
// OPENCV - FRACTAL DEMO (legacy — returns 503 if native cv unavailable)
//////////////////////////////////////////////////

app.get("/api/OpenCv/generateJulia", async (req, res) => {
  try {
    const MAX_WIDTH = 800;
    const MAX_HEIGHT = 600;
    const MAX_ITERATIONS = 150;

    let width = Math.min(parseInt(req.query.width) || 400, MAX_WIDTH);
    let height = Math.min(parseInt(req.query.height) || 300, MAX_HEIGHT);
    let maxIterations = Math.min(parseInt(req.query.maxIterations) || 50, MAX_ITERATIONS);

    const cReal = req.query.cReal ? parseFloat(req.query.cReal) : -0.7;
    const cImag = req.query.cImag ? parseFloat(req.query.cImag) : 0.27015;

    await VisionHubService.doGenerateJulia(width, height, maxIterations, cReal, cImag, res);
  } catch (error) {
    console.error("Generate Julia error:", error);
    res.status(500).json({ error: "Failed to generate fractal" });
  }
});

app.get("/api/OpenCv/generateJuliaImage", async (req, res) => {
  try {
    const MAX_WIDTH = 800;
    const MAX_HEIGHT = 600;
    const MAX_ITERATIONS = 500;

    let width = Math.min(parseInt(req.query.width) || MAX_WIDTH, MAX_WIDTH);
    let height = Math.min(parseInt(req.query.height) || MAX_HEIGHT, MAX_HEIGHT);
    let maxIterations = Math.min(parseInt(req.query.maxIterations) || MAX_ITERATIONS, MAX_ITERATIONS);

    const cReal = req.query.cReal ? parseFloat(req.query.cReal) : -0.4;
    const cImag = req.query.cImag ? parseFloat(req.query.cImag) : 0.6;

    await VisionHubService.generateJuliaImage(width, height, maxIterations, cReal, cImag, res);
  } catch (error) {
    console.error("Generate Julia Image error:", error);
    res.status(500).json({ error: "Failed to generate fractal image" });
  }
});

//////////////////////////////////////////////////
// PURE JS FRACTALS
//////////////////////////////////////////////////

app.get("/api/fractal/julia", (req, res) => {
  const xMin = parseFloat(req.query.xMin);
  const xMax = parseFloat(req.query.xMax);
  const yMin = parseFloat(req.query.yMin);
  const yMax = parseFloat(req.query.yMax);
  const maxIterations = parseInt(req.query.maxIterations, 10) || 500;

  const bounds = [xMin, xMax, yMin, yMax].every(Number.isFinite)
    ? { xMin, xMax, yMin, yMax }
    : { xMin: -1.5, xMax: 1.5, yMin: -1.5, yMax: 1.5 };

  console.log(`Generating Julia: bounds=${JSON.stringify(bounds)}, maxIter=${maxIterations}`);
  const points = fractalEngine.generateJulia(bounds, maxIterations);
  res.json(points);
});

app.get("/api/fractal/mandelbrot", (req, res) => {
  const xMin = parseFloat(req.query.xMin);
  const xMax = parseFloat(req.query.xMax);
  const yMin = parseFloat(req.query.yMin);
  const yMax = parseFloat(req.query.yMax);
  const maxIterations = parseInt(req.query.maxIterations, 10) || 500;

  const bounds = [xMin, xMax, yMin, yMax].every(Number.isFinite)
    ? { xMin, xMax, yMin, yMax }
    : { xMin: -2.0, xMax: 1.0, yMin: -1.2, yMax: 1.2 };

  console.log(`Generating Mandelbrot: bounds=${JSON.stringify(bounds)}, maxIter=${maxIterations}`);
  const points = fractalEngine.generateMandelbrot(bounds, maxIterations);
  res.json(points);
});

app.get("/api/fractal/leaf", (req, res) => {
  const points = fractalEngine.generateLeaf();
  res.json(points);
});

//////////////////////////////////////////////////
// DIAGNOSTICS
//////////////////////////////////////////////////

// New Endpoint: Returns the current Node.js version
app.get('/getNodeVersion', (req, res) => {
    res.send(process.version);
});

/**
 * @openapi
 * /getNodeWebServerVersion:
 *   get:
 *     summary: Get the server type and current version
 *     description: Returns metadata reflecting the active express server and version from package.json
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 server:
 *                   type: string
 *                   example: express
 *                 version:
 *                   type: string
 *                   example: 1.0.0.3
 */
// Server Framework Version Endpoint (Express version)
app.get('/getNodeWebServerVersion', (req, res) => {
  res.json({
    server: "express",
    version: packageJson.version // Looks for "version": "1.0.0.3" in package.json
  });
});
/////////////////////////////////////////////////////////////////////////////////
/**
 * @openapi
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Verifies that the Node.js web server and container dependencies are running correctly.
 *     tags:
 *       - System
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "UP"
 *                 timestamp:
 *                   type: string
 *                   example: "2026-09-26T13:03:20Z"
 */
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    service: "VisionHub",
    nodeVersion: process.version,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    endpoints: [
      "GET  /ping                                   - Returns zero KB (204 No Content) response",
      "POST /api/OCR/uploadOCR                - Tesseract  -- (ocr / text extraction) ",
      "POST /api/OpenCv/uploadCV              - OpenCv     -- (shape detection) ",
      "GET  /api/OpenCv/generateJulia         - OpenCv     -- (fractal generation) ",
      "GET  /api/OpenCv/generateJuliaImage    - OpenCv     -- (fractal generation) ",
      "GET  /api/fractal/julia                - Javascript -- (fractal generation) ",
      "GET  /api/fractal/mandelbrot           - Javascript -- (fractal generation) ",
      "GET  /api/fractal/leaf                 - Javascript -- (fractal generation) ",
      "GET  /getNodeVersion                   - Get backend version",
      "GET  /getNodeWebServerVersion          - Get express version ",
      "GET  /health                           - Service health check & route catalog ",
    ],
  });
});

//---------------------------------------------------
// SWAGGER SETUP
//---------------------------------------------------

// 1. Configure Swagger definition options
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Node.js DB & Utility API',
      version: packageJson.version || '1.0.0',
      description: 'API documentation generated via reflection on JSDoc comments',
    },
    servers: [
      {
        url: 'https://cs-nodejs-ocr-latest-e2kc.onrender.com/',
        description: 'render',
      },
    ],
  },
  // Points to files where Swagger JSDoc annotations are written (this file)
  apis: ['./index.js'], 
};

const swaggerSpecs = swaggerJsdoc(swaggerOptions);

// 2. Mount the Swagger UI explorer route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

//////////////////////////////////////////////////
// DRIVER CODE
//////////////////////////////////////////////////

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});