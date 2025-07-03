# consulting_frameworks/__init__.py

"""
Consulting Frameworks Package
This package provides various business consulting frameworks for strategic analysis.
"""

import logging

# Configure logging for the package
logger = logging.getLogger(__name__)

# Try to import the main frameworks manager and router
try:
    from .ConsultingFrameworksManager import (
        frameworks_manager,
        get_frameworks_manager,
        get_available_frameworks,
        get_all_routers,
        get_main_router,
        get_framework_status,
        router  # This is the main router that includes all frameworks
    )
    
    # Additional convenience imports
    from .ConsultingFrameworksManager import ConsultingFrameworksManager, FrameworkInfo
    
    logger.info("✅ Consulting Frameworks Manager loaded successfully")
    
    __all__ = [
        # Manager and framework info
        'frameworks_manager',
        'get_frameworks_manager',
        'ConsultingFrameworksManager',
        'FrameworkInfo',
        
        # Framework queries
        'get_available_frameworks',
        'get_all_routers',
        'get_main_router',
        'get_framework_status',
        
        # FastAPI integration
        'router',  # Main router for FastAPI
        
        # Individual framework modules (if needed)
        'AVAILABLE_FRAMEWORKS',
        'FRAMEWORK_COUNT'
    ]
    
    # Provide some package-level constants
    AVAILABLE_FRAMEWORKS = list(get_available_frameworks().keys())
    FRAMEWORK_COUNT = len(frameworks_manager.frameworks)
    
    logger.info(f"📊 Package initialized with {FRAMEWORK_COUNT} frameworks")
    logger.info(f"✅ Available frameworks: {AVAILABLE_FRAMEWORKS}")
    
except ImportError as e:
    logger.error(f"❌ Failed to import ConsultingFrameworksManager: {e}")
    
    # Graceful fallback if main manager fails to import
    frameworks_manager = None
    router = None
    
    def get_frameworks_manager():
        raise ImportError("ConsultingFrameworksManager could not be imported")
    
    def get_available_frameworks():
        return {}
    
    def get_all_routers():
        return []
    
    def get_main_router():
        raise ImportError("Main router could not be imported")
    
    def get_framework_status():
        return {"error": "Frameworks manager not available"}
    
    __all__ = [
        'get_frameworks_manager',
        'get_available_frameworks', 
        'get_all_routers',
        'get_main_router',
        'get_framework_status',
        'router'
    ]
    
    AVAILABLE_FRAMEWORKS = []
    FRAMEWORK_COUNT = 0
    
    logger.warning("⚠️ Package initialized in fallback mode - no frameworks available")

except Exception as e:
    logger.error(f"❌ Unexpected error initializing consulting frameworks package: {e}")
    
    # Complete fallback
    frameworks_manager = None
    router = None
    AVAILABLE_FRAMEWORKS = []
    FRAMEWORK_COUNT = 0
    
    __all__ = []

# Try to import individual framework modules for direct access (optional)
try:
    # Import individual frameworks if needed for direct access
    from . import SWOTFramework
    from . import UseCaseFramework
    # from . import McKinsey7SFramework  # Uncomment when available
    
    __all__.extend(['SWOTFramework', 'UseCaseFramework'])
    logger.info("✅ Individual framework modules imported successfully")
    
except ImportError as framework_import_error:
    logger.warning(f"⚠️ Some individual framework modules could not be imported: {framework_import_error}")

# Package metadata
__version__ = "1.0.0"
__author__ = "Your Name"
__description__ = "Business consulting frameworks for strategic analysis"

# Log package initialization completion
if frameworks_manager:
    logger.info(f"🎯 Consulting Frameworks Package v{__version__} ready")
    logger.info(f"📍 Main router available at: /consulting")
    logger.info(f"📖 Available frameworks: {', '.join(AVAILABLE_FRAMEWORKS)}")
else:
    logger.warning(f"⚠️ Consulting Frameworks Package v{__version__} initialized with limited functionality")

# Export version info
__all__.extend(['__version__', '__author__', '__description__'])