# consulting_frameworks/ConsultingFrameworksManager.py
"""
Central manager for all consulting frameworks.
This module imports and organizes all framework routers for easy integration.
"""

import logging
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from fastapi import APIRouter

# Configure logging
logger = logging.getLogger(__name__)

@dataclass
class FrameworkInfo:
    """Information about a consulting framework"""
    name: str
    description: str
    router: Optional[APIRouter]
    prefix: str
    tags: List[str]
    status: str  # "available", "unavailable", "error"
    error_message: Optional[str] = None
    version: str = "1.0.0"
    features: List[str] = None

class ConsultingFrameworksManager:
    """Manager class for all consulting frameworks"""
    
    def __init__(self):
        self.frameworks: Dict[str, FrameworkInfo] = {}
        self.routers: List[tuple] = []  # (router, prefix, tags)
        self.initialize_frameworks()
    
    def initialize_frameworks(self):
        """Initialize all available frameworks"""
        logger.info("🚀 Initializing Consulting Frameworks Manager")
        
        # Initialize SWOT Framework
        self._load_swot_framework()
        
        # TODO: Add other frameworks as we build them
        # self._load_porters_five_forces()
        # self._load_mckinsey_7s()
        # self._load_balanced_scorecard()
        # self._load_root_cause_analysis()
        # self._load_issue_tree()
        
        logger.info(f"✅ Frameworks Manager initialized with {len(self.frameworks)} frameworks")
        self._log_framework_status()
    
    def _load_swot_framework(self):
        """Load SWOT Analysis framework"""
        try:
            # Import from the same directory
            from .SWOTFramework import router as swot_router
            
            self.frameworks["swot"] = FrameworkInfo(
                name="SWOT Analysis",
                description="Strategic planning technique evaluating Strengths, Weaknesses, Opportunities, and Threats",
                router=swot_router,
                prefix="/swot",
                tags=["SWOT Analysis", "Strategic Planning"],
                status="available",
                features=[
                    "Comprehensive SWOT matrix analysis",
                    "Strategic combinations (SO, WO, ST, WT)",
                    "Real-time market grounding",
                    "Interactive chat conversations",
                    "Streaming responses",
                    "Competitor analysis",
                    "Market research integration"
                ]
            )
            
            self.routers.append((swot_router, "/swot", ["SWOT Analysis"]))
            logger.info("✅ SWOT Framework loaded successfully")
            
        except ImportError as e:
            self.frameworks["swot"] = FrameworkInfo(
                name="SWOT Analysis",
                description="Strategic planning technique (unavailable)",
                router=None,
                prefix="/swot",
                tags=["SWOT Analysis"],
                status="unavailable",
                error_message=f"Import error: {str(e)}"
            )
            logger.error(f"❌ Failed to load SWOT Framework: {e}")
            
        except Exception as e:
            self.frameworks["swot"] = FrameworkInfo(
                name="SWOT Analysis",
                description="Strategic planning technique (error)",
                router=None,
                prefix="/swot",
                tags=["SWOT Analysis"],
                status="error",
                error_message=f"Initialization error: {str(e)}"
            )
            logger.error(f"❌ Error initializing SWOT Framework: {e}")
    
    def _load_porters_five_forces(self):
        """Load Porter's Five Forces framework"""
        try:
            from .PortersFramework import router as porters_router
            
            self.frameworks["porters"] = FrameworkInfo(
                name="Porter's Five Forces",
                description="Industry competitiveness and profitability analysis framework",
                router=porters_router,
                prefix="/porters",
                tags=["Porter's Five Forces", "Industry Analysis"],
                status="available",
                features=[
                    "Five forces competitive analysis",
                    "Industry attractiveness assessment",
                    "Competitive positioning guidance",
                    "Market entry evaluation",
                    "Real-time industry data"
                ]
            )
            
            self.routers.append((porters_router, "/porters", ["Porter's Five Forces"]))
            logger.info("✅ Porter's Five Forces Framework loaded successfully")
            
        except ImportError as e:
            self.frameworks["porters"] = FrameworkInfo(
                name="Porter's Five Forces",
                description="Industry analysis framework (unavailable)",
                router=None,
                prefix="/porters",
                tags=["Porter's Five Forces"],
                status="unavailable",
                error_message=f"Import error: {str(e)}"
            )
            logger.error(f"❌ Failed to load Porter's Framework: {e}")
    
    def get_available_frameworks(self) -> Dict[str, FrameworkInfo]:
        """Get all available frameworks"""
        return {k: v for k, v in self.frameworks.items() if v.status == "available"}
    
    def get_unavailable_frameworks(self) -> Dict[str, FrameworkInfo]:
        """Get unavailable frameworks"""
        return {k: v for k, v in self.frameworks.items() if v.status != "available"}
    
    def get_framework_by_name(self, name: str) -> Optional[FrameworkInfo]:
        """Get framework by name"""
        return self.frameworks.get(name)
    
    def get_all_routers(self) -> List[tuple]:
        """Get all available routers for FastAPI inclusion"""
        return [(router, prefix, tags) for router, prefix, tags in self.routers if router is not None]
    
    def get_framework_status(self) -> Dict[str, Any]:
        """Get comprehensive status of all frameworks"""
        available_count = len(self.get_available_frameworks())
        unavailable_count = len(self.get_unavailable_frameworks())
        
        return {
            "total_frameworks": len(self.frameworks),
            "available_frameworks": available_count,
            "unavailable_frameworks": unavailable_count,
            "frameworks": {
                name: {
                    "name": info.name,
                    "status": info.status,
                    "prefix": info.prefix,
                    "features_count": len(info.features) if info.features else 0,
                    "error": info.error_message
                }
                for name, info in self.frameworks.items()
            }
        }
    
    def _log_framework_status(self):
        """Log the status of all frameworks"""
        logger.info("=== CONSULTING FRAMEWORKS STATUS ===")
        for name, info in self.frameworks.items():
            status_emoji = "✅" if info.status == "available" else "❌"
            logger.info(f"  {status_emoji} {info.name} ({info.status})")
            if info.error_message:
                logger.info(f"    Error: {info.error_message}")
        logger.info("=== END FRAMEWORKS STATUS ===")

