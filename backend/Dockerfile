# 1. Base image: Use official Python 3.11 slim (Debian-based for C-extension compatibility)
FROM python:3.11-slim

# 2. Set environment variables
# Prevents Python from writing .pyc files & flushes output immediately to logs
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# 3. Set working directory inside container
WORKDIR /app

# 4. Install essential system dependencies (for building C-extensions like FAISS/Audio)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 5. Layer Caching: Copy only requirements first
COPY requirements.txt .

# 6. Install CPU-only PyTorch first (avoids ~2GB CUDA download in CPU containers), then Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir --default-timeout=100 -r requirements.txt

# 7. Copy remaining application source code
COPY . .

# 8. Expose FastAPI default port
EXPOSE 8000

# 9. Launch FastAPI application with Uvicorn
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]