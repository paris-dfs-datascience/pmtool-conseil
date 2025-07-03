from fastapi import APIRouter, Depends
from auth.security import validated_token_dependency
from firebase import FIREBASE_IS_AVAILABLE
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/verify", tags=["Authentication"])
async def verify_token(user: dict = Depends(validated_token_dependency)):
    """
    Verifies a Firebase ID token and returns cleaned user info.
    This endpoint is unprotected by the middleware but uses its own dependency to check the token.
    """
    logger.info(f"➡️  [Endpoint /auth/verify] Token verified for UID: {user.get('uid')}")
    return {
        "message": "Token verified successfully",
        "user": {
            "uid": user.get('uid'),
            "email": user.get('email'),
            "name": user.get('name'),
            "picture": user.get('picture'),
            "email_verified": user.get('email_verified', False)
        }
    }

@router.get("/status", tags=["Authentication"])
async def auth_status():
    """Checks the status of the authentication system."""
    logger.info("➡️  [Endpoint /auth/status] Status requested.")
    return {
        "authentication_enabled": FIREBASE_IS_AVAILABLE,
        "auth_methods": ["firebase_id_token"] if FIREBASE_IS_AVAILABLE else []
    }