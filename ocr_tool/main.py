# main.py
from fastapi import FastAPI, File, UploadFile, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
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
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Environment variables
MODEL_ID = os.getenv("MODEL_ID", "mistral-ocr-2505")
PROJECT_ID = os.getenv("PROJECT_ID") or os.getenv("GOOGLE_CLOUD_PROJECT") or os.getenv("GCP_PROJECT")
REGION = os.getenv("REGION") or os.getenv("GOOGLE_CLOUD_REGION") or "us-central1"
PORT = int(os.getenv("PORT", "8080"))

print(f"Starting OCR service with MODEL_ID: {MODEL_ID}")
print(f"Initial PROJECT_ID: {PROJECT_ID}")
print(f"Initial REGION: {REGION}")

# Auto-detect project ID if still not found
if not PROJECT_ID:
    try:
        metadata_url = "http://metadata.google.internal/computeMetadata/v1/project/project-id"
        headers = {"Metadata-Flavor": "Google"}
        response = requests.get(metadata_url, headers=headers, timeout=5)
        if response.status_code == 200:
            PROJECT_ID = response.text
            print(f"Auto-detected PROJECT_ID: {PROJECT_ID}")
    except Exception as e:
        print(f"Could not auto-detect PROJECT_ID: {e}")

if not PROJECT_ID:
    PROJECT_ID = "lma-website-461920"  # Default fallback
    print(f"Using hardcoded PROJECT_ID: {PROJECT_ID}")

print(f"Final config - PROJECT_ID: {PROJECT_ID}, REGION: {REGION}, MODEL_ID: {MODEL_ID}, PORT: {PORT}")

# Firebase setup (matching your main backend exactly)
def initialize_firebase():
    """Initializes the Firebase Admin SDK."""
    try:
        import firebase_admin
        from firebase_admin import auth, credentials
        
        if not firebase_admin._apps:
            # For Cloud Run, it uses the default service account credentials
            firebase_admin.initialize_app()
            logger.info("✅ Firebase Admin SDK initialized successfully using default credentials.")
            return True
        else:
            logger.info("✅ Firebase Admin SDK already initialized.")
            return True
    except ImportError as e:
        logger.warning(f"⚠️ Firebase Admin SDK not available: {e}")
        return False
    except Exception as e:
        logger.error(f"❌ Failed to initialize Firebase Admin SDK: {e}")
        return False

# Initialize Firebase and ensure it returns a boolean
try:
    FIREBASE_IS_AVAILABLE = initialize_firebase()
    if FIREBASE_IS_AVAILABLE is None:
        FIREBASE_IS_AVAILABLE = False
except Exception as e:
    logger.error(f"❌ Firebase initialization error: {e}")
    FIREBASE_IS_AVAILABLE = False

logger.info(f"🔐 Firebase availability: {FIREBASE_IS_AVAILABLE}")

def verify_firebase_token(id_token: str) -> dict | None:
    """Verifies a Firebase ID token and returns the decoded token."""
    if not FIREBASE_IS_AVAILABLE:
        logger.error("Attempted to verify token, but Firebase is not available.")
        return None
    try:
        from firebase_admin import auth
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except Exception as e:
        logger.error(f"🛑 Token verification failed: {e}")
        return None

# Configuration
UNPROTECTED_PATHS = {
    "/", "/health", "/auth/status", "/docs", "/openapi.json", "/redoc"
}

ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "https://lma-website-461920.web.app",
    "https://lma-website-461920.firebaseapp.com",
    "https://lemaraisadvisory.com",
    "https://www.lemaraisadvisory.com"
]

