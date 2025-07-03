# auth/middleware.py
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from config import UNPROTECTED_PATHS
from firebase import verify_firebase_token, FIREBASE_IS_AVAILABLE
import logging

logger = logging.getLogger(__name__)

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

# Keep the function for backward compatibility
async def authenticate_request(request: Request, call_next):
    """Function-based middleware - deprecated, use AuthenticationMiddleware class instead"""
    middleware = AuthenticationMiddleware(None)
    return await middleware.dispatch(request, call_next)