import os
import time
import random
import requests
from datetime import datetime
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

# --- SMART STATE STORE ---
SYSTEM_STATE = {
    "cached_data": [],           # Store IP data
    "last_api_call_time": 0,     # Timestamp of last fresh fetch
    "daily_usage_count": 0,      # How many times fetched today
    "last_reset_date": datetime.now().date() # To reset count daily
}

# --- SIMULATION FALLBACK ---
def generate_simulation():
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

@app.api_route("/", methods=["GET", "HEAD"])
def read_root():
    return {"system": "Operational", "checks_used": SYSTEM_STATE["daily_usage_count"]}

@app.get("/attacks")
def get_attacks():
    global SYSTEM_STATE
    
    # 1. RESET QUOTA IF NEW DAY
    current_date = datetime.now().date()
    if current_date > SYSTEM_STATE["last_reset_date"]:
        print("📅 New Day Detected! Resetting Quota.")
        SYSTEM_STATE["daily_usage_count"] = 0
        SYSTEM_STATE["last_reset_date"] = current_date

    # 2. CHECK COOLDOWN (3 Minutes = 180 Seconds)
    # Agar abhi fresh data liya tha, to 3 min tak wahi dikhao
    time_since_last = time.time() - SYSTEM_STATE["last_api_call_time"]
    if SYSTEM_STATE["cached_data"] and time_since_last < 180:
        return {
            "status": "LIVE_COOLDOWN", 
            "checks_left": 5 - SYSTEM_STATE["daily_usage_count"],
            "next_check_in": int(180 - time_since_last),
            "data": SYSTEM_STATE["cached_data"]
        }

    # 3. CHECK QUOTA EXHAUSTION
    if SYSTEM_STATE["daily_usage_count"] >= 5:
        return {
            "status": "QUOTA_EXHAUSTED",
            "checks_left": 0,
            "data": SYSTEM_STATE["cached_data"] if SYSTEM_STATE["cached_data"] else generate_simulation()
        }

    # 4. FETCH FRESH DATA (Consumes 1 Credit)
    if not API_KEY:
        return {"status": "SIMULATION_NO_KEY", "checks_left": 5, "data": generate_simulation()}

    print(f"🔄 Fetching Live Data... (Attempt {SYSTEM_STATE['daily_usage_count'] + 1}/5)")
    
    url = "https://api.abuseipdb.com/api/v2/blacklist"
    params = {'confidenceMinimum': '90', 'limit': '50'}
    headers = {'Accept': 'application/json', 'Key': API_KEY}

    try:
        response = requests.get(url, headers=headers, params=params)
        
        if response.status_code == 200:
            raw_data = response.json().get('data', [])
            enriched_data = []
            
            # Processing Top 45 IPs
            for item in raw_data[:45]:
                ip = item['ipAddress']
                try:
                    geo = requests.get(f"http://ip-api.com/json/{ip}", timeout=1.5).json()
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
            
            if enriched_data:
                # Update State
                SYSTEM_STATE["cached_data"] = enriched_data
                SYSTEM_STATE["daily_usage_count"] += 1
                SYSTEM_STATE["last_api_call_time"] = time.time()
                
                return {
                    "status": "LIVE_FRESH", 
                    "checks_left": 5 - SYSTEM_STATE["daily_usage_count"],
                    "data": enriched_data
                }
        
        elif response.status_code == 429:
            # Agar API ne mana kar diya
            SYSTEM_STATE["daily_usage_count"] = 5 # Mark as exhausted
            return {"status": "QUOTA_EXHAUSTED", "checks_left": 0, "data": SYSTEM_STATE["cached_data"]}

    except Exception as e:
        print(f"Error: {e}")

    # Fallback
    return {
        "status": "ERROR_SIMULATION", 
        "checks_left": 5 - SYSTEM_STATE["daily_usage_count"],
        "data": SYSTEM_STATE["cached_data"] if SYSTEM_STATE["cached_data"] else generate_simulation()
    }
