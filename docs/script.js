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
    
    // --- 1. THREAD STYLE ARCS (Wapas Aa Gaye) ---
    .arcColor(d => d.arcColor) // Gradient color use karega
    .arcDashLength(0.4)
    .arcDashGap(0.2)           // Tight gap for thread look
    .arcDashAnimateTime(2000)
    .arcStroke(0.6)

    // --- 2. BEACONS (Solid Light Pillars) ---
    .pathsData([]) 
    .pathPoints(d => d.coords)
    .pathColor(d => d.solidColor) // Solid Neon color
    .pathDashLength(1)
    .pathStroke(1.2)
    .pathTransitionDuration(1000)

    // --- 3. CITY LABELS ---
    .labelsData([])
    .labelLat(d => d.lat)
    .labelLng(d => d.lon)
    .labelText(d => d.city)
    .labelSize(1.5)
    .labelDotRadius(0.5)
    .labelColor(d => d.solidColor) // Same color as beacon
    .labelResolution(2)
    .labelAltitude(0.02)
    
    // No Dots
    .pointsData([]);

// Helper: Random Color
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];

function fetchData() {
    fetch(API_URL)
        .then(res => res.json())
        .then(response => {
            const statusEl = document.getElementById('feedStatus');
            const countEl = document.getElementById('threatCount');

            // UI Status Update
            if (response.status && response.status.includes('LIVE')) {
                statusEl.innerText = "LIVE FEED";
                statusEl.className = "status-badge live";
            } else {
                statusEl.innerText = "SIMULATION / CACHED";
                statusEl.className = "status-badge replay";
            }

            if (response.data && response.data.length > 0) {
                const newData = response.data.map(ip => {
                    const neon = randomChoice(NEON_COLORS);
                    const sourceLat = ip.lat;
                    const sourceLng = ip.lon;
                    
                    // Fixed Random Target
                    const targetLat = (Math.random() - 0.5) * 160;
                    const targetLng = (Math.random() - 0.5) * 360;

                    return {
                        city: ip.city, 
                        lat: sourceLat, 
                        lon: sourceLng, 
                        
                        // --- COLORS ---
                        // Arc ke liye Gradient (Transparent -> Neon) - Thread Look
                        arcColor: ['rgba(0,0,0,0)', neon],
                        // Beacon aur Label ke liye Solid Neon
                        solidColor: neon,
                        
                        // Arc Config
                        startLat: sourceLat,
                        startLng: sourceLng,
                        endLat: targetLat,
                        endLng: targetLng,
                        
                        // Beacon Config (Pillar)
                        coords: [
                            [sourceLat, sourceLng, 0],    // Ground
                            [sourceLat, sourceLng, 0.4]   // Sky Height
                        ]
                    };
                });

                attackersPool = newData;
                countEl.innerText = attackersPool.length;

                // Update All Layers
                world.arcsData(attackersPool);
                world.pathsData(attackersPool);
                world.labelsData(attackersPool);
            }
        })
        .catch(err => console.error("API Error:", err));
}

// Init
fetchData();

// Check for updates every 5 minutes 
// (Backend khud 4h 45m tak cache serve karega, uske baad hi naya layega)
setInterval(fetchData, 300000); 

// Cinematic Rotation
world.controls().autoRotate = true;
world.controls().autoRotateSpeed = 0.5;
