// Configuration
const API_URL = 'https://live-ddos.onrender.com/attacks';
const MY_LAT = 31.3436
const MY_LON = 76.7607

// Initialize Globe
const world = Globe()
    (document.getElementById('globeViz'))
    .globeImageUrl('//unpkg.com/three-globe/example/img/earth-night.jpg')
    .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
    .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
    .pointOfView({ lat: 20, lng: 80, altitude: 2.5 }) // Camera start angle
    .arcColor(() => '#ff3333') // Red laser beams
    .arcDashLength(0.4)
    .arcDashGap(2)
    .arcDashAnimateTime(2000)
    .arcStroke(0.6)
    .labelText(d => d.city)
    .labelSize(d => 1.5)
    .labelDotRadius(d => 0.5)
    .labelColor(() => 'rgba(255, 165, 0, 0.75)')
    .labelResolution(2);

// Data Fetching Function
function updateMap() {
    console.log("Fetching new attack data...");
    
    fetch(API_URL)
        .then(response => response.json())
        .then(data => {
            console.log("Data received:", data);
            
            // Update HUD Count
            document.getElementById('count').innerText = data.length || 0;

            // Prepare Arcs (Lines from Attacker -> You)
            const attacks = data.map(ip => ({
                startLat: ip.lat,
                startLng: ip.lon,
                endLat: MY_LAT,
                endLng: MY_LON,
                color: '#ff0000',
                city: `${ip.city} (${ip.country})` // Label text
            }));

            // Feed data to globe
            world.arcsData(attacks);
            
            // Optional: Add labels for cities
            const labels = data.map(ip => ({
                lat: ip.lat,
                lng: ip.lon,
                city: ip.city
            }));
            world.labelsData(labels);
        })
        .catch(error => {
            console.error("Error fetching attacks:", error);
            document.getElementById('count').innerText = "ERROR";
        });
}

// Start System
updateMap();
// Refresh every 15 seconds (Zyada fast mat karna, free API limit hai)
setInterval(updateMap, 15000);
