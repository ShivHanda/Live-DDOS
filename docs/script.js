const API_URL = 'https://live-ddos.onrender.com/attacks';

// --- CONFIGURATION ---
const NEON_COLORS = [
    '#ff00ff', // Hot Pink
    '#00ffff', // Cyan
    '#00ff00', // Lime
    '#ffff00', // Yellow
    '#ff3333', // Red
    '#8a2be2'  // Violet
];

let attackersPool = []; 

// Globe Init
const world = Globe()
    (document.getElementById('globeViz'))
    .backgroundColor('#020204') 
    .globeImageUrl('//unpkg.com/three-globe/example/img/earth-dark.jpg')
    .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
    .atmosphereColor('#2a2a2a') // Subtle atmosphere
    .atmosphereAltitude(0.15)
    
    // --- 1. LASERS (Arcs) ---
    .arcColor(d => d.color) 
    .arcDashLength(0.4)
    .arcDashGap(0.2)
    .arcDashAnimateTime(d => d.speed)
    .arcStroke(0.6)

    // --- 2. BEACONS (Vertical Pillars) ---
    .pathsData([]) 
    .pathPoints(d => d.coords)
    .pathColor(d => d.color)
    .pathDashLength(1)
    .pathStroke(1.5) // Pillar thickness
    .pathTransitionDuration(1000)

    // --- 3. NO DOTS (Hacker Points removed) ---
    .pointsData([]) // Explicitly empty to remove dots

// Helper: Random Utils
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];
const getRandomCooldown = () => Math.random() * 3000 + 2000; 

// --- ANIMATION LOOP (The Heartbeat) ---
function animateWarfare() {
    const now = Date.now();
    let needsUpdate = false;

    attackersPool.forEach(attacker => {
        if (now > attacker.nextFireTime) {
            // Reset Target (Random Location on Earth)
            attacker.endLat = (Math.random() - 0.5) * 160;
            attacker.endLng = (Math.random() - 0.5) * 360;
            
            // Pick New Neon Color
            const neon = randomChoice(NEON_COLORS);
            
            // Apply Colors
            attacker.color = ['rgba(0,0,0,0)', neon]; // Arc Gradient
            attacker.beaconColor = neon; // Solid Beacon
            
            // Random Speed & Timing
            attacker.speed = Math.random() * 1000 + 1000;
            attacker.nextFireTime = now + getRandomCooldown();
            
            needsUpdate = true;
        }
    });

    if (needsUpdate) {
        // Update Arcs
        world.arcsData(attackersPool);
        
        // Update Beacons (Coords: [Lat, Lon, Altitude])
        const beacons = attackersPool.map(a => ({
            coords: [
                [a.startLat, a.startLng, 0.005], // Ground
                [a.startLat, a.startLng, 0.25]   // Sky Height
            ],
            color: a.beaconColor
        }));
        
        world.pathsData(beacons);
    }

    requestAnimationFrame(animateWarfare);
}

// --- DATA FETCHING ---
function fetchData() {
    fetch(API_URL)
        .then(res => res.json())
        .then(response => {
            const statusEl = document.getElementById('feedStatus');
            const countEl = document.getElementById('threatCount');

            // UI Update
            if (response.status === 'LIVE') {
                statusEl.innerText = "LIVE FEED";
                statusEl.className = "badge live";
            } else {
                statusEl.innerText = "SIMULATION"; // Covers Cache & Fake Data
                statusEl.className = "badge sim";
            }

            if (response.data && response.data.length > 0) {
                // Map Data to Attackers Object
                const newData = response.data.map(ip => ({
                    startLat: ip.lat,
                    startLng: ip.lon,
                    // Init Defaults
                    endLat: 0, endLng: 0,
                    color: ['rgba(0,0,0,0)', 'white'],
                    beaconColor: 'white',
                    speed: 1500,
                    nextFireTime: Date.now() + Math.random() * 2000
                }));

                attackersPool = newData;
                countEl.innerText = attackersPool.length;
            }
        })
        .catch(err => console.error("API Error:", err));
}

// Start System
fetchData();
animateWarfare();
setInterval(fetchData, 60000); // Refresh Data every 60s

// Cinematic Rotation
world.controls().autoRotate = true;
world.controls().autoRotateSpeed = 0.5;
