class FractalEngine {

  // Mirrors Angular's FractalEngine._runEscapeTimeEngine exactly:
  // independent xStep/yStep derived from bounds, row-major (y-outer, x-inner) order.
  generateJulia(bounds, maxIterations = 500) {
    const width  = 800;
    const height = 600;
    const points = new Array(width * height);

    const xStep = (bounds.xMax - bounds.xMin) / width;
    const yStep = (bounds.yMax - bounds.yMin) / height;

    const cRe = -0.4;
    const cIm = 0.6;

    const t0 = Date.now();
    let idx = 0;

    for (let y = 0; y < height; y++) {
      const zImStart = bounds.yMin + y * yStep;

      for (let x = 0; x < width; x++) {
        let zRe = bounds.xMin + x * xStep;
        let zIm = zImStart;

        let iter = 0;
        while (zRe * zRe + zIm * zIm <= 4.0 && iter < maxIterations) {
          const nextRe = zRe * zRe - zIm * zIm + cRe;
          const nextIm = 2.0 * zRe * zIm + cIm;
          zRe = nextRe;
          zIm = nextIm;
          iter++;
        }

        const intensity =
          iter === maxIterations ? 0 : Math.floor((iter * 255) / maxIterations);

        points[idx++] = { x, y, intensity };
      }
    }

    console.log(`[Node Engine] ${width * height} points in ${Date.now() - t0}ms`);
    return points;
  }

  // Mandelbrot: same escape-time skeleton as generateJulia, but z starts at
  // (0,0) and the pixel coordinate becomes the constant c (instead of a
  // fixed cRe/cIm with z0 = pixel coordinate, as Julia does).
  generateMandelbrot(bounds, maxIterations = 500) {
    const width  = 800;
    const height = 600;
    const points = new Array(width * height);

    const xStep = (bounds.xMax - bounds.xMin) / width;
    const yStep = (bounds.yMax - bounds.yMin) / height;

    const t0 = Date.now();
    let idx = 0;

    for (let y = 0; y < height; y++) {
      const cIm = bounds.yMin + y * yStep;

      for (let x = 0; x < width; x++) {
        const cRe = bounds.xMin + x * xStep;

        let zRe = 0.0;
        let zIm = 0.0;
        let iter = 0;

        while (zRe * zRe + zIm * zIm <= 4.0 && iter < maxIterations) {
          const nextRe = zRe * zRe - zIm * zIm + cRe;
          const nextIm = 2.0 * zRe * zIm + cIm;
          zRe = nextRe;
          zIm = nextIm;
          iter++;
        }

        const intensity =
          iter === maxIterations ? 0 : Math.floor((iter * 255) / maxIterations);

        points[idx++] = { x, y, intensity };
      }
    }

    console.log(`[Node Engine] Mandelbrot ${width * height} points in ${Date.now() - t0}ms`);
    return points;
  }

  generateLeaf() {
    const points = [];
    const width = 800;
    const height = 600;

    const pixelGrid = Array.from({ length: width }, () =>
      new Array(height).fill(0)
    );

    let x = 0.0;
    let y = 0.0;
    const totalPoints = 150000;

    for (let i = 0; i < totalPoints; i++) {
      let nextX, nextY;
      const r = Math.random() * 100;

      if (r < 1) {
        nextX = 0.0;
        nextY = 0.16 * y;
      } else if (r < 86) {
        nextX = 0.85 * x + 0.04 * y;
        nextY = -0.04 * x + 0.85 * y + 1.6;
      } else if (r < 93) {
        nextX = 0.2 * x - 0.26 * y;
        nextY = 0.23 * x + 0.22 * y + 1.6;
      } else {
        nextX = -0.15 * x + 0.28 * y;
        nextY = 0.26 * x + 0.24 * y + 0.44;
      }

      x = nextX;
      y = nextY;

      const screenX = Math.round(((x + 2.182) * (width - 1)) / (2.655 + 2.182));
      const screenY = Math.round(((9.96 - y) * (height - 1)) / 9.96);

      if (screenX >= 0 && screenX < width && screenY >= 0 && screenY < height) {
        pixelGrid[screenX][screenY] = 200;
      }
    }

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