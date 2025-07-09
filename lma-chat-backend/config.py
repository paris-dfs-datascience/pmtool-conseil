import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("app_config")

# List of allowed origins for CORS
# In a real production environment, you would pull this from environment variables
ALLOWED_ORIGINS = [
    "https://lma-website-461920.web.app",
    "https://lma-website-461920.firebaseapp.com",  # Add Firebase backup URL
    "http://localhost:3000",  # ← Added missing comma here
    "http://localhost:3001",  # Add common dev port
    "http://127.0.0.1:3000",  # Add localhost alternative
    "https://www.lemaraisadvisory.com",  # ← Added missing comma here too
]

# Set of paths that do not require authentication
UNPROTECTED_PATHS = {
    "/",
    "/health",
    "/docs",
    "/redoc",
    "/openapi.json",
    "/auth/status",
    "/auth/verify",
    "/debug/cors",  # Add debug endpoint to unprotected paths
    "/debug/routes",  # Add debug endpoint to unprotected paths
}

logger.info(f"✅ Configuration loaded. ALLOWED_ORIGINS: {ALLOWED_ORIGINS}")
logger.info(f"✅ Configuration loaded. UNPROTECTED_PATHS: {UNPROTECTED_PATHS}")