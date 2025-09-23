# main.py - FastAPI application
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email.mime.text import MIMEText
from email import encoders
import tempfile
import os
import re
import magic
import zipfile
import hashlib
from defusedxml import defuse_stdlib
from docx import Document
from docx.shared import Pt
import logging
from typing import Dict, Any, Set

# Defuse XML vulnerabilities
defuse_stdlib()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Security configuration
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB limit
ALLOWED_MIME_TYPES = {
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
}

# Malicious file hash blacklist (add known bad hashes here)
BLACKLISTED_HASHES: Set[str] = set()

# Rate limiting setup
limiter = Limiter(key_func=get_remote_address)

# Create FastAPI app
app = FastAPI(title="Document Processor API", version="1.0.0")

# Add rate limiter to app
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update with your domain in production
    allow_credentials=True,
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    """Add security headers to all responses"""
    response = await call_next(request)
    
    # Security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Content-Security-Policy"] = "default-src 'self'"
    
    return response

def table_text_format(doc: Document) -> Document:
    """Format document tables with proper spacing and fonts"""
    logger.info('Starting document formatting....')
    spacing = 0
    bold_changes = 0
    sources = 0
    
    # Remove spacing from paragraphs in tables and set font
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                for paragraph in cell.paragraphs:
                    logger.info(f"Paragraph style name: '{paragraph.style.name}'")
                    # Check if this is a header paragraph
                    is_header = (
                        paragraph.style.name.startswith('Heading') or
                        paragraph.style.name.startswith('Title') or
                        paragraph.style.name.startswith('Subject Name') or
                        'subject name' in paragraph.style.name.lower() or
                        'heading' in paragraph.style.name.lower() or
                        'title' in paragraph.style.name.lower()
                    )
                    
                    # If it's a header, skip all formatting and continue to next paragraph
                    if is_header:
                        logger.info(f"Skipping header paragraph with style: {paragraph.style.name}")
                        continue
                    
                    paragraph.paragraph_format.space_before = Pt(0)
                    paragraph.paragraph_format.space_after = Pt(0)
                    paragraph.paragraph_format.line_spacing = 1.07
                    
                    # If paragraph has text, set after spacing to 6pt
                    if paragraph.text.strip():
                        paragraph.paragraph_format.space_after = Pt(6)
                        spacing += 1
                    if 'Sources consulted' in paragraph.text:
                        paragraph.paragraph_format.space_before = Pt(0)
                        paragraph.paragraph_format.space_after = Pt(6)
                        sources += 1
                    
                    # Define social media platforms to make bold
                    social_platforms = [
                        'LinkedIn:', 'Facebook:', 'Venmo:', 'YouTube:', 'Instagram:',
                        'X (fka Twitter):', 'Medium.com:', 'Tiktok:', 'Bluesky:'
                    ]

                    # Check if paragraph contains any platforms
                    full_text = paragraph.text
                    platforms_in_paragraph = [p for p in social_platforms if p in full_text]

                    if platforms_in_paragraph:
                        logger.info(f"Paragraph contains platforms: {platforms_in_paragraph}")
                        logger.info(f"Full paragraph text: '{full_text}'")
                        
                        # Simple approach: if paragraph contains platform, check each run
                        for run in paragraph.runs:
                            run.font.name = 'Helvetica'
                            run.font.size = Pt(11)
                            
                            run_text = run.text
                            logger.info(f"Checking run: '{run_text}'")
                            
                            # Check if this run text appears in any of the platforms found in paragraph
                            should_be_bold = False
                            for platform in platforms_in_paragraph:
                                if run_text in platform or platform in run_text:
                                    should_be_bold = True
                                    logger.info(f"Run '{run_text}' matches platform '{platform}'")
                                    break
                                # Also check if run text is a significant part
                                elif len(run_text.strip()) > 2 and run_text.strip() in platform:
                                    should_be_bold = True
                                    logger.info(f"Run '{run_text}' is part of platform '{platform}'")
                                    break
                            
                            run.font.bold = should_be_bold
                            if should_be_bold:
                                logger.info(f"Made BOLD: '{run_text}'")
                            bold_changes += 1
                    else:
                        # Regular formatting
                        for run in paragraph.runs:
                            run.font.name = 'Helvetica'
                            run.font.size = Pt(11)
                            run.font.bold = False
                            bold_changes += 1

    logger.info(f'Completed {spacing} Spacing Updates')
    logger.info(f'Completed {sources} Sources Consulted Updates') 
    logger.info(f'Completed {bold_changes} Font Updates')
    logger.info('Completed Document Formatting')
    return doc

