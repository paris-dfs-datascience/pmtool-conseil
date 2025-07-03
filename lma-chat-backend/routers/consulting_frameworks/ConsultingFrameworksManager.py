"""
Central manager for all consulting frameworks.
This module imports and organizes all framework routers for easy integration.
"""

import logging
import traceback
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from fastapi import APIRouter, HTTPException

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
        # Create the main router that will include all framework routers
        self.main_router = APIRouter(prefix="/consulting", tags=["Consulting Frameworks"])
        self.initialize_frameworks()

    def initialize_frameworks(self):
        """Initialize all available frameworks"""
        logger.info("🚀 Initializing Consulting Frameworks Manager")

        # Initialize SWOT Framework
        self._load_swot_framework()

        # Initialize Use Case Framework
        self._load_use_case_framework()

        # Initialize McKinsey 7S Framework
        self._load_mckinsey_7s_framework()

        # Add summary endpoints to the main router
        self._add_summary_endpoints()

        # TODO: Add other frameworks as we build them
        # self._load_porters_five_forces()
        # self._load_balanced_scorecard()
        # self._load_root_cause_analysis()
        # self._load_issue_tree()

        logger.info(f"✅ Frameworks Manager initialized with {len(self.frameworks)} frameworks")
        self._log_framework_status()

    def _load_swot_framework(self):
        """Load SWOT Analysis framework"""
        try:
            # Import from the same package using relative import
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

            # Include the SWOT router in the main router
            self.main_router.include_router(swot_router, prefix="/swot", tags=["SWOT Analysis"])
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
            logger.error(f"Traceback:\n{traceback.format_exc()}")

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
            logger.error(f"Traceback:\n{traceback.format_exc()}")

    def _load_use_case_framework(self):
        """Load Use Case Framework"""
        try:
            logger.debug("🔍 Attempting to import Use Case Framework...")
            
            # Import from the same package using relative import
            from .UseCaseFramework import router as use_case_router
            
            logger.debug("✅ Use Case Framework module imported successfully")

            self.frameworks["use_case"] = FrameworkInfo(
                name="Use Case Framework",
                description="A comprehensive framework for evaluating business use cases based on impact and technical feasibility",
                router=use_case_router,
                prefix="/use_case",
                tags=["Use Case Assessment", "Business Impact", "Technical Feasibility"],
                status="available",
                features=[
                    "Business impact assessment (value creation, strategic alignment, adoption ease, business readiness)",
                    "Technical feasibility analysis (data readiness, solution readiness, scalability, reusability)",
                    "Priority scoring and ranking (1-10 scale)",
                    "ROI projection and financial analysis",
                    "Implementation roadmap planning",
                    "Risk assessment and mitigation strategies",
                    "Multi-use case prioritization",
                    "Industry benchmarks and templates",
                    "Real-time market research grounding",
                    "Interactive chat conversations",
                    "Streaming responses",
                    "Alternative approach recommendations"
                ]
            )

            # Include the Use Case router in the main router
            self.main_router.include_router(use_case_router, prefix="/use_case", tags=["Use Case Assessment"])
            self.routers.append((use_case_router, "/use_case", ["Use Case Assessment"]))
            logger.info("✅ Use Case Framework loaded successfully")

        except ImportError as e:
            error_details = {
                "error_type": "ImportError",
                "error_message": str(e),
                "module_name": e.name if hasattr(e, 'name') else 'Unknown',
                "module_path": e.path if hasattr(e, 'path') else 'Unknown'
            }
            
            self.frameworks["use_case"] = FrameworkInfo(
                name="Use Case Framework",
                description="Business impact assessment framework (unavailable)",
                router=None,
                prefix="/use_case",
                tags=["Use Case Assessment"],
                status="unavailable",
                error_message=f"Import error: {str(e)}"
            )
            
            logger.error(f"❌ Failed to load Use Case Framework - ImportError")
            logger.error(f"Error details: {error_details}")
            logger.error(f"Full traceback:\n{traceback.format_exc()}")

        except AttributeError as e:
            self.frameworks["use_case"] = FrameworkInfo(
                name="Use Case Framework",
                description="Business impact assessment framework (error)",
                router=None,
                prefix="/use_case",
                tags=["Use Case Assessment"],
                status="error",
                error_message=f"AttributeError: {str(e)} - Module might not have a 'router' attribute"
            )
            
            logger.error(f"❌ Use Case Framework module found but missing 'router' attribute")
            logger.error(f"AttributeError: {e}")
            logger.error(f"Full traceback:\n{traceback.format_exc()}")

        except Exception as e:
            error_type = type(e).__name__
            
            self.frameworks["use_case"] = FrameworkInfo(
                name="Use Case Framework",
                description="Business impact assessment framework (error)",
                router=None,
                prefix="/use_case",
                tags=["Use Case Assessment"],
                status="error",
                error_message=f"{error_type}: {str(e)}"
            )
            
            logger.error(f"❌ Unexpected error loading Use Case Framework")
            logger.error(f"Error type: {error_type}")
            logger.error(f"Error message: {e}")
            logger.error(f"Full traceback:\n{traceback.format_exc()}")

    def _load_mckinsey_7s_framework(self):
        """Load McKinsey 7S framework"""
        try:
            logger.debug("🔍 Attempting to import McKinsey 7S Framework...")
            
            # Import from the same package using relative import
            from .McKinsey7SFramework import router as mckinsey_7s_router
            
            logger.debug("✅ McKinsey 7S Framework module imported successfully")

            self.frameworks["mckinsey_7s"] = FrameworkInfo(
                name="McKinsey 7S Framework",
                description="A strategic planning framework that evaluates the seven key elements of an organization",
                router=mckinsey_7s_router,
                prefix="/mckinsey_7s",
                tags=["McKinsey 7S Framework", "Strategic Planning"],
                status="available",
                features=[
                    "Comprehensive 7S matrix analysis",
                    "Strategic combinations (SO, WO, ST, WT)",
                    "Real-time market grounding",
                    "Interactive chat conversations",
                    "Streaming responses",
                    "Competitor analysis",
                    "Market research integration"
                ]
            )

            # Include the McKinsey 7S router in the main router
            self.main_router.include_router(mckinsey_7s_router, prefix="/mckinsey_7s", tags=["McKinsey 7S Framework"])
            self.routers.append((mckinsey_7s_router, "/mckinsey_7s", ["McKinsey 7S Framework"]))
            logger.info("✅ McKinsey 7S Framework loaded successfully")

        except ImportError as e:
            error_details = {
                "error_type": "ImportError",
                "error_message": str(e),
                "module_name": e.name if hasattr(e, 'name') else 'Unknown',
                "module_path": e.path if hasattr(e, 'path') else 'Unknown'
            }
            
            self.frameworks["mckinsey_7s"] = FrameworkInfo(
                name="McKinsey 7S Framework",
                description="Strategic planning framework (unavailable)",
                router=None,
                prefix="/mckinsey_7s",
                tags=["McKinsey 7S Framework"],
                status="unavailable",
                error_message=f"Import error: {str(e)}"
            )
            
            logger.error(f"❌ Failed to load McKinsey 7S Framework - ImportError")
            logger.error(f"Error details: {error_details}")
            logger.error(f"Full traceback:\n{traceback.format_exc()}")

        except AttributeError as e:
            self.frameworks["mckinsey_7s"] = FrameworkInfo(
                name="McKinsey 7S Framework",
                description="Strategic planning framework (error)",
                router=None,
                prefix="/mckinsey_7s",
                tags=["McKinsey 7S Framework"],
                status="error",
                error_message=f"AttributeError: {str(e)} - Module might not have a 'router' attribute"
            )
            
            logger.error(f"❌ McKinsey 7S Framework module found but missing 'router' attribute")
            logger.error(f"AttributeError: {e}")
            logger.error(f"Full traceback:\n{traceback.format_exc()}")

        except Exception as e:
            error_type = type(e).__name__
            
            self.frameworks["mckinsey_7s"] = FrameworkInfo(
                name="McKinsey 7S Framework",
                description="Strategic planning framework (error)",
                router=None,
                prefix="/mckinsey_7s",
                tags=["McKinsey 7S Framework"],
                status="error",
                error_message=f"{error_type}: {str(e)}"
            )
            
            logger.error(f"❌ Unexpected error loading McKinsey 7S Framework")
            logger.error(f"Error type: {error_type}")
            logger.error(f"Error message: {e}")
            logger.error(f"Full traceback:\n{traceback.format_exc()}")

    def _add_summary_endpoints(self):
        """Add framework management endpoints to the main router"""
        
        @self.main_router.get("/status")
        async def frameworks_status():
            """Get status of all consulting frameworks"""
            return self.get_framework_status()

        @self.main_router.get("/list")
        async def frameworks_list():
            """Get list of all available frameworks"""
            available = self.get_available_frameworks()
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

        @self.main_router.get("/{framework_name}/info")
        async def framework_info(framework_name: str):
            """Get detailed information about a specific framework"""
            framework = self.get_framework_by_name(framework_name)
            if not framework:
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

        @self.main_router.get("/health")
        async def frameworks_health():
            """Health check for all frameworks"""
            available_count = len(self.get_available_frameworks())
            total_count = len(self.frameworks)
            
            return {
                "status": "healthy" if available_count > 0 else "unhealthy",
                "available_frameworks": available_count,
                "total_frameworks": total_count,
                "frameworks": list(self.get_available_frameworks().keys())
            }

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

    def get_main_router(self) -> APIRouter:
        """Get the main router that includes all framework routers"""
        return self.main_router

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

def get_main_router() -> APIRouter:
    """Get the main unified router"""
    return frameworks_manager.get_main_router()

def get_framework_status() -> Dict[str, Any]:
    """Get framework status summary"""
    return frameworks_manager.get_framework_status()

# Export the main router (this includes ALL framework routes)
router = frameworks_manager.get_main_router()