import os
import time
import random
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

# --- SMART CACHE STORAGE ---
CACHE_STORE = {
    "data": [],
    "last_updated": 0,  
    "status_label": "INIT"
}

# --- FALLBACK SIMULATION ---
def generate_simulation():
    # Sirf tab chalega jab system start ho aur cache khali ho
    hubs = [
        {"city": "Beijing", "country": "CN", "lat": 39.90, "lon": 116.40},
        {"city": "Moscow", "country": "RU", "lat": 55.75, "lon": 37.61},
        {"city": "Lagos", "country": "NG", "lat": 6.52, "lon": 3.37},
        {"city": "New York", "country": "US", "lat": 40.71, "lon": -74.00},
        {"city": "Tokyo", "country": "JP", "lat": 35.67, "lon": 139.65}
    ]
    mock_data = []
    for _ in range(15):
        hub = random.choice(hubs)
        mock_data.append({
            "ip": f"192.168.{random.randint(10,99)}.{random.randint(1,255)}",
            "lat": hub['lat'] + random.uniform(-1, 1),
            "lon": hub['lon'] + random.uniform(-1, 1),
            "city": hub['city'],
            "country": hub['country']
        })
    return mock_data

@app.get("/", methods=["GET", "HEAD"])
def read_root():
    return {"system": "Operational", "mode": CACHE_STORE["status_label"]}

@app.get("/attacks")
def get_attacks():
    global CACHE_STORE
    current_time = time.time()
    
    # 1. TIME CHECK: 4 Hours 45 Minutes (17100 Seconds)
    # Agar abhi 4h 45m nahi hue hain, to Cache use karo.
    if CACHE_STORE["data"] and (current_time - CACHE_STORE["last_updated"] < 17100):
        print("⚡ Serving from Cache (Next update in few hours)")
        return {"status": "LIVE_CACHED", "data": CACHE_STORE["data"]}

    # 2. FETCH NEW DATA (Jab time poora ho jaye)
    if not API_KEY:
        return {"status": "SIMULATION_NO_KEY", "data": generate_simulation()}

    print("🔄 Time expired. Fetching fresh data from AbuseIPDB...")
    url = "https://api.abuseipdb.com/api/v2/blacklist"
    params = {'confidenceMinimum': '90', 'limit': '50'}
    headers = {'Accept': 'application/json', 'Key': API_KEY}

    try:
        response = requests.get(url, headers=headers, params=params)
        
        # Handle Limit Exhaustion (429)
        if response.status_code == 429:
            print("⚠️ API Limit Hit. Replaying Cache.")
            if CACHE_STORE["data"]:
                return {"status": "LIMIT_EXHAUSTED_REPLAY", "data": CACHE_STORE["data"]}
            return {"status": "SIMULATION_FALLBACK", "data": generate_simulation()}

        # Success (200)
        if response.status_code == 200:
            raw_data = response.json().get('data', [])
            enriched_data = []
            
            # Enrich Data
            for item in raw_data[:15]:
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
            
            # Update Cache
            if enriched_data:
                CACHE_STORE["data"] = enriched_data
                CACHE_STORE["last_updated"] = current_time
                CACHE_STORE["status_label"] = "LIVE_FRESH"
                return {"status": "LIVE_FRESH", "data": enriched_data}
            
    except Exception as e:
        print(f"Error: {e}")

    # Fallback
    if CACHE_STORE["data"]:
         return {"status": "ERROR_REPLAY", "data": CACHE_STORE["data"]}
         
    return {"status": "ERROR_SIMULATION", "data": generate_simulation()}