def send_email_with_attachment(recipient_email: str, attachment_path: str, filename: str) -> bool:
    """Send email with processed document attachment"""
    try:
        # Email configuration from environment variables
        smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        smtp_port = int(os.getenv('SMTP_PORT', '587'))
        sender_email = os.getenv('SENDER_EMAIL')
        sender_password = os.getenv('SENDER_PASSWORD')
        
        if not all([sender_email, sender_password]):
            raise ValueError("Email credentials not configured")
        
        # Create message
        msg = MIMEMultipart()
        msg['From'] = sender_email
        msg['To'] = recipient_email
        msg['Subject'] = 'Your Processed Document is Ready'
        
        # Add body
        body = f"""Hello,

Your document has been successfully processed and formatted. Please find the updated document attached.

Processing completed with the following updates:
• Table formatting applied
• Font standardization to Helvetica 11pt  
• Paragraph spacing optimization

Best regards,
Document Processing Service
"""
        msg.attach(MIMEText(body, 'plain'))
        
        # Add attachment
        with open(attachment_path, 'rb') as attachment:
            part = MIMEBase('application', 'vnd.openxmlformats-officedocument.wordprocessingml.document')
            part.set_payload(attachment.read())
        
        encoders.encode_base64(part)
        part.add_header(
            'Content-Disposition',
            f'attachment; filename={filename}',
        )
        msg.attach(part)
        
        # Send email
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(sender_email, sender_password)
        server.send_message(msg)
        server.quit()
        
        logger.info(f'Email sent successfully to {recipient_email}')
        return True
        
    except Exception as e:
        logger.error(f'Failed to send email: {str(e)}')
        return False

def validate_email(email: str) -> bool:
    """Validate email format and check for suspicious patterns"""
    pattern = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
    
    # Basic format check
    if not re.match(pattern, email):
        return False
    
    # Length limits
    if len(email) > 254 or len(email) < 5:
        return False
    
    # Check for suspicious patterns
    suspicious_email_patterns = ['script', 'javascript', 'eval', '..', '//', '\\']
    email_lower = email.lower()
    
    for pattern in suspicious_email_patterns:
        if pattern in email_lower:
            logger.warning(f"Suspicious email pattern detected: {email}")
            return False
    
    return True

def get_file_hash(file_content: bytes) -> str:
    """Get SHA256 hash of file content"""
    return hashlib.sha256(file_content).hexdigest()

def validate_docx_structure(file_path: str) -> bool:
    """Basic .docx file structure validation - focus on Cloud Run protection"""
    try:
        # Check if it's a valid ZIP file (docx is a ZIP archive)
        with zipfile.ZipFile(file_path, 'r') as docx_zip:
            file_list = docx_zip.namelist()
            
            # Check for required docx files
            required_files = ['[Content_Types].xml', 'word/document.xml']
            for req_file in required_files:
                if req_file not in file_list:
                    logger.warning(f"Invalid docx structure: missing {req_file}")
                    return False
            
            # Check for executable files that could harm the server
            dangerous_extensions = ['.exe', '.bat', '.cmd', '.com', '.scr', '.sh', '.py', '.js', '.jar']
            for file_name in file_list:
                for ext in dangerous_extensions:
                    if file_name.lower().endswith(ext):
                        logger.warning(f"Executable file in docx: {file_name}")
                        return False
            
            # Check for zip bomb protection (too many files)
            if len(file_list) > 1000:
                logger.warning(f"Too many files in docx: {len(file_list)}")
                return False
            
            # Check for path traversal attacks
            for file_name in file_list:
                if '..' in file_name or file_name.startswith('/'):
                    logger.warning(f"Path traversal attempt: {file_name}")
                    return False
        
        return True
        
    except zipfile.BadZipFile:
        logger.warning("File is not a valid ZIP/docx file")
        return False
    except Exception as e:
        logger.warning(f"Error validating docx structure: {str(e)}")
        return False

