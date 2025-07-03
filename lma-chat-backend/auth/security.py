import logging  
from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase import verify_firebase_token, FIREBASE_IS_AVAILABLE

logger = logging.getLogger(__name__)

# This security scheme can be used by endpoints that need the token
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