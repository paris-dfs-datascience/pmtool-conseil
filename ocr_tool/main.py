# main.py
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import requests
import os
import subprocess
import base64
import json
import logging
from datetime import datetime
from typing import Optional
from pydantic import BaseModel

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Environment variables
MODEL_ID = os.getenv("MODEL_ID", "mistral-ocr-2505")
PROJECT_ID = os.getenv("PROJECT_ID") or os.getenv("GOOGLE_CLOUD_PROJECT") or os.getenv("GCP_PROJECT")
REGION = os.getenv("REGION") or os.getenv("GOOGLE_CLOUD_REGION") or "us-central1"
PORT = int(os.getenv("PORT", "8080"))  # Cloud Run default port

print(f"Starting with MODEL_ID: {MODEL_ID}")
print(f"Initial PROJECT_ID: {PROJECT_ID}")
print(f"Initial REGION: {REGION}")

# Auto-detect project ID if still not found
if not PROJECT_ID:
    try:
        import requests
        metadata_url = "http://metadata.google.internal/computeMetadata/v1/project/project-id"
        headers = {"Metadata-Flavor": "Google"}
        response = requests.get(metadata_url, headers=headers, timeout=5)
        if response.status_code == 200:
            PROJECT_ID = response.text
            print(f"Auto-detected PROJECT_ID: {PROJECT_ID}")
        else:
            print(f"Metadata service returned status: {response.status_code}")
    except Exception as e:
        print(f"Could not auto-detect PROJECT_ID: {e}")

# Validate required environment variables
if not PROJECT_ID:
    print("PROJECT_ID must be set via environment variable or auto-detection failed")
    # Don't raise exception, let the service start so we can debug
    PROJECT_ID = "lma-website-461920"  # Default to your project ID
    print(f"Using hardcoded PROJECT_ID: {PROJECT_ID}")

print(f"Final config - PROJECT_ID: {PROJECT_ID}, REGION: {REGION}, MODEL_ID: {MODEL_ID}, PORT: {PORT}")

