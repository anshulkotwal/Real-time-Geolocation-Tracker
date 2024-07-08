const socket = io();

let userId = null;
const markers = {};
const map = L.map("map").setView([0, 0], 16);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors"
}).addTo(map);

if (navigator.geolocation) {   //Check for Geolocation Support
    navigator.geolocation.watchPosition((position) => {   // watches the user's position and executes the provided callback
        const { latitude, longitude } = position.coords;
        socket.emit("send-location", { userId, latitude, longitude });  //It extracts the latitude and longitude from the position.coords
    }, (error) => {
        console.error(error);
        document.getElementById("status").textContent = "Geolocation error: " + error.message;   //f there's an error retrieving the user's position
    }, {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
    });
}

socket.on("connect", () => {
    document.getElementById("status").textContent = "Connected";
    userId = socket.id;
});

socket.on("receive-location", (data) => {
    const { id, username, latitude, longitude } = data;
    const userLocation = [latitude, longitude];

    // Check if the marker for this user already exists
    if (markers[id]) {
        // Update the existing marker's position
        markers[id].setLatLng(userLocation).bindPopup(`<b>${username}</b><br>Lat: ${latitude.toFixed(2)}, Lng: ${longitude.toFixed(2)}`);
    } else {
        // Create a new marker for the user
        markers[id] = L.marker(userLocation).addTo(map)
            .bindPopup(`<b>${username}</b><br>Lat: ${latitude.toFixed(2)}, Lng: ${longitude.toFixed(2)}`).openPopup();
    }

    // Optionally, maintain map focus on the user's location
    map.setView(userLocation, 16);
});

socket.on("user-disconnect", (id) => {
    if (markers[id]) {
        map.removeLayer(markers[id]);
        delete markers[id];
    }
});

socket.on("location-history", (history) => {
    history.forEach(({ id, username, latitude, longitude }) => {
        if (!markers[id]) {
            markers[id] = L.marker([latitude, longitude]).addTo(map)
                .bindPopup(`<b>${username}</b><br>Lat: ${latitude.toFixed(2)}, Lng: ${longitude.toFixed(2)}`).openPopup();
        }
    });
});
