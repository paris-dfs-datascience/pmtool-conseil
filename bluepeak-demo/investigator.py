import os
import json
import datetime
import time
from google.cloud import storage
from google import genai

# Configuration
PROJECT_ID = os.environ.get("GOOGLE_CLOUD_PROJECT")
REGION = "us-central1"
BUCKET_NAME = "bluepeak-market-intelligence"

# Initialize Clients
storage_client = storage.Client()
# We don't need vertexai.init() for the genai client, it uses env vars automatically

def perform_deep_dive(zip_code, competitor_name, offer_name):
    """
    The INVESTIGATOR: Uses the Gemini Deep Research Agent (Interactions API).
    """
    print(f"  ... 🕵️ Investigation started: {competitor_name} in {zip_code} ...")
    
    # Initialize the specific GenAI client
    client = genai.Client(location=REGION) 

    prompt = f"""
    Research the "{offer_name}" internet offer from {competitor_name} in Zip Code {zip_code}.
    Find the 'Broadband Facts' label, Terms of Service, or rate card. 
    
    Report on:
    1. Hard Data Caps (and overage fees).
    2. Price increases (standard rate after promo ends).
    3. Mandatory equipment fees.
    
    Keep the output concise and factual.
    """

    try:
        # 1. Start the Background Task
        # Note: Using the model name from your docs. 
        # In Dec 2025, check if there is a newer version if this fails.
        interaction = client.interactions.create(
            input=prompt,
            agent='deep-research-pro-preview-12-2025', 
            background=True
        )
        print(f"    -> Task Started (ID: {interaction.id})")

        # 2. Polling Loop (Deep Research takes minutes)
        while True:
            # Check status
            interaction = client.interactions.get(name=interaction.name) # name includes the ID
            
            if interaction.status == "completed":
                print("    -> ✅ Research Complete!")
                # Return the final text from the agent
                return interaction.outputs[-1].text
            
            elif interaction.status == "failed":
                print(f"    -> ❌ Research Failed: {interaction.error}")
                return "Investigation failed due to API error."
            
            # Wait 30 seconds before checking again
            print("    -> Agent is researching... (sleeping 30s)")
            time.sleep(30)

    except Exception as e:
        print(f"  Deep Dive Exception: {e}")
        return f"Investigation error: {str(e)}"

def process_daily_reports():
    """
    Scans today's bucket folder for cheap offers and enriches them.
    """
    bucket = storage_client.bucket(BUCKET_NAME)
    date_str = datetime.datetime.utcnow().strftime("%Y-%m-%d")
    prefix = f"{date_str}/"
    
    print(f"Scanning bucket folder: {prefix}")
    blobs = bucket.list_blobs(prefix=prefix)
    
    for blob in blobs:
        json_data = blob.download_as_text()
        data = json.loads(json_data)
        
        # Trigger condition: Price < $65 and not yet analyzed
        if data.get('price', 100) < 65 and 'deep_dive_analysis' not in data:
            
            print(f"Found Trigger: {data['competitor_name']} at ${data['price']} in {data['zip_code']}")
            
            analysis = perform_deep_dive(
                data['zip_code'], 
                data['competitor_name'], 
                data['offer_name']
            )
            
            data['deep_dive_analysis'] = analysis
            data['alert_level'] = "HIGH"
            
            blob.upload_from_string(
                data=json.dumps(data, indent=2),
                content_type='application/json'
            )
            print(f"Updated Report: {blob.name}")
            
        else:
            print(f"Skipping {data['zip_code']} (No trigger)")

if __name__ == "__main__":
    print("Starting Deep Research Investigator...")
    process_daily_reports()
    print("Investigation Complete.")