# Authentication middleware (matching your main backend exactly)
class AuthenticationMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        """Global middleware to authenticate requests."""
        logger.info(f"🛡️  [Middleware] Intercepting: {request.method} {request.url.path}")

        if request.url.path in UNPROTECTED_PATHS or request.method == "OPTIONS":
            logger.info(f"✅ [Middleware] Path is unprotected or OPTIONS. Allowing.")
            response = await call_next(request)
            return response

        if not FIREBASE_IS_AVAILABLE:
            logger.error(f"🛑 [Middleware] Blocking protected route {request.url.path}: Auth service unavailable.")
            return JSONResponse(status_code=503, content={"detail": "Authentication service unavailable"})

        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            logger.warning(f"🛑 [Middleware] Blocking {request.url.path}: Missing 'Authorization: Bearer' header.")
            return JSONResponse(status_code=401, content={"detail": "Missing or invalid authorization header"})
        
        token = auth_header.split("Bearer ")[1]
        decoded_token = verify_firebase_token(token)

        if decoded_token is None:
            logger.warning(f"🛑 [Middleware] Blocking {request.url.path}: Invalid token.")
            return JSONResponse(status_code=401, content={"detail": "Invalid authentication token"})

        logger.info(f"✅ [Middleware] User authenticated: {decoded_token.get('uid')}. Proceeding.")
        request.state.user = decoded_token  # Attach user to request state
        response = await call_next(request)
        return response

# Auth dependencies (matching your main backend)
bearer_scheme = HTTPBearer(auto_error=False)

async def get_current_user(request: Request) -> dict | None:
    """Gets the user object from the request state if it exists."""
    return getattr(request.state, "user", None)

async def require_user(user: dict | None = Depends(get_current_user)) -> dict:
    """A dependency that raises an error if no authenticated user is found."""
    if not user:
        raise HTTPException(status_code=401, detail="Authenticated user required")
    return user

async def validated_token_dependency(credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme)) -> dict:
    """
    A dependency that demands a valid token and returns its decoded content.
    This is used by endpoints that do their own auth, like /auth/verify.
    """
    if not FIREBASE_IS_AVAILABLE:
        raise HTTPException(status_code=503, detail="Authentication service unavailable")
    if credentials is None:
        raise HTTPException(status_code=401, detail="Authorization header required")

    decoded_token = verify_firebase_token(credentials.credentials)
    if decoded_token is None:
        raise HTTPException(status_code=401, detail="Invalid authentication token")
    
    logger.info(f"✅ [Dependency] Token validated for UID: {decoded_token.get('uid')}")
    return decoded_token

# Pydantic models
class OCRResponse(BaseModel):
    text: str
    filename: Optional[str] = None
    processed_at: datetime = datetime.now()

class AuthStatus(BaseModel):
    authentication_enabled: bool
    firebase_available: bool
    message: str

class UserInfo(BaseModel):
    uid: str
    email: Optional[str] = None
    name: Optional[str] = None
    verified: bool = True

# Create FastAPI app
app = FastAPI(
    title="Mistral OCR API with Authentication",
    description="OCR service using Mistral OCR via Google Cloud Vertex AI with Firebase authentication",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add authentication middleware
if FIREBASE_IS_AVAILABLE:
    app.add_middleware(AuthenticationMiddleware)
    logger.info("✅ Authentication middleware added")
else:
    logger.warning("⚠️ Authentication middleware not added - Firebase unavailable")

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

# Routes
@app.get("/", tags=["System"])
async def root():
    """Root endpoint providing basic API information"""
    return {
        "message": "Mistral OCR API with Firebase Authentication",
        "version": "1.0.0",
        "authentication_status": "enabled" if FIREBASE_IS_AVAILABLE else "disabled",
        "docs": "/docs"
    }

@app.get("/health", tags=["System"])
async def health_check():
    """Simple health check endpoint"""
    return {
        "status": "healthy", 
        "service": "mistral-ocr",
        "firebase_available": FIREBASE_IS_AVAILABLE
    }

@app.get("/auth/status", response_model=AuthStatus, tags=["Authentication"])
async def auth_status():
    """Get authentication status"""
    # Ensure we always return valid booleans
    auth_enabled = bool(FIREBASE_IS_AVAILABLE) if FIREBASE_IS_AVAILABLE is not None else False
    firebase_available = bool(FIREBASE_IS_AVAILABLE) if FIREBASE_IS_AVAILABLE is not None else False
    
    return AuthStatus(
        authentication_enabled=auth_enabled,
        firebase_available=firebase_available,
        message="Authentication is enabled" if auth_enabled else "Authentication is disabled"
    )

@app.post("/auth/verify", response_model=UserInfo, tags=["Authentication"])
async def verify_token(decoded_token: dict = Depends(validated_token_dependency)):
    """Verify Firebase token and return user info"""
    return UserInfo(
        uid=decoded_token.get('uid', ''),
        email=decoded_token.get('email'),
        name=decoded_token.get('name'),
        verified=True
    )

@app.get("/debug", tags=["System"])
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
            "firebase_available": FIREBASE_IS_AVAILABLE,
            "authentication_enabled": FIREBASE_IS_AVAILABLE,
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
            "port": PORT,
            "firebase_available": FIREBASE_IS_AVAILABLE,
            "authentication_enabled": FIREBASE_IS_AVAILABLE
        }

