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
    "http://localhost:3000", # Example for local development
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
}

logger.info(f"✅ Configuration loaded. UNPROTECTED_PATHS: {UNPROTECTED_PATHS}")