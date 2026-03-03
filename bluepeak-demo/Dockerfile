# Use official lightweight Python image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy code and dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# --- UPDATED SECTION ---
COPY zipcodes.txt .  
# -----------------------

COPY main.py .

# Command to run the application
CMD ["python", "main.py"]