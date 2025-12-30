const API_URL = 'https://live-ddos.onrender.com/attacks';

// --- NEON CONFIGURATION ---
const NEON_COLORS = [
    '#ff00ff', // Hot Pink
    '#00ffff', // Cyan
    '#00ff00', // Lime
    '#ffff00', // Yellow
    '#ff3333', // Red
    '#9d00ff'  // Electric Purple
];

let attackersPool = []; 

const world = Globe()
    (document.getElementById('globeViz'))
    .backgroundColor('#050505') 
    .globeImageUrl('//unpkg.com/three-globe/example/img/earth-dark.jpg')
    .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
    .atmosphereColor('#3a228a')
    .atmosphereAltitude(0.15)
    
    // --- 1. ARCS (Threads) ---
    .arcColor(d => d.arcColor)
    .arcDashLength(0.4)
    .arcDashGap(0.2)
    .arcDashAnimateTime(2000)
    .arcStroke(0.6)

    // --- 2. BEACONS (Solid Light Pillars) ---
    // Fix: PathData ko sahi se configure kiya hai
    .pathsData([]) 
    .pathPoints(d => d.coords)
    .pathColor(d => d.solidColor) // Solid Neon
    .pathDashLength(1)            // No gaps, solid beam
    .pathStroke(1.5)              // Thoda mota kiya
    .pathTransitionDuration(1000)

    // --- 3. CITY LABELS (Non-Overlapping) ---
    .labelsData([])
    .labelLat(d => d.lat) // Use Jittered Lat
    .labelLng(d => d.lon) // Use Jittered Lon
    .labelText(d => d.city)
    .labelSize(1.2)
    .labelDotRadius(0.8)  // Dot thoda bada kiya
    .labelColor(d => d.solidColor)
    .labelResolution(2)
    .labelAltitude(0.02)
    
    // No Dots (Beacons kaafi hain)
    .pointsData([]);

// Helper: Random Color
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];

function fetchData() {
    fetch(API_URL)
        .then(res => res.json())
        .then(response => {
            const statusEl = document.getElementById('feedStatus');
            const countEl = document.getElementById('threatCount');

            // UI Status
            if (response.status && response.status.includes('LIVE')) {
                statusEl.innerText = "LIVE FEED (CACHED)";
                statusEl.className = "status-badge live";
            } else {
                statusEl.innerText = "SIMULATION";
                statusEl.className = "status-badge replay";
            }

            if (response.data && response.data.length > 0) {
                const newData = response.data.map(ip => {
                    const neon = randomChoice(NEON_COLORS);
                    
                    // --- JITTER LOGIC (Anti-Overlap) ---
                    // Har attacker ko thoda sa random shift karo (-0.5 to +0.5 degrees)
                    // Isse Dublin ke 3 attackers alag-alag dikhenge
                    const jitterLat = ip.lat + (Math.random() - 0.5) * 2.0; 
                    const jitterLng = ip.lon + (Math.random() - 0.5) * 2.0;

                    // Fixed Target Logic
                    const targetLat = (Math.random() - 0.5) * 160;
                    const targetLng = (Math.random() - 0.5) * 360;

                    return {
                        city: ip.city,
                        lat: jitterLat,  // Jittered coordinate use karo
                        lon: jitterLng,  // Jittered coordinate use karo
                        
                        // Colors
                        arcColor: ['rgba(0,0,0,0)', neon], // Fade Effect
                        solidColor: neon,
                        
                        // Arc
                        startLat: jitterLat,
                        startLng: jitterLng,
                        endLat: targetLat,
                        endLng: targetLng,
                        
                        // Beacon (Vertical Pillar)
                        // Zameen (0.01) se Aasmaan (0.5) tak
                        coords: [
                            [jitterLat, jitterLng, 0.01],  
                            [jitterLat, jitterLng, 0.5]    
                        ]
                    };
                });

                attackersPool = newData;
                countEl.innerText = attackersPool.length;

                // Update Globe Layers
                world.arcsData(attackersPool);
                world.pathsData(attackersPool); // Beacons draw karega
                world.labelsData(attackersPool); // Labels draw karega
            }
        })
        .catch(err => console.error("API Error:", err));
}

// Init
fetchData();
setInterval(fetchData, 300000); 

// Rotation
world.controls().autoRotate = true;
world.controls().autoRotateSpeed = 0.5;
