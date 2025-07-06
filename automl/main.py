# filename: src/api/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from components import gcloud_storage
from components import eda
from components import advanced_eda  # Add this import

app = FastAPI()

# Add CORS middleware to allow requests from your frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://lma-website-461920.web.app",  # Your production frontend
        "http://localhost:3000",              # Local development
        "http://localhost:5173",              # Vite dev server
        "https://localhost:3000",             # HTTPS local
        "*"                                   # Temporary - remove in production
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


# Include the routers
app.include_router(gcloud_storage.router, prefix="/api")
app.include_router(eda.eda_router, prefix="/api/eda", tags=["EDA"])
app.include_router(advanced_eda.advanced_eda_router, prefix="/api", tags=["Advanced EDA"])  # Add this line


if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8080))  # Use 8080 to match Dockerfile
    uvicorn.run(app, host="0.0.0.0", port=port)