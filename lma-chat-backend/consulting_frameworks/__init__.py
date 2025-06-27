"""
Consulting Frameworks Package
A collection of strategic consulting frameworks for business analysis.
"""

# Import main components for easy access
try:
    from .ConsultingFrameworksManager import (
        frameworks_manager,
        get_frameworks_manager,
        get_available_frameworks,
        get_all_routers,
        get_framework_status,
        router as summary_router
    )
    
    __all__ = [
        'frameworks_manager',
        'get_frameworks_manager', 
        'get_available_frameworks',
        'get_all_routers',
        'get_framework_status',
        'summary_router'
    ]
    
except ImportError as e:
    # Graceful fallback if imports fail
    print(f"Warning: Some consulting frameworks could not be imported: {e}")
    __all__ = []