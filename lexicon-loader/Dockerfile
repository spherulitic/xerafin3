# data-loader/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

RUN useradd --no-create-home --shell /bin/false appuser

# Copy loader script
COPY loader.py .

# Create data directory for mounted CSV
#RUN mkdir -p /data

USER appuser

# Run the loader
CMD ["python", "loader.py"]
