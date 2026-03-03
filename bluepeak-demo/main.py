import os
import json
import datetime
import time
from google.cloud import storage
from google import genai
from google.genai.types import Tool, GenerateContentConfig, GoogleSearch

# Configuration
PROJECT_ID = os.environ.get("GOOGLE_CLOUD_PROJECT")
REGION = "us-central1"
BUCKET_NAME = "bluepeak-market-intelligence"

# Initialize Clients
storage_client = storage.Client()
client = genai.Client(vertexai=True, project=PROJECT_ID, location=REGION)

def get_target_zips():
    """Fetch list of zip codes from local text file."""
    try:
        with open('zipcodes.txt', 'r') as f:
            return [line.strip() for line in f if line.strip()]
    except FileNotFoundError:
        print("Error: zipcodes.txt not found.")
        return []

def search_market(zip_code):
    """Step 1: Search and gather intelligence in natural language."""
    
    google_search_tool = Tool(
        google_search=GoogleSearch()
    )

    prompt = f"""
    You are a competitive intelligence analyst for BluePeak, a fiber optic internet service provider.
    
    Research residential fiber internet offers currently available in ZIP code {zip_code}.
    
    TARGET COMPETITORS (search in priority order):
    1. AT&T Fiber
    2. Comcast/Xfinity
    3. Verizon Fios
    4. CenturyLink/Lumen Fiber
    5. Frontier Fiber
    6. Google Fiber
    7. Metronet
    8. Ziply Fiber
    9. Brightspeed
    10. Other local fiber providers
    
    FOR EACH COMPETITOR YOU FIND, gather:
    - Plan names and speed tiers (300 Mbps, 500 Mbps, 1 Gig, 2 Gig, 5 Gig, etc.)
    - Current promotional pricinging after p
    - Regular pricromotions
    - Special offers (free installation, gift cards, price locks, etc.)
    - Contract requirements
    - Installation fees
    - Equipment fees
    - Source URLs
    
    Write a detailed report covering all offers you find. Be specific about prices, speeds, and terms.
    If you can't find any competitive fiber offers in this zip code, say so clearly.
    """
    
    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash-exp",
            contents=prompt,
            config=GenerateContentConfig(
                tools=[google_search_tool],
                temperature=0.2
            )
        )
        
        if not response.text:
            print(f"  -> No search results for {zip_code}")
            return None
        
        print(f"  -> ✓ Gathered intelligence ({len(response.text)} chars)")
        return response.text
        
    except Exception as e:
        print(f"  -> ❌ Search failed for {zip_code}: {str(e)}")
        return None

def structure_data(intelligence_report, zip_code):
    """Step 2: Convert natural language intelligence into structured JSON."""
    
    prompt = f"""
    Convert the following competitive intelligence report into structured JSON.
    
    INTELLIGENCE REPORT:
    {intelligence_report}
    
    Extract ALL competitor offers mentioned and return a JSON array following this EXACT structure:
    [
        {{
            "competitor_name": "Company Name",
            "offer_name": "Plan Name",
            "price": 55.00,
            "speed_mbps": 1000,
            "promo_details": "Detailed promo terms",
            "contract_required": false,
            "installation_fee": 0,
            "equipment_fee": 0,
            "source_url": "https://...",
            "verified_available": true
        }}
    ]
    
    RULES:
    - Extract every offer mentioned in the report
    - Use numeric values for price, speed_mbps, and fees (not strings)
    - If a value is not mentioned, use: 0 for fees, false for booleans, "Not specified" for strings
    - If NO offers were found, return: [{{"error": "No competitive offers found in zip {zip_code}"}}]
    - Return ONLY the JSON array, nothing else
    """
    
    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash-exp",
            contents=prompt,
            config=GenerateContentConfig(
                temperature=0.1
            )
        )
        
        if not response.text:
            print(f"  -> No structured output for {zip_code}")
            return None
        
        # Clean and parse JSON
        json_text = response.text.strip()
        # Remove markdown if present
        if json_text.startswith("```"):
            json_text = json_text.split("```")[1]
            if json_text.startswith("json"):
                json_text = json_text[4:]
            json_text = json_text.strip()
        
        data = json.loads(json_text)
        print(f"  -> ✓ Structured {len(data) if isinstance(data, list) else 1} offer(s)")
        
        # Ensure we have a list
        if isinstance(data, dict):
            data = [data]
        
        # Filter out errors
        valid_offers = [
            offer for offer in data 
            if isinstance(offer, dict) and "error" not in offer
        ]
        
        if not valid_offers:
            print(f"  -> No valid offers in structured data")
            return None
        
        # Add metadata
        for offer in valid_offers:
            offer['zip_code'] = zip_code
            offer['scraped_at'] = datetime.datetime.utcnow().isoformat()
        
        return valid_offers
        
    except json.JSONDecodeError as e:
        print(f"  -> ❌ JSON parse error: {str(e)}")
        print(f"  -> Response was: {response.text[:200]}")
        return None
    except Exception as e:
        print(f"  -> ❌ Structuring failed: {str(e)}")
        return None

def analyze_market(zip_code):
    """Main analysis: Search then structure."""
    
    # Step 1: Search and gather intelligence
    intelligence = search_market(zip_code)
    if not intelligence:
        return None
    
    # Step 2: Structure the intelligence into JSON
    offers = structure_data(intelligence, zip_code)
    return offers

def save_zip_report(offers, zip_code):
    """Saves competitive intelligence report for a zip code to GCS."""
    if not offers: 
        print(f"  -> Skipping save for {zip_code}: No data")
        return False
    
    try:
        date_str = datetime.datetime.utcnow().strftime("%Y-%m-%d")
        filename = f"{date_str}/{zip_code}.json"
        
        # Create a structured report
        report = {
            "zip_code": zip_code,
            "scraped_at": datetime.datetime.utcnow().isoformat(),
            "total_offers_found": len(offers),
            "competitors_found": list(set(offer.get("competitor_name") for offer in offers)),
            "offers": offers
        }
        
        bucket = storage_client.bucket(BUCKET_NAME)
        blob = bucket.blob(filename)
        
        blob.upload_from_string(
            data=json.dumps(report, indent=2),
            content_type='application/json'
        )
        print(f"  ✓✓ Saved {len(offers)} offer(s): gs://{BUCKET_NAME}/{filename}")
        return True
        
    except Exception as e:
        print(f"  -> ❌ Failed to save {zip_code}: {str(e)}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("BluePeak Competitive Intelligence Job (Scout)")
    print("=" * 60)
    
    zips = get_target_zips()
    print(f"\nFound {len(zips)} zip codes to analyze.\n")
    
    successful = 0
    failed = 0
    
    for i, zip_code in enumerate(zips, 1):
        print(f"\n[{i}/{len(zips)}] Processing {zip_code}...")
        
        offers = analyze_market(zip_code)
        
        if offers:
            if save_zip_report(offers, zip_code):
                successful += 1
            else:
                failed += 1
        else:
            failed += 1
        
        # Sleep to avoid hitting API rate limits
        time.sleep(3)  # Slightly longer since we're making 2 API calls per zip
    
    print("\n" + "=" * 60)
    print(f"Job Complete!")
    print(f"✓ Successfully processed: {successful}")
    print(f"✗ Failed/No data: {failed}")
    print("=" * 60)