app = FastAPI(
    title="Mistral OCR API",
    description="OCR service using Mistral OCR via Google Cloud Vertex AI",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class OCRResponse(BaseModel):
    text: str
    filename: Optional[str] = None
    processed_at: datetime = datetime.now()

def get_access_token():
    """Get GCP access token using gcloud"""
    try:
        print("Getting GCP access token...")
        process = subprocess.Popen(
            "gcloud auth print-access-token",
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            shell=True
        )
        (access_token_bytes, err) = process.communicate()
        
        if process.returncode != 0:
            error_msg = err.decode("utf-8") if err else "Unknown error"
            print(f"gcloud command failed with return code {process.returncode}: {error_msg}")
            raise Exception(f"Failed to get access token: {error_msg}")
            
        access_token = access_token_bytes.decode("utf-8").strip()
        print(f"Successfully obtained access token (length: {len(access_token)})")
        return access_token
    except Exception as e:
        print(f"Exception getting access token: {str(e)}")
        raise

@app.get("/")
async def root():
    return {"message": "Mistral OCR API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "mistral-ocr"}

@app.get("/debug")
async def debug_info():
    """Debug endpoint to check configuration"""
    try:
        access_token = get_access_token()
        return {
            "status": "ok",
            "project_id": PROJECT_ID,
            "region": REGION,
            "model_id": MODEL_ID,
            "port": PORT,
            "access_token_length": len(access_token),
            "api_url": f"https://{REGION}-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/{REGION}/publishers/mistralai/models/{MODEL_ID}:rawPredict"
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "project_id": PROJECT_ID,
            "region": REGION,
            "model_id": MODEL_ID,
            "port": PORT
        }

@app.post("/api/ocr", response_model=OCRResponse)
async def process_ocr(file: UploadFile = File(...)):
    """Process uploaded file with OCR using Mistral OCR"""
    try:
        # Validate file type
        if not file.content_type:
            raise HTTPException(status_code=400, detail="File type not specified")
            
        allowed_types = [
            "image/jpeg", "image/jpg", "image/png", "image/webp", "image/tiff",
            "application/pdf"
        ]
        
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported file type: {file.content_type}"
            )
        
        # Read file content
        file_content = await file.read()
        
        # Get access token
        access_token = get_access_token()
        
        # Convert file to base64 data URL
        base64_content = base64.b64encode(file_content).decode('utf-8')
        
        # Map content types
        content_type_mapping = {
            "application/pdf": "application/pdf",
            "image/jpeg": "image/jpeg",
            "image/jpg": "image/jpeg", 
            "image/png": "image/png",
            "image/webp": "image/webp",
            "image/tiff": "image/tiff"
        }
        
        mime_type = content_type_mapping.get(file.content_type, file.content_type)
        document_url = f"data:{mime_type};base64,{base64_content}"
        
        # Build API URL
        url = f"https://{REGION}-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/{REGION}/publishers/mistralai/models/{MODEL_ID}:rawPredict"
        
        # Prepare payload
        payload = {
            "model": MODEL_ID,
            "document": {
                "type": "document_url",
                "document_url": document_url,
            },
            "pages": "0"
        }
        
        # Prepare headers
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
            "Content-Type": "application/json"
        }
        
        # Make API call
        print(f"Processing document: {file.filename}")
        response = requests.post(url=url, headers=headers, json=payload, timeout=60)
        
        if response.status_code == 200:
            try:
                response_dict = response.json()
                print("OCR processing completed successfully")
                print(f"Full Mistral OCR response: {json.dumps(response_dict, indent=2)}")
                
                # Extract text from response - adjust based on actual Mistral OCR response format
                extracted_text = ""
                
                # Try common response formats
                if 'text' in response_dict:
                    extracted_text = response_dict['text']
                    print(f"Found text in 'text' field: {extracted_text[:100]}...")
                elif 'content' in response_dict:
                    extracted_text = response_dict['content']
                    print(f"Found text in 'content' field: {extracted_text[:100]}...")
                elif 'results' in response_dict and isinstance(response_dict['results'], list):
                    texts = []
                    for result in response_dict['results']:
                        if isinstance(result, dict) and 'text' in result:
                            texts.append(result['text'])
                        elif isinstance(result, str):
                            texts.append(result)
                    extracted_text = '\n'.join(texts)
                    print(f"Found text in 'results' array: {extracted_text[:100]}...")
                elif 'pages' in response_dict and isinstance(response_dict['pages'], list):
                    texts = []
                    for page in response_dict['pages']:
                        print(f"Processing page: {page}")
                        if isinstance(page, dict):
                            # Check for various text field names in page
                            if 'markdown' in page:
                                texts.append(page['markdown'])
                                print(f"Found page markdown: {page['markdown'][:100]}...")
                            elif 'text' in page:
                                texts.append(page['text'])
                                print(f"Found page text: {page['text'][:100]}...")
                            elif 'content' in page:
                                texts.append(page['content'])
                                print(f"Found page content: {page['content'][:100]}...")
                            elif 'extracted_text' in page:
                                texts.append(page['extracted_text'])
                                print(f"Found page extracted_text: {page['extracted_text'][:100]}...")
                            elif 'blocks' in page:
                                # Some OCR APIs structure text in blocks
                                page_text = ""
                                for block in page['blocks']:
                                    if isinstance(block, dict) and 'text' in block:
                                        page_text += block['text'] + " "
                                    elif isinstance(block, str):
                                        page_text += block + " "
                                if page_text:
                                    texts.append(page_text.strip())
                                    print(f"Found page blocks text: {page_text[:100]}...")
                            else:
                                print(f"Page keys: {list(page.keys())}")
                        elif isinstance(page, str):
                            texts.append(page)
                            print(f"Found page string: {page[:100]}...")
                    extracted_text = '\n\n'.join(texts)
                    print(f"Found text in 'pages' array: {extracted_text[:100]}...")
                else:
                    # Log the full response for debugging
                    print(f"Unexpected response format - no text found in common fields")
                    print(f"Available keys: {list(response_dict.keys())}")
                    extracted_text = f"Response received but text extraction failed. Raw response: {json.dumps(response_dict, indent=2)}"
                
                print(f"Final extracted text length: {len(extracted_text)} characters")
                if len(extracted_text) > 0:
                    print(f"First 200 chars: {extracted_text[:200]}")
                else:
                    print("No text was extracted!")
                
                return OCRResponse(
                    text=extracted_text,
                    filename=file.filename,
                    processed_at=datetime.now()
                )
                
            except json.JSONDecodeError as e:
                logger.error(f"Error decoding JSON response: {e}")
                logger.error(f"Raw response: {response.text}")
                raise HTTPException(status_code=500, detail=f"Invalid JSON response from Mistral OCR: {e}")
                
        else:
            error_msg = f"Mistral OCR API request failed with status code: {response.status_code}"
            logger.error(f"{error_msg}. Response: {response.text}")
            raise HTTPException(status_code=500, detail=f"{error_msg}. Response: {response.text}")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing OCR: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=False)