def security_scan_file(file_content: bytes, filename: str) -> Dict[str, Any]:
    """Basic security scan focused on Cloud Run protection"""
    scan_results = {
        'safe': True,
        'issues': [],
        'file_info': {}
    }
    
    try:
        # 1. File size check
        if len(file_content) > MAX_FILE_SIZE:
            scan_results['safe'] = False
            scan_results['issues'].append(f"File too large: {len(file_content)/1024/1024:.1f}MB (max: {MAX_FILE_SIZE/1024/1024}MB)")
            return scan_results
        
        # 2. File hash check against blacklist
        file_hash = get_file_hash(file_content)
        if file_hash in BLACKLISTED_HASHES:
            scan_results['safe'] = False
            scan_results['issues'].append("File matches known malicious hash")
            return scan_results
        
        # 3. MIME type validation
        mime_type = magic.from_buffer(file_content, mime=True)
        if mime_type not in ALLOWED_MIME_TYPES:
            scan_results['safe'] = False
            scan_results['issues'].append(f"Invalid file type: {mime_type}")
            return scan_results
        
        # 4. Save to temp file for structure validation
        with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as temp_file:
            temp_file.write(file_content)
            temp_file.flush()
            
            # 5. Docx structure validation (protects against zip bombs, executables)
            if not validate_docx_structure(temp_file.name):
                scan_results['safe'] = False
                scan_results['issues'].append("Invalid or dangerous docx file structure")
                os.unlink(temp_file.name)
                return scan_results
            
            os.unlink(temp_file.name)
        
        # Store file info for logging
        scan_results['file_info'] = {
            'size': len(file_content),
            'mime_type': mime_type,
            'hash': file_hash[:16] + "...",  # Partial hash for logging
            'filename': filename
        }
        
        logger.info(f"File security scan passed: {filename}")
        return scan_results
        
    except Exception as e:
        logger.error(f"Security scan error: {str(e)}")
        scan_results['safe'] = False
        scan_results['issues'].append(f"Security scan failed: {str(e)}")
        return scan_results

@app.get("/")
@limiter.limit("10/minute")
async def health_check(request: Request):
    """Health check endpoint with rate limiting"""
    return {"status": "healthy", "service": "document-processor"}

@app.get("/security-status")
@limiter.limit("2/minute")
async def security_status(request: Request):
    """Security status endpoint - use sparingly"""
    return {
        "security_features": [
            "File size limits enforced",
            "MIME type validation", 
            "Docx structure validation",
            "Rate limiting active",
            "XML vulnerability protection",
            "Input sanitization"
        ],
        "limits": {
            "max_file_size_mb": MAX_FILE_SIZE / 1024 / 1024,
            "rate_limit": "5 requests/minute per IP"
        }
    }

@app.post("/process")
@limiter.limit("5/minute")  # Rate limiting: 5 requests per minute per IP
async def process_document(
    request: Request,
    file: UploadFile = File(...),
    email: str = Form(...)
) -> JSONResponse:
    """Process .docx document and email results with security checks"""
    
    try:
        # 1. Input validation
        if not file.filename or not file.filename.lower().endswith('.docx'):
            raise HTTPException(status_code=400, detail="Only .docx files are supported")
        
        if not validate_email(email):
            raise HTTPException(status_code=400, detail="Invalid or suspicious email format")
        
        # 2. Read and scan file content
        file_content = await file.read()
        
        # 3. Security scan
        scan_results = security_scan_file(file_content, file.filename)
        
        if not scan_results['safe']:
            logger.warning(f"Security scan failed for {file.filename}: {scan_results['issues']}")
            raise HTTPException(
                status_code=400, 
                detail=f"File security check failed: {'; '.join(scan_results['issues'])}"
            )
        
        logger.info(f'Security scan passed. Processing document: {file.filename} for email: {email}')
        
        # 4. Process the document in isolated environment
        with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as temp_input:
            temp_input.write(file_content)
            temp_input.flush()
            
            try:
                # Load document with defusedxml protection
                doc = Document(temp_input.name)
                formatted_doc = table_text_format(doc)
                
                # Generate safe output filename
                safe_base_name = re.sub(r'[^\w\-_.]', '_', os.path.splitext(file.filename)[0])
                output_filename = f"formatted_{safe_base_name}.docx"
                
                # Save processed document
                with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as temp_output:
                    formatted_doc.save(temp_output.name)
                    
                    # Send email with attachment
                    email_sent = send_email_with_attachment(
                        email, 
                        temp_output.name, 
                        output_filename
                    )
                    
                    # Clean up temp files
                    os.unlink(temp_input.name)
                    os.unlink(temp_output.name)
                    
                    if email_sent:
                        return JSONResponse(
                            content={
                                "success": True,
                                "message": f"Document processed and sent to {email}",
                                "stats": {
                                    "email_sent_to": email,
                                    "original_file": file.filename,
                                    "processed_file": output_filename,
                                    "file_size_mb": round(len(file_content) / 1024 / 1024, 2)
                                }
                            },
                            status_code=200
                        )
                    else:
                        raise HTTPException(
                            status_code=500, 
                            detail="Document processed but email delivery failed"
                        )
            
            except Exception as processing_error:
                # Clean up on processing error
                if os.path.exists(temp_input.name):
                    os.unlink(temp_input.name)
                raise processing_error
                    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error processing document: {str(e)}')
        raise HTTPException(status_code=500, detail="Internal processing error")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)