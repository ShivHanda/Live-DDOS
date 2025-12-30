const API_URL = 'https://live-ddos.onrender.com/attacks';

const NEON_COLORS = ['#ff00ff', '#00ffff', '#00ff00', '#ffff00', '#ff3333'];

// Helper: Random Color
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Hum do alag list maintain karenge
let attackersPool = [];   // Isme saare attacks honge (Beacons/Arcs ke liye)
let uniqueLabels = [];    // Isme sirf unique cities hongi (Text ke liye)

const world = Globe()
    (document.getElementById('globeViz'))
    .backgroundColor('#050505') 
    .globeImageUrl('//unpkg.com/three-globe/example/img/earth-dark.jpg')
    .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
    .atmosphereColor('#3a228a')
    .atmosphereAltitude(0.15)
    
    // --- 1. ARCS (Show ALL attacks) ---
    .arcColor(d => d.arcColor)
    .arcDashLength(0.4)
    .arcDashGap(0.2)
    .arcDashAnimateTime(2000)
    .arcStroke(0.5)

    // --- 2. BEACONS (Show ALL beacons) ---
    .pathsData([]) 
    .pathPoints(d => d.coords)
    .pathColor(d => d.solidColor)
    .pathDashLength(1)
    .pathStroke(2.0)
    .pathTransitionDuration(1000)

    // --- 3. LABELS (Show ONLY Unique Cities) ---
    // Note: Hum yahan 'uniqueLabels' use karenge
    .labelsData([])
    .labelLat(d => d.lat)
    .labelLng(d => d.lon)
    .labelText(d => d.city)
    .labelSize(1.0)
    .labelDotRadius(0.6)
    .labelColor(() => '#ffffff') // Labels white rahenge taaki saaf dikhein
    .labelResolution(2)
    .labelAltitude(0.02)
    
    .pointsData([]);

function fetchData() {
    fetch(API_URL)
        .then(res => res.json())
        .then(response => {
            const statusEl = document.getElementById('feedStatus');
            const countEl = document.getElementById('threatCount');

            if (response.status && response.status.includes('LIVE')) {
                statusEl.innerText = "LIVE FEED";
                statusEl.className = "status-badge live";
            } else {
                statusEl.innerText = "SIMULATION";
                statusEl.className = "status-badge replay";
            }

            if (response.data && response.data.length > 0) {
                
                // 1. Process All Attacks (Arcs & Beacons)
                const newAttacks = response.data.map(ip => {
                    const neon = randomChoice(NEON_COLORS);
                    const sourceLat = ip.lat;
                    const sourceLng = ip.lon;
                    
                    // Har attack ka alag target
                    const targetLat = (Math.random() - 0.5) * 160;
                    const targetLng = (Math.random() - 0.5) * 360;

                    return {
                        // Coordinates
                        lat: sourceLat,
                        lon: sourceLng,
                        
                        // Visuals
                        arcColor: ['rgba(0,0,0,0)', neon],
                        solidColor: neon,
                        
                        // Arc Logic
                        startLat: sourceLat,
                        startLng: sourceLng,
                        endLat: targetLat,
                        endLng: targetLng,
                        
                        // Beacon Logic (Pillar)
                        coords: [
                            [sourceLat, sourceLng, 0],
                            [sourceLat, sourceLng, 0.35]
                        ]
                    };
                });

                // 2. Process Unique Labels
                // Hum ek temporary Set use karenge duplicate cities hatane ke liye
                const seenCities = new Set();
                const newLabels = [];

                response.data.forEach(ip => {
                    // Agar ye city pehle nahi dekhi, to add karo
                    if (!seenCities.has(ip.city)) {
                        seenCities.add(ip.city);
                        newLabels.push({
                            city: ip.city,
                            lat: ip.lat,
                            lon: ip.lon
                        });
                    }
                });

                attackersPool = newAttacks;
                uniqueLabels = newLabels; // Update global variable

                countEl.innerText = attackersPool.length;

                // Update Visuals
                world.arcsData(attackersPool);   // 5 attacks = 5 lines
                world.pathsData(attackersPool);  // 5 attacks = 5 beacons
                world.labelsData(uniqueLabels);  // 5 attacks from Moscow = 1 Label
            }
        })
        .catch(err => console.error("API Error:", err));
}

// Init
fetchData();
setInterval(fetchData, 300000); 

world.controls().autoRotate = true;
world.controls().autoRotateSpeed = 0.6;
