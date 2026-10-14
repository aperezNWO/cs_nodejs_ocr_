FROM node:20-bookworm

WORKDIR /app

# Install system dependencies for canvas, tesseract, and native OpenCV compilation
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    tesseract-ocr \
    tesseract-ocr-eng \
    libopencv-dev \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Set explicit environment variables for OpenCV native compilation
ENV OPENCV4NODEJS_DISABLE_AUTOBUILD=1
ENV OPENCV_INCLUDE_DIR=/usr/include/opencv4
ENV OPENCV_LIB_DIR=/usr/lib/x86_64-linux-gnu
ENV OPENCV_BIN_DIR=/usr/bin

COPY package.json package-lock.json* ./

# Install packages with scripts enabled so native bindings compile properly
RUN npm ci

COPY . .

RUN groupadd -r appuser && useradd -r -g appuser appuser \
    && chown -R appuser:appuser /app
USER appuser

ENV PORT=3000
EXPOSE 3000

CMD ["node", "index.js"]
