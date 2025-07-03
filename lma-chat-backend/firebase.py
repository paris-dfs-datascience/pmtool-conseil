import firebase_admin
from firebase_admin import auth, credentials
import logging

logger = logging.getLogger(__name__)

def initialize_firebase():
    """Initializes the Firebase Admin SDK."""
    try:
        if not firebase_admin._apps:
            # For Cloud Run, it uses the default service account credentials
            firebase_admin.initialize_app()
            logger.info("✅ Firebase Admin SDK initialized successfully using default credentials.")
            return True
    except Exception as e:
        logger.error(f"❌ Failed to initialize Firebase Admin SDK: {e}")
        return False

FIREBASE_IS_AVAILABLE = initialize_firebase()

def verify_firebase_token(id_token: str) -> dict | None:
    """Verifies a Firebase ID token and returns the decoded token."""
    if not FIREBASE_IS_AVAILABLE:
        logger.error("Attempted to verify token, but Firebase is not available.")
        return None
    try:
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except Exception as e:
        logger.error(f"🛑 Token verification failed: {e}")
        return None