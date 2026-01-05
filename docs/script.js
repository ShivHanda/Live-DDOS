const API_URL = 'https://live-ddos.onrender.com/attacks';

const NEON_COLORS = ['#ff00ff', '#00ffff', '#00ff00', '#ffff00', '#ff3333'];
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];

const world = Globe()
    (document.getElementById('globeViz'))
    .backgroundColor('#050505') 
    // Night Earth Texture (Jo aapko pasand aaya tha)
    .globeImageUrl('//unpkg.com/three-globe/example/img/earth-night.jpg') 
    .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
    .atmosphereColor('#3a228a')
    .atmosphereAltitude(0.12)
    
    // --- LAYERS CONFIGURATION ---
    // 1. Arcs (Lasers)
    .arcColor(d => d.arcColor)
    .arcDashLength(0.4)
    .arcDashGap(0.2)
    .arcDashAnimateTime(2000)
    .arcStroke(0.5)

    // 2. Beacons (Pillars)
    .pathsData([]) 
    .pathPoints(d => d.coords) 
    .pathColor(d => d.solidColor) 
    .pathDashLength(1) 
    .pathStroke(2.0) 
    .pathTransitionDuration(1000)

    // 3. Labels (City Names)
    .labelsData([]) 
    .labelLat(d => d.lat) 
    .labelLng(d => d.lon) 
    .labelText(d => d.city) 
    .labelSize(1.0) 
    .labelDotRadius(0.6) 
    .labelColor(d => d.solidColor) 
    .labelResolution(2) 
    .labelAltitude(d => d.labelAlt)
    
    // 4. No Dots (Clean look)
    .pointsData([]);

function fetchData() {
    fetch(API_URL)
        .then(res => res.json())
        .then(response => {
            const statusEl = document.getElementById('feedStatus');
            const countEl = document.getElementById('threatCount');
            const checksEl = document.getElementById('checksLeft');

            // --- 1. HANDLE SMART STATUS & CHECKS UI ---
            let checks = response.checks_left !== undefined ? response.checks_left : 0;
            
            // Check Counter Update
            if(checksEl) {
                checksEl.innerText = `${checks} / 5`;
                if(checks === 0) checksEl.style.color = "#ff3333"; // Red (Empty)
                else checksEl.style.color = "#00ff88"; // Green (Available)
            }

            // Status Badge Logic
            if (response.status === 'LIVE_FRESH') {
                statusEl.innerText = "LIVE (FRESH)";
                statusEl.className = "status-badge live";
            } else if (response.status === 'LIVE_COOLDOWN') {
                // Cooldown dikhana zaroori hai
                statusEl.innerText = `COOLDOWN (${response.next_check_in}s)`;
                statusEl.className = "status-badge cooldown";
            } else {
                statusEl.innerText = "CACHE / REPLAY";
                statusEl.className = "status-badge replay";
            }

            // --- 2. MAP VISUALIZATION LOGIC ---
            if (response.data && response.data.length > 0) {
                const processedData = response.data.map((ip) => {
                    const neon = randomChoice(NEON_COLORS);
                    const sourceLat = ip.lat;
                    const sourceLng = ip.lon;
                    
                    // Random Targets
                    const targetLat = (Math.random() - 0.5) * 160;
                    const targetLng = (Math.random() - 0.5) * 360;
                    
                    // Jitter for Label Altitude (Overlapping fix)
                    const randomLabelAlt = 0.01 + (Math.random() * 0.15);

                    return {
                        city: ip.city, 
                        lat: sourceLat, 
                        lon: sourceLng, 
                        labelAlt: randomLabelAlt,
                        
                        // Colors
                        arcColor: ['rgba(0,0,0,0)', neon], 
                        solidColor: neon,
                        
                        // Arcs
                        startLat: sourceLat, startLng: sourceLng, 
                        endLat: targetLat, endLng: targetLng,
                        
                        // Beacons
                        coords: [[sourceLat, sourceLng, 0], [sourceLat, sourceLng, 0.35]]
                    };
                });

                // --- 3. UNIQUE LABEL FILTERING (Aapka Purana Logic) ---
                const seenCities = new Set();
                const uniqueLabels = [];
                processedData.forEach(d => {
                    if (!seenCities.has(d.city)) {
                        seenCities.add(d.city);
                        uniqueLabels.push(d);
                    }
                });

                countEl.innerText = processedData.length;
                
                // Update Layers
                world.arcsData(processedData);
                world.pathsData(processedData);
                world.labelsData(uniqueLabels); // Sirf Unique Cities dikhayenge
            }
        })
        .catch(err => console.error("API Error:", err));
}

// Init
fetchData();

// Poll every 60 seconds (Backend handles the limits, UI needs updates)
setInterval(fetchData, 60000); 

world.controls().autoRotate = true;
world.controls().autoRotateSpeed = 0.6;
