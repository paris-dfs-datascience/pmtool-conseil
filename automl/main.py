# filename: src/api/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from components import gcloud_storage
from components import eda

app = FastAPI()

# Add CORS middleware to allow requests from your frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this to your frontend's URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the gcloud_storage router
app.include_router(gcloud_storage.router, prefix="/api")
app.include_router(eda.eda_router, prefix="/api/eda", tags=["EDA"])


if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8080))  # Use 8080 to match Dockerfile
    uvicorn.run(app, host="0.0.0.0", port=port)