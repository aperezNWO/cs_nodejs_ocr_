FROM node:20-bullseye

WORKDIR /app

# canvas (node-canvas) needs these system libs to compile its native binding.
# @techstark/opencv-js is pure WASM — no system OpenCV needed at all.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    tesseract-ocr \
    tesseract-ocr-eng \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Skip opencv4nodejs native build entirely — we no longer need it
ENV OPENCV4NODEJS_DISABLE_AUTOBUILD=1

COPY package.json package-lock.json* ./

# Install with scripts enabled so node-canvas can compile its binding
RUN npm ci

COPY . .

RUN groupadd -r appuser && useradd -r -g appuser appuser \
    && chown -R appuser:appuser /app
USER appuser

ENV PORT=3000
EXPOSE 3000

CMD ["node", "index.js"]
