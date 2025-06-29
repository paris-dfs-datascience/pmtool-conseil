# Use the official Python image
FROM python:3.11-slim

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code into the container
COPY . .

# Expose port 8080 (Cloud Run standard)
EXPOSE 8080

# Command to run the application
CMD exec uvicorn main:app --host 0.0.0.0 --port $PORT