# Create global instance
frameworks_manager = ConsultingFrameworksManager()

# Export commonly used functions and data
def get_frameworks_manager() -> ConsultingFrameworksManager:
    """Get the global frameworks manager instance"""
    return frameworks_manager

def get_available_frameworks() -> Dict[str, FrameworkInfo]:
    """Get all available frameworks"""
    return frameworks_manager.get_available_frameworks()

def get_all_routers() -> List[tuple]:
    """Get all routers for FastAPI inclusion"""
    return frameworks_manager.get_all_routers()

def get_framework_status() -> Dict[str, Any]:
    """Get framework status summary"""
    return frameworks_manager.get_framework_status()

# Create a summary router for framework information
summary_router = APIRouter()

@summary_router.get("/frameworks/status")
async def frameworks_status():
    """Get status of all consulting frameworks"""
    return get_framework_status()

@summary_router.get("/frameworks/list")
async def frameworks_list():
    """Get list of all available frameworks"""
    available = get_available_frameworks()
    return {
        "available_frameworks": {
            name: {
                "name": info.name,
                "description": info.description,
                "prefix": info.prefix,
                "features": info.features
            }
            for name, info in available.items()
        },
        "count": len(available)
    }

@summary_router.get("/frameworks/{framework_name}/info")
async def framework_info(framework_name: str):
    """Get detailed information about a specific framework"""
    framework = frameworks_manager.get_framework_by_name(framework_name)
    if not framework:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Framework not found")
    
    return {
        "name": framework.name,
        "description": framework.description,
        "status": framework.status,
        "prefix": framework.prefix,
        "tags": framework.tags,
        "features": framework.features,
        "version": framework.version,
        "error": framework.error_message
    }

# Export the summary router
router = summary_router