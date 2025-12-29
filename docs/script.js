const API_URL = 'https://live-ddos.onrender.com/attacks';
let currentAttacks = []; // Store fetched data here

// Globe Setup
const world = Globe()
    (document.getElementById('globeViz'))
    .backgroundColor('#050505') 
    .globeImageUrl('//unpkg.com/three-globe/example/img/earth-dark.jpg')
    .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
    .atmosphereColor('#4a4a4a')
    .atmosphereAltitude(0.15)
    
    // --- ARC STYLING (The Pro Look) ---
    .arcColor(() => ['rgba(255, 255, 255, 0.1)', 'rgba(255, 68, 68, 1)']) // Fade to Red
    .arcDashLength(0.5)    // Dash ki lambai
    .arcDashGap(0.5)       // Dash ke beech gap (chota gap = dense line)
    .arcDashAnimateTime(2000) // Speed of pulse
    .arcStroke(0.5)        // Line ki motayi
    
    // Points (Sources only)
    .pointColor(() => '#ff4444')
    .pointRadius(0.6)
    .pointAltitude(0.01);

// Function: Naye Targets Generate karna
function retargetArcs() {
    if (currentAttacks.length === 0) return;

    // Har attacker ke liye ek naya Random Target dhoondo
    const newArcs = currentAttacks.map(ip => {
        // Random Target Generation
        const targetLat = (Math.random() - 0.5) * 160; // Avoid extreme poles
        const targetLon = (Math.random() - 0.5) * 360;

        return {
            startLat: ip.lat,
            startLng: ip.lon,
            endLat: targetLat,
            endLng: targetLon,
            // Ye color gradient define karta hai
            color: ['rgba(255,255,255,0.1)', '#ff4444'] 
        };
    });

    world.arcsData(newArcs);
}

// Main Data Fetcher
function fetchData() {
    fetch(API_URL)
        .then(res => res.json())
        .then(response => {
            const statusEl = document.getElementById('feedStatus');
            const countEl = document.getElementById('threatCount');

            // Handle Status UI
            if (response.status === 'LIVE') {
                statusEl.innerText = "LIVE STREAM";
                statusEl.className = "status-badge live";
            } else {
                statusEl.innerText = "CACHED REPLAY";
                statusEl.className = "status-badge replay";
            }

            // Save data locally
            if (response.data && response.data.length > 0) {
                currentAttacks = response.data;
                countEl.innerText = currentAttacks.length;
                
                // Show Source Points
                world.pointsData(currentAttacks);
                
                // Pehli baar arcs initiate karo
                retargetArcs();
            }
        })
        .catch(err => console.error("Network Error:", err));
}

// Init
fetchData();

// Logic Loop:
// 1. Data Server se har 60s mein maango (Save API calls)
setInterval(fetchData, 60000); 

// 2. Arcs ko har 4s mein naye target pe bhejo (Visual Effect)
setInterval(retargetArcs, 4000);

// Auto-Rotate for cinematic feel
world.controls().autoRotate = true;
world.controls().autoRotateSpeed = 0.5;
