# 🌍 Global Threat Intel | Live DDoS Map

![Project Status](https://img.shields.io/badge/Status-Live-success?style=for-the-badge)   
![Tech Stack](https://img.shields.io/badge/Stack-FastAPI%20%7C%20Three.js-blueviolet?style=for-the-badge)   
![Security](https://img.shields.io/badge/Intelligence-AbuseIPDB-red?style=for-the-badge)

> **A military-grade, real-time 3D visualization of global cyber attacks.** > This project monitors, analyzes, and visualizes high-confidence cyber threats (DDoS, Botnets, Brute Force) on an interactive 3D globe.

---

## 🖼️ Visual Preview

![Dashboard Preview](YOUR_SCREENSHOT_LINK_HERE)
*(https://raw.githubusercontent.com/ShivHanda/Live-DDOS/main/Live%20DDOS%20Attacks.png)*

---

## 🚀 Live Demo
**👉 [Click Here to View the Map](https://shivhanda.github.io/Live-DDOS/)**

---

## ⚡ Key Features

### 🌐 The "Glassmorphism" Frontend
* **Interactive 3D Globe:** Built with `Three.js` and `Globe.gl`, featuring a "Night Earth" topology.
* **Real-Time Arcs & Pins:** Visualizes attack vectors (Source -> Target) using neon-colored arcs and grounded location pins.
* **Smart UI:** A heads-up display (HUD) showing Live Status, Remaining Quota, and Threat Counts.

### 🧠 The "Intelligent" Backend
* **Smart Caching System:**
    * It doesn't just fetch data; it **accumulates** it.
    * Merges new attacks with existing cached data to build a comprehensive threat map throughout the day.
* **Quota Management:**
    * Strictly respects API limits (5 requests/day).
    * Implements a **Cool-down Timer** (3 mins) to prevent spamming.
    * Automatically switches to **"Cached Replay Mode"** when the daily quota is exhausted.
* **Fail-Safe Simulation:**
    * If the API key is missing or the server is cold-booting, the system seamlessly falls back to a **Math-Based Simulation Mode**, ensuring the map is *never* empty.

---

## 🛠️ How It Works (The Logic)

1.  **The Trigger:** The frontend polls the backend every 60 seconds.
2.  **The Decision Engine (Backend):**
    * **Is it a new day?** -> Reset Quota & Cache.
    * **Is quota available?** -> Fetch fresh data from **AbuseIPDB** -> Enrich with **IP-API** (Geolocation) -> Append to Cache.
    * **Is quota empty?** -> Serve the accumulated "Replay" data from RAM.
3.  **The Visualization:**
    * The frontend receives the JSON payload.
    * It maps IPs to Geocoordinates (Lat/Lon).
    * It renders **3D Arcs** (Attack Trajectories) and **Pins** (City Locations) dynamically.

---

## 📂 Repository Structure

```bash
├── 📂 backend/         # The Brain (FastAPI Server)
│   ├── main.py         # Handles API logic, Caching, and Rate Limiting
│   └── requirements.txt
│
├── 📂 docs/            # The Face (Frontend hosted on GitHub Pages)
│   ├── index.html      # The Glassmorphism Dashboard
│   ├── script.js       # Three.js Logic & Data Fetching
│   └── ...
│
└── README.md           # You are here
