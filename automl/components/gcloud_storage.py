from fastapi import APIRouter, HTTPException, Query
from google.cloud import storage

router = APIRouter()

# Initialize Google Cloud Storage client
client = storage.Client()

@router.get("/list-files/")
async def list_files(prefix: str = Query(default="", description="Folder prefix to list files from")):
    bucket_name = "table-data-conseil"
    try:
        bucket = client.get_bucket(bucket_name)
        
        # If prefix is provided, use it; otherwise list all
        if prefix:
            blobs = bucket.list_blobs(prefix=prefix)
        else:
            blobs = bucket.list_blobs()

        files = []
        for blob in blobs:
            files.append({
                "name": blob.name,
                "type": "folder" if blob.name.endswith('/') else "file",
                "size": blob.size,
                "modified": blob.updated,
                "contentType": blob.content_type
            })

        return {"files": files}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))