@app.post("/api/ocr", response_model=OCRResponse, tags=["OCR"])
async def process_ocr(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    """Process uploaded file with OCR using Mistral OCR"""
    
    user_id = user.get('uid', 'anonymous') if user else 'anonymous'
    logger.info(f"🔍 Processing OCR request for user: {user_id}")
    
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
            # Remove pages parameter to process all pages, or set to "all"
            # "pages": "all"  # Process all pages
        }
        
        # Prepare headers
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
            "Content-Type": "application/json"
        }
        
        # Make API call
        logger.info(f"Processing document: {file.filename} for user: {user_id}")
        response = requests.post(url=url, headers=headers, json=payload, timeout=60)
        
        if response.status_code == 200:
            try:
                response_dict = response.json()
                logger.info("OCR processing completed successfully")
                logger.info(f"Full Mistral OCR response: {json.dumps(response_dict, indent=2)}")
                
                # Extract text from response - adjust based on actual Mistral OCR response format
                extracted_text = ""
                
                # Try common response formats
                if 'text' in response_dict:
                    extracted_text = response_dict['text']
                    logger.info(f"Found text in 'text' field: {extracted_text[:100]}...")
                elif 'content' in response_dict:
                    extracted_text = response_dict['content']
                    logger.info(f"Found text in 'content' field: {extracted_text[:100]}...")
                elif 'results' in response_dict and isinstance(response_dict['results'], list):
                    texts = []
                    for result in response_dict['results']:
                        if isinstance(result, dict) and 'text' in result:
                            texts.append(result['text'])
                        elif isinstance(result, str):
                            texts.append(result)
                    extracted_text = '\n'.join(texts)
                    logger.info(f"Found text in 'results' array: {extracted_text[:100]}...")
                elif 'pages' in response_dict and isinstance(response_dict['pages'], list):
                    texts = []
                    for page in response_dict['pages']:
                        logger.info(f"Processing page: {page}")
                        if isinstance(page, dict):
                            # Check for various text field names in page
                            if 'markdown' in page:
                                texts.append(page['markdown'])
                                logger.info(f"Found page markdown: {page['markdown'][:100]}...")
                            elif 'text' in page:
                                texts.append(page['text'])
                                logger.info(f"Found page text: {page['text'][:100]}...")
                            elif 'content' in page:
                                texts.append(page['content'])
                                logger.info(f"Found page content: {page['content'][:100]}...")
                            elif 'extracted_text' in page:
                                texts.append(page['extracted_text'])
                                logger.info(f"Found page extracted_text: {page['extracted_text'][:100]}...")
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
                                    logger.info(f"Found page blocks text: {page_text[:100]}...")
                            else:
                                logger.info(f"Page keys: {list(page.keys())}")
                        elif isinstance(page, str):
                            texts.append(page)
                            logger.info(f"Found page string: {page[:100]}...")
                    extracted_text = '\n\n'.join(texts)
                    logger.info(f"Found text in 'pages' array: {extracted_text[:100]}...")
                else:
                    # Log the full response for debugging
                    logger.info(f"Unexpected response format - no text found in common fields")
                    logger.info(f"Available keys: {list(response_dict.keys())}")
                    extracted_text = f"Response received but text extraction failed. Raw response: {json.dumps(response_dict, indent=2)}"
                
                logger.info(f"Final extracted text length: {len(extracted_text)} characters")
                if len(extracted_text) > 0:
                    logger.info(f"First 200 chars: {extracted_text[:200]}")
                else:
                    logger.info("No text was extracted!")
                
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
    logger.info(f"🚀 Starting OCR server on port {PORT}")
    logger.info(f"🔐 Firebase Authentication: {'Enabled' if FIREBASE_IS_AVAILABLE else 'Disabled'}")
    
    uvicorn.run(
        "main:app", 
        host="0.0.0.0", 
        port=PORT, 
        reload=False,
        log_level="info",
        access_log=True
    )