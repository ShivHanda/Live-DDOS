import os
import requests
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Render dashboard Variable name should be: LiveDDOS
API_KEY = os.getenv("LiveDDOS")

@app.get("/")
def read_root():
    return {"message": "System Online. API Key Linked."}

@app.get("/attacks")
def get_attacks():
    # 1. AbuseIPDB se Blacklist uthana
    blacklist_url = "https://api.abuseipdb.com/api/v2/blacklist"
    params = {
        'confidenceMinimum': '90', 
        'limit': '52' 
    }
    headers = {
        'Accept': 'application/json',
        'Key': API_KEY
    }

    try:
        response = requests.get(blacklist_url, headers=headers, params=params)
        raw_data = response.json().get('data', [])
        
        enriched_data = []
        
        # 2. IP-API se batch processing (Free tier limitation ke wajah se hum pehle 40-50 IPs ka location nikalenge)
        # Kyunki har IP ke liye alag request bhejna backend slow kar dega
        for item in raw_data[:40]: 
            ip = item['ipAddress']
            try:
                # Direct IP-API call for Lat/Long
                geo = requests.get(f"http://ip-api.com/json/{ip}?fields=status,lat,lon,country,city", timeout=2).json()
                if geo.get('status') == 'success':
                    enriched_data.append({
                        "ip": ip,
                        "lat": geo['lat'],
                        "lon": geo['lon'],
                        "country": geo['country'],
                        "city": geo['city'],
                        "confidence": item.get('abuseConfidenceScore')
                    })
            except:
                continue # Agar koi IP fail ho jaye toh skip karo

        return enriched_data
        
    except Exception as e:
        return {"error": str(e)}
