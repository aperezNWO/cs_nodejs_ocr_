// FractalEngine.js

class FractalEngine {
  // Julia Set Generator (Exact port of your J2SE logic)
  generateJulia(zoomInOut, zoomStep) {
    const points = [];
    const width = 800;
    const height = 600;
    const maxIterations = 500;

    let minX = -1.5;
    let maxX = 1.5;
    let minY = -1.5;
    let maxY = 1.5;

    const zoomFactor = zoomInOut ? 1.0 / zoomStep : zoomStep;
    const centerX = 0.0;
    const centerY = 0.0;

    minX = centerX + (minX - centerX) * zoomFactor;
    maxX = centerX + (maxX - centerX) * zoomFactor;
    minY = centerY + (minY - centerY) * zoomFactor;
    maxY = centerY + (maxY - centerY) * zoomFactor;

    const cRe = -0.4;
    const cIm = 0.6;

    for (let screenX = 0; screenX < width; screenX++) {
      for (let screenY = 0; screenY < height; screenY++) {
        let zRe = minX + (screenX * (maxX - minX)) / width;
        let zIm = minY + (screenY * (maxY - minY)) / height;

        let iter = 0;
        while (zRe * zRe + zIm * zIm <= 4.0 && iter < maxIterations) {
          let nextRe = zRe * zRe - zIm * zIm + cRe;
          let nextIm = 2.0 * zRe * zIm + cIm;
          zRe = nextRe;
          zIm = nextIm;
          iter++;
        }

        const intensity =
          iter === maxIterations ? 0 : Math.floor((iter * 255) / maxIterations);
        points.push({ x: screenX, y: screenY, intensity: intensity });
      }
    }
    return points;
  }

  generateLeaf() {
    const points = [];
    const width = 800;
    const height = 600;

    // Use a standard 2D array to avoid typed array index issues
    const pixelGrid = Array.from({ length: width }, () => new Array(height).fill(0));

    let x = 0.0;
    let y = 0.0;
    const totalPoints = 150000;

    for (let i = 0; i < totalPoints; i++) {
        let nextX, nextY;
        const r = Math.random() * 100; // Use simple random

        if (r < 1) {
            nextX = 0.0;
            nextY = 0.16 * y;
        } else if (r < 86) {
            nextX = 0.85 * x + 0.04 * y;
            nextY = -0.04 * x + 0.85 * y + 1.6;
        } else if (r < 93) {
            nextX = 0.20 * x - 0.26 * y;
            nextY = 0.23 * x + 0.22 * y + 1.6;
        } else {
            nextX = -0.15 * x + 0.28 * y;
            nextY = 0.26 * x + 0.24 * y + 0.44;
        }

        x = nextX;
        y = nextY;

        // Ensure these calculations match Java exactly
        const screenX = Math.round((x + 2.182) * (width - 1) / (2.655 + 2.182));
        const screenY = Math.round((9.96 - y) * (height - 1) / 9.96);

        if (screenX >= 0 && screenX < width && screenY >= 0 && screenY < height) {
            pixelGrid[screenX][screenY] = 200;
        }
    }

    // Flattening: check if we actually found any points
    let foundCount = 0;
    for (let px = 0; px < width; px++) {
        for (let py = 0; py < height; py++) {
            if (pixelGrid[px][py] > 0) {
                points.push({ x: px, y: py, intensity: pixelGrid[px][py] });
                foundCount++;
            }
        }
    }
    
    console.log(`Leaf generation complete. Points found: ${foundCount}`);
    return points;
  }
}
module.exports = new FractalEngine();
