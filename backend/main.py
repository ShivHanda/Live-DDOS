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

API_KEY = os.getenv("LiveDDOS")

# --- GLOBAL MEMORY CACHE ---
# Ye last successful data ko RAM mein store karega
CACHE_STORE = {
    "data": [],
    "is_live": False
}

@app.get("/")
def read_root():
    return {"status": "System Operational"}

@app.get("/attacks")
def get_attacks():
    global CACHE_STORE
    
    url = "https://api.abuseipdb.com/api/v2/blacklist"
    # Limit thodi kam rakhte hain taaki jaldi exhaust na ho
    params = {'confidenceMinimum': '90', 'limit': '25'} 
    headers = {'Accept': 'application/json', 'Key': API_KEY}

    try:
        response = requests.get(url, headers=headers, params=params)
        
        # SCENARIO 1: API Limit Reached (429 Error)
        if response.status_code == 429:
            print("⚠️ Limit Reached. Serving Cached Data.")
            return {
                "status": "OFFLINE_REPLAY", 
                "data": CACHE_STORE["data"] # Purana data bhejo
            }

        # SCENARIO 2: Success (200 OK)
        if response.status_code == 200:
            raw_data = response.json().get('data', [])
            enriched_data = []
            
            # Sirf 10 IPs ko enrich karenge to save time & resources
            for item in raw_data[:10]:
                ip = item['ipAddress']
                try:
                    geo = requests.get(f"http://ip-api.com/json/{ip}", timeout=1).json()
                    if geo.get('status') == 'success':
                        enriched_data.append({
                            "ip": ip,
                            "lat": geo['lat'],
                            "lon": geo['lon'],
                            "country": geo['country'],
                            "city": geo['city']
                        })
                except:
                    continue
            
            # Agar naya data mila hai, to Cache update karo
            if enriched_data:
                CACHE_STORE["data"] = enriched_data
                CACHE_STORE["is_live"] = True
                
            return {"status": "LIVE", "data": enriched_data}
            
    except Exception as e:
        print(f"Error: {e}")
        # Agar koi aur error aaye, tab bhi cache use karo
        return {"status": "ERROR_REPLAY", "data": CACHE_STORE["data"]}

    return {"status": "UNKNOWN", "data": []}
