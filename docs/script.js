const API_URL = 'https://live-ddos.onrender.com/attacks';

// Neon Colors Palette
const NEON_COLORS = ['#ff00ff', '#00ffff', '#00ff00', '#ffff00', '#ff3333'];
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];

const world = Globe()
    (document.getElementById('globeViz'))
    .backgroundColor('#050505') 
    .globeImageUrl('//unpkg.com/three-globe/example/img/earth-night.jpg') 
    .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
    .atmosphereColor('#3a228a')
    .atmosphereAltitude(0.12)
    
    // --- LAYERS ---
    
    // 1. Arcs (Lasers)
    .arcColor(d => d.arcColor)
    .arcDashLength(0.4)
    .arcDashGap(0.2)
    .arcDashAnimateTime(2000)
    .arcStroke(0.5)

    // 2. Beacons (Ab ye "Map Pins" ki sticks ban gayi hain)
    .pathsData([]) 
    .pathPoints(d => d.coords) 
    .pathColor(d => d.solidColor) 
    .pathDashLength(1) 
    .pathStroke(1.5) // Thoda patla kiya taaki elegant lage
    .pathTransitionDuration(1000)

    // 3. Labels (City Names - Ab Zameen ke paas)
    .labelsData([]) 
    .labelLat(d => d.lat) 
    .labelLng(d => d.lon) 
    .labelText(d => d.city) 
    .labelSize(0.8) // Font thoda chota for clean look
    .labelDotRadius(0.4) 
    .labelColor(d => d.solidColor) 
    .labelResolution(2) 
    .labelAltitude(d => d.labelAlt) // Calculated low altitude
    
    // 4. Surface Dots (Zameen par nishan)
    .pointsData([])
    .pointLat(d => d.lat)
    .pointLng(d => d.lon)
    .pointColor(d => d.solidColor)
    .pointAltitude(0) // Bilkul zameen par
    .pointRadius(0.3); // Chota sa dot

function fetchData() {
    fetch(API_URL)
        .then(res => res.json())
        .then(response => {
            const statusEl = document.getElementById('feedStatus');
            const countEl = document.getElementById('threatCount');
            const checksEl = document.getElementById('checksLeft');

            // --- UI Updates ---
            let checks = response.checks_left !== undefined ? response.checks_left : 0;
            if(checksEl) {
                checksEl.innerText = `${checks} / 5`;
                checksEl.style.color = checks === 0 ? "#ff3333" : "#00ff88";
            }

            if (response.status === 'LIVE_FRESH') {
                statusEl.innerText = "LIVE (FRESH)";
                statusEl.className = "status-badge live";
            } else if (response.status === 'LIVE_COOLDOWN') {
                statusEl.innerText = `COOLDOWN (${response.next_check_in}s)`;
                statusEl.className = "status-badge cooldown";
            } else {
                statusEl.innerText = "CACHE / REPLAY";
                statusEl.className = "status-badge replay";
            }

            // --- Visual Logic ---
            if (response.data && response.data.length > 0) {
                const processedData = response.data.map((ip) => {
                    const neon = randomChoice(NEON_COLORS);
                    const sourceLat = ip.lat;
                    const sourceLng = ip.lon;
                    
                    // Target Logic
                    const targetLat = (Math.random() - 0.5) * 160;
                    const targetLng = (Math.random() - 0.5) * 360;
                    
                    // --- HEIGHT FIX: GRAVITY APPLIED ---
                    // Pehle ye 0.01 + 0.15 tha (Bahut uncha)
                    // Ab ye 0.02 + 0.04 hai (Zameen ke kareeb, bas overlap bachane ke liye thoda variation)
                    const labelHeight = 0.02 + (Math.random() * 0.04); 

                    return {
                        city: ip.city, 
                        lat: sourceLat, 
                        lon: sourceLng, 
                        labelAlt: labelHeight, // Text height
                        
                        arcColor: ['rgba(0,0,0,0)', neon], 
                        solidColor: neon,
                        
                        startLat: sourceLat, startLng: sourceLng, 
                        endLat: targetLat, endLng: targetLng,
                        
                        // Beacon Stick (Zameen se Label tak)
                        // [Lat, Lon, 0] se [Lat, Lon, labelHeight] tak line
                        coords: [[sourceLat, sourceLng, 0], [sourceLat, sourceLng, labelHeight]]
                    };
                });

                // Deduplicate for Labels & Dots
                const seenCities = new Set();
                const uniqueLocations = [];
                processedData.forEach(d => {
                    if (!seenCities.has(d.city)) {
                        seenCities.add(d.city);
                        uniqueLocations.push(d);
                    }
                });

                countEl.innerText = processedData.length;
                
                world.arcsData(processedData);    // Arcs (Hawa mein)
                world.pathsData(uniqueLocations); // Pins (Zameen se juday hue)
                world.labelsData(uniqueLabels);   // Text (Pin ke upar)
                world.pointsData(uniqueLocations);// Dot (Zameen par)
            }
        })
        .catch(err => console.error("API Error:", err));
}

fetchData();
setInterval(fetchData, 60000); 

world.controls().autoRotate = true;
world.controls().autoRotateSpeed = 0.6;
