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
    "cached_data": [],           # Ab ye list lambi hoti jayegi (Accumulator)
    "last_api_call_time": 0,     
    "daily_usage_count": 0,      
    "last_reset_date": datetime.now().date() 
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
    return {
        "system": "Operational", 
        "checks_used": SYSTEM_STATE["daily_usage_count"],
        "total_cached_threats": len(SYSTEM_STATE["cached_data"])
    }

@app.get("/attacks")
def get_attacks():
    global SYSTEM_STATE
    
    # 1. RESET QUOTA & DATA IF NEW DAY
    current_date = datetime.now().date()
    if current_date > SYSTEM_STATE["last_reset_date"]:
        print("📅 New Day Detected! Wiping Old Cache & Resetting Quota.")
        SYSTEM_STATE["daily_usage_count"] = 0
        SYSTEM_STATE["cached_data"] = [] # Naya din, khali slate
        SYSTEM_STATE["last_reset_date"] = current_date

    # 2. CHECK COOLDOWN (3 Minutes)
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
        # Jab quota khatam, tab din bhar ka jama hua saara data dikhao
        data_to_show = SYSTEM_STATE["cached_data"] if SYSTEM_STATE["cached_data"] else generate_simulation()
        return {
            "status": "QUOTA_EXHAUSTED",
            "checks_left": 0,
            "data": data_to_show
        }

    # 4. FETCH FRESH DATA
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
                # --- LOGIC CHANGE: MERGE WITH EXISTING CACHE ---
                # Hum ek Dictionary use karenge taaki duplicate IPs save na ho
                
                # 1. Purana Data Dictionary mein dalo
                cache_map = {item['ip']: item for item in SYSTEM_STATE["cached_data"]}
                
                # 2. Naya Data Merge karo (Overwrite or Add)
                for item in enriched_data:
                    cache_map[item['ip']] = item
                
                # 3. Wapas List mein convert karke Save karo
                SYSTEM_STATE["cached_data"] = list(cache_map.values())
                
                # Update Counters
                SYSTEM_STATE["daily_usage_count"] += 1
                SYSTEM_STATE["last_api_call_time"] = time.time()
                
                return {
                    "status": "LIVE_FRESH", 
                    "checks_left": 5 - SYSTEM_STATE["daily_usage_count"],
                    "data": enriched_data # Return only FRESH data for notification, but next call will show all
                    # Note: Frontend will usually render whatever we send here. 
                    # If you want map to show ALL immediately, return SYSTEM_STATE["cached_data"] here instead of enriched_data.
                    # Let's return ALL accumulated data immediately:
                    "data": SYSTEM_STATE["cached_data"] 
                }
        
        elif response.status_code == 429:
            SYSTEM_STATE["daily_usage_count"] = 5 
            return {"status": "QUOTA_EXHAUSTED", "checks_left": 0, "data": SYSTEM_STATE["cached_data"]}

    except Exception as e:
        print(f"Error: {e}")

    return {
        "status": "ERROR_SIMULATION", 
        "checks_left": 5 - SYSTEM_STATE["daily_usage_count"],
        "data": SYSTEM_STATE["cached_data"] if SYSTEM_STATE["cached_data"] else generate_simulation()
    }
