import os
import json
from datetime import datetime
from google import genai
from google.genai import types
from google.cloud import storage

def run_prospecting_job():
    # Configuration from environment variables
    PROJECT_ID = os.environ.get("PROJECT_ID")
    BUCKET_NAME = os.environ.get("BUCKET_NAME")
    
    if not PROJECT_ID or not BUCKET_NAME:
        raise ValueError("PROJECT_ID and BUCKET_NAME must be set")
    
    print(f"Starting Le Marais Intelligence Job for project: {PROJECT_ID}")
    
    try:
        # Initialize Gemini client
        client = genai.Client(
            vertexai=True,
            project=PROJECT_ID,
            location="us-central1"
        )
        
        storage_client = storage.Client()
        
        # Configure Google Search tool
        google_search_tool = types.Tool(
            google_search=types.GoogleSearch()
        )
        
        # PASS 1: Research with Gemini Pro (with Google Search, no JSON)
        research_config = types.GenerateContentConfig(
            temperature=1.0,
            tools=[google_search_tool]
        )
        
        research_prompt = """
        Search the web broadly to find real, named individuals from Private Equity firms who have 
        publicly spoken, written, or been quoted about AI — including AI adoption, AI complexity, 
        AI strategy, AI ROI, AI risk, or AI transformation within their portfolio companies.

        Cast a very wide net. Search across ALL of the following source types:

        NEWS & FINANCIAL MEDIA:
        - Bloomberg, Reuters, WSJ, Financial Times, Fortune, Forbes, Axios, Business Insider
        - Search: "private equity" "artificial intelligence" OR "AI" quote OR interview OR said

        PE INDUSTRY PUBLICATIONS:
        - pehub.com, pitchbook.com, privateequityinternational.com, mergermarket.com, 
          buyoutsinsider.com, altassets.net, pewin.com, privatedebtinvestor.com
        - Search: PE firm name + AI + executive quote

        PE FIRM WEBSITES & BLOGS:
        - Major PE firms (KKR, Blackstone, Apollo, Carlyle, Warburg Pincus, TPG, Vista Equity, 
          Thoma Bravo, Francisco Partners, General Atlantic, Silver Lake, Bain Capital, 
          Advent International, CVC Capital, EQT, Apax, BC Partners, Leonard Green, 
          Platinum Equity, Genstar, Audax, GTCR, Berkshire Partners) publish thought leadership, 
          articles, and interviews on their websites — search each for AI content
        - Search: site:kkr.com AI OR site:blackstone.com AI OR site:apolloglobal.com AI

        CONFERENCES & EVENTS:
        - SuperReturn, IPEM, PEI CFOs & COOs Forum, ACG, iGlobal Forum, Milken Institute, 
          Davos, SkyBridge SALT conference transcripts and recaps
        - Search: "superreturn" OR "PE conference" AI panel speaker 2024 OR 2025

        PODCASTS & VIDEO:
        - Search for transcripts or recaps of: "The Deal", "Private Equity Podcast", 
          "Invest Like the Best", "Capital Allocators", "PE Perspectives", "Masters in Business"
        - Search: private equity AI podcast interview 2024 OR 2025

        PRESS RELEASES & ANNOUNCEMENTS:
        - PE firms announcing AI initiatives, hiring AI executives, or publishing AI strategies
        - Search: "private equity firm" announces AI strategy OR "AI operating partner" appointed

        For EACH real person found, record:
        - Full name (only real, verifiable individuals — never fabricate)
        - PE firm name
        - Job title
        - What they specifically said or wrote about AI (direct quote or close paraphrase)
        - Source URL or publication and date
        - The business challenge or opportunity they were describing

        Aim for 20 individuals. Return everyone you can verify with a real source.
        Do NOT include anyone without a confirmed name and firm.
        """

        print("PASS 1: Deep research with Gemini 2.5 Pro + Google Search...")
        research_response = client.models.generate_content(
            model="gemini-2.5-pro",
            contents=research_prompt,
            config=research_config
        )
        
        research_text = research_response.text
        print(f"Research completed. Length: {len(research_text)} characters")
        
        # Log Pass 1 output to GCS for debugging
        bucket = storage_client.bucket(BUCKET_NAME)
        debug_blob = bucket.blob("debug/last_research_pass.txt")
        debug_blob.upload_from_string(research_text, content_type='text/plain')
        print(f"Pass 1 output saved to gs://{BUCKET_NAME}/debug/last_research_pass.txt")
        
        # PASS 2: Format as JSON with Flash (no Google Search, with JSON output)
        formatting_config = types.GenerateContentConfig(
            temperature=0.1,
            top_p=0.8,
            top_k=40,
            max_output_tokens=8192,
            response_mime_type="application/json"
        )
        
        formatting_prompt = f"""
        Based on this research, create a structured JSON output with exactly 20 leads.
        
        RESEARCH FINDINGS:
        {research_text}
        
        Return valid JSON in this exact format:
        {{
          "leads": [
            {{
              "name": "Full name",
              "firm": "PE firm or portfolio company name", 
              "role": "Job title",
              "ai_thesis": "Their specific perspective on AI complexity (1-2 sentences)",
              "build_opportunity": "Potential engagement area for AI consulting based on their stated challenge (1 sentence)",
              "linkedin_request": "Personalized connection request message referencing their specific content or quote (2-3 sentences)"
            }}
          ]
        }}
        
        Create compelling, personalized linkedin_request messages that reference their actual 
        posts, quotes, or talks. Only include leads where a real name and firm were found in 
        the research. Do NOT pad with "Data Not Available" entries — return only real leads, 
        even if fewer than 20.
        """

        print("PASS 2: Formatting with Gemini 2.5 Pro...")
        format_response = client.models.generate_content(
            model="gemini-2.5-pro",
            contents=formatting_prompt,
            config=formatting_config
        )

        # Extract text response
        response_text = format_response.text.strip()
        print(f"Formatting completed. Length: {len(response_text)} characters")
        
        # Parse JSON (should be clean since we used response_mime_type)
        if response_text.startswith('```json'):
            response_text = response_text.replace('```json', '').replace('```', '').strip()
        elif response_text.startswith('```'):
            response_text = response_text.replace('```', '').strip()
        
        leads_data = json.loads(response_text)
        
        lead_count = len(leads_data.get("leads", []))
        print(f"Found {lead_count} leads")
        
        if lead_count == 0:
            print("WARNING: No leads found in this run")
        
        # Add metadata
        output_data = {
            "generated_at": datetime.utcnow().isoformat(),
            "lead_count": lead_count,
            "data": leads_data
        }

        # Save to GCS with timestamp
        bucket = storage_client.bucket(BUCKET_NAME)
        
        # Save as latest
        blob = bucket.blob("daily_leads.json")
        blob.upload_from_string(
            json.dumps(output_data, indent=2), 
            content_type='application/json'
        )
        
        # Archive with timestamp
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        archive_blob = bucket.blob(f"archive/leads_{timestamp}.json")
        archive_blob.upload_from_string(
            json.dumps(output_data, indent=2),
            content_type='application/json'
        )
        
        print(f"Successfully saved to gs://{BUCKET_NAME}/daily_leads.json")
        print(f"Archived to gs://{BUCKET_NAME}/archive/leads_{timestamp}.json")
        
        return output_data
        
    except json.JSONDecodeError as e:
        print(f"ERROR: Failed to parse JSON response: {e}")
        print(f"Raw response: {response_text[:500]}...")
        raise
    except Exception as e:
        print(f"ERROR: Job failed: {e}")
        raise

if __name__ == "__main__":
    run_prospecting_job()