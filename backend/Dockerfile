# Backend Dockerfile
FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Copy requirements and application files
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

# Expose the Flask port
EXPOSE 5500

# Run the Flask app
CMD ["python", "app.py"]
