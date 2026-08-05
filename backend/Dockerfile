# Fretwork ML backend
# Python 3.11-slim + system audio libraries + FastAPI/Uvicorn

FROM python:3.11-slim

# System dependencies required by librosa, soundfile, and ffmpeg
RUN apt-get update && apt-get install -y \
    libsndfile1 \
    ffmpeg \
    libvamp-sdk2t64 \
    vamp-plugin-sdk \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies first — Docker layer cache means rebuilds
# after code-only changes skip this slow step.
COPY requirements.txt .
# numpy must be installed first — vamp (autochord dependency) needs it at build time
RUN pip install --no-cache-dir numpy
# CPU-only torch for the transformer position prior (fretboard.py). Installed from
# PyTorch's CPU wheel index — the default PyPI wheel bundles unneeded CUDA runtime
# libs and roughly doubles image size for a Fargate task with no GPU.
RUN pip install --no-cache-dir torch==2.4.1 --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir -r requirements.txt

# Copy the nnls-chroma vamp plugin to a location autochord can find it
RUN mkdir -p /usr/local/lib/vamp && \
    cp /usr/local/lib/python3.11/site-packages/autochord/res/nnls-chroma.so /usr/local/lib/vamp/

# Copy application code
COPY . .

EXPOSE 8000

# Start FastAPI with Uvicorn
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
