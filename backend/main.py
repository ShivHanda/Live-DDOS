import os
import requests
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Variable name must match Render Dashboard exactly
API_KEY = os.getenv("LiveDDOS")

@app.get("/")
def read_root():
    return {"status": "Online", "key_loaded": bool(API_KEY)}

@app.get("/attacks")
def get_attacks():
    if not API_KEY:
        return {"error": "API Key missing in Render Environment Variables"}

    blacklist_url = "https://api.abuseipdb.com/api/v2/blacklist"
    
    # Hume data chahiye hi chahiye, isliye confidence thoda kam (75) aur limit 50
    params = {'confidenceMinimum': '75', 'limit': '50'}
    headers = {'Accept': 'application/json', 'Key': API_KEY}

    try:
        response = requests.get(blacklist_url, headers=headers, params=params)
        
        # Debugging: Print status code to Render Logs
        print(f"AbuseIPDB Status: {response.status_code}")
        
        raw_data = response.json().get('data', [])
        
        if not raw_data:
            return {"message": "No attacks found at this confidence level", "raw": response.json()}

        enriched_data = []
        # Pehle 15 IPs ka location nikalte hain taaki speed bani rahe
        for item in raw_data[:15]:
            ip = item['ipAddress']
            try:
                # Fields check: lat, lon, country, city
                geo = requests.get(f"http://ip-api.com/json/{ip}", timeout=1.5).json()
                if geo.get('status') == 'success':
                    enriched_data.append({
                        "ip": ip,
                        "lat": geo.get('lat'),
                        "lon": geo.get('lon'),
                        "country": geo.get('country'),
                        "city": geo.get('city')
                    })
            except:
                continue

        return enriched_data

    except Exception as e:
        return {"error": str(e)}
