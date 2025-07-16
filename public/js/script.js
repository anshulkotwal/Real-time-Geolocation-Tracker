const socket = io();

// Global variables
let currentUser = null;
let map = null;
let markers = {};
let userMarkers = {};
let watchId = null;
let isMapInitialized = false;
let currentMapStyle = 'street';
let is3DMode = false;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Show loading screen
    showLoadingScreen();
    
    // Initialize map after a short delay
    setTimeout(() => {
        initializeMap();
        initializeGeolocation();
        initializeEventListeners();
        initializeUI();
        
        // Hide loading screen after initialization
        setTimeout(() => {
            hideLoadingScreen();
        }, 2000);
    }, 1000);
}

function showLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    loadingScreen.style.display = 'flex';
    
    // Animate loading progress
    const progressBar = document.querySelector('.loading-progress');
    let progress = 0;
    const progressInterval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress >= 100) {
            progress = 100;
            clearInterval(progressInterval);
        }
        progressBar.style.width = progress + '%';
    }, 200);
}

function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    const mainInterface = document.getElementById('main-interface');
    
    // Fade out loading screen
    loadingScreen.style.opacity = '0';
    loadingScreen.style.transition = 'opacity 0.5s ease';
    
    setTimeout(() => {
        loadingScreen.style.display = 'none';
        mainInterface.style.display = 'block';
        
        // Show side panel
        const sidePanel = document.getElementById('side-panel');
        sidePanel.classList.add('active');
        
        // Start animations
        startUIAnimations();
    }, 500);
}

function initializeMap() {
    // Initialize Leaflet map
    map = L.map('map', {
        zoomControl: false,
        attributionControl: false
    }).setView([0, 0], 16);
    
    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    // Custom map styling
    map.getContainer().style.filter = 'hue-rotate(180deg) saturate(1.2) brightness(0.8)';
    
    isMapInitialized = true;
    
    // Add map event listeners
    map.on('zoomend', function() {
        document.getElementById('zoom-level').textContent = map.getZoom();
    });
}

function initializeGeolocation() {
    if (navigator.geolocation) {
        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 1000
        };
        
        watchId = navigator.geolocation.watchPosition(
            handleLocationSuccess,
            handleLocationError,
            options
        );
    } else {
        showError('Geolocation not supported by this browser');
    }
}

function handleLocationSuccess(position) {
    const { latitude, longitude, accuracy, heading, speed } = position.coords;
    
    // Update coordinates display
    document.getElementById('user-lat').textContent = latitude.toFixed(6);
    document.getElementById('user-lng').textContent = longitude.toFixed(6);
    
    // Update telemetry
    document.getElementById('current-accuracy').textContent = Math.round(accuracy) + 'm';
    document.getElementById('current-heading').textContent = Math.round(heading || 0) + '°';
    document.getElementById('current-speed').textContent = ((speed || 0) * 3.6).toFixed(1) + ' km/h';
    
    // Update compass
    updateCompass(heading || 0);
    
    // Send location to server
    socket.emit('send-location', {
        latitude,
        longitude,
        accuracy,
        heading: heading || 0,
        speed: speed || 0
    });
    
    // Center map on user location if this is the first position
    if (currentUser && isMapInitialized) {
        map.setView([latitude, longitude], map.getZoom());
    }
}

function handleLocationError(error) {
    let errorMessage = 'Location error: ';
    switch(error.code) {
        case error.PERMISSION_DENIED:
            errorMessage += 'Permission denied';
            break;
        case error.POSITION_UNAVAILABLE:
            errorMessage += 'Position unavailable';
            break;
        case error.TIMEOUT:
            errorMessage += 'Request timeout';
            break;
        default:
            errorMessage += 'Unknown error';
    }
    showError(errorMessage);
}

function initializeEventListeners() {
    // Socket events
    socket.on('connect', handleSocketConnect);
    socket.on('disconnect', handleSocketDisconnect);
    socket.on('user-initialized', handleUserInitialized);
    socket.on('users-list', handleUsersList);
    socket.on('user-joined', handleUserJoined);
    socket.on('user-disconnected', handleUserDisconnected);
    socket.on('receive-location', handleLocationReceived);
    socket.on('receive-message', handleMessageReceived);
    
    // UI event listeners
    document.getElementById('center-map').addEventListener('click', centerMapOnUser);
    document.getElementById('toggle-3d').addEventListener('click', toggle3DMode);
    document.getElementById('toggle-satellite').addEventListener('click', toggleSatelliteView);
    document.getElementById('send-message').addEventListener('click', sendMessage);
    document.getElementById('message-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // Close modal event
    document.querySelector('.close').addEventListener('click', function() {
        document.getElementById('distance-modal').style.display = 'none';
    });
}

function initializeUI() {
    // Start time display
    updateTimeDisplay();
    setInterval(updateTimeDisplay, 1000);
    
    // Initialize connection status
    updateConnectionStatus('CONNECTING...', 'connecting');
}

function startUIAnimations() {
    // Animate HUD elements
    gsap.from('#top-hud', { y: -60, opacity: 0, duration: 1, ease: 'power2.out' });
    gsap.from('#bottom-hud', { y: 60, opacity: 0, duration: 1, ease: 'power2.out', delay: 0.2 });
    gsap.from('#side-panel', { x: -300, opacity: 0, duration: 1, ease: 'power2.out', delay: 0.4 });
    gsap.from('.map-controls', { x: 100, opacity: 0, duration: 1, ease: 'power2.out', delay: 0.6 });
    gsap.from('#compass', { scale: 0, opacity: 0, duration: 1, ease: 'back.out(1.7)', delay: 0.8 });
}

// Socket event handlers
function handleSocketConnect() {
    updateConnectionStatus('CONNECTED', 'connected');
    console.log('Connected to server');
}

function handleSocketDisconnect() {
    updateConnectionStatus('DISCONNECTED', 'disconnected');
    console.log('Disconnected from server');
}

function handleUserInitialized(userData) {
    currentUser = userData;
    document.getElementById('current-user').textContent = userData.username;
    console.log('User initialized:', userData);
}

function handleUsersList(users) {
    updateUsersList(users);
    updateUsersCount(users.length);
}

function handleUserJoined(userData) {
    addUserToList(userData);
    showNotification(`${userData.username} joined the session`);
}

function handleUserDisconnected(userId) {
    removeUserFromList(userId);
    if (userMarkers[userId]) {
        map.removeLayer(userMarkers[userId]);
        delete userMarkers[userId];
    }
}

function handleLocationReceived(userData) {
    updateUserLocation(userData);
    updateUserInList(userData);
    updateNearestUserInfo(userData);
}

function handleMessageReceived(data) {
    addMessageToChat(data);
}

// UI update functions
function updateConnectionStatus(status, type) {
    const statusElement = document.getElementById('connection-status');
    const pulseDot = document.querySelector('.pulse-dot');
    
    statusElement.textContent = status;
    
    // Update pulse dot color based on connection status
    switch(type) {
        case 'connected':
            pulseDot.style.background = '#00ff00';
            break;
        case 'connecting':
            pulseDot.style.background = '#ffff00';
            break;
        case 'disconnected':
            pulseDot.style.background = '#ff0000';
            break;
    }
}

function updateUsersList(users) {
    const usersList = document.getElementById('users-list');
    usersList.innerHTML = '';
    
    users.forEach(user => {
        if (user.id !== currentUser?.id) {
            addUserToList(user);
        }
    });
}

function addUserToList(user) {
    const usersList = document.getElementById('users-list');
    const userItem = createUserListItem(user);
    usersList.appendChild(userItem);
}

function createUserListItem(user) {
    const userItem = document.createElement('div');
    userItem.className = 'user-item';
    userItem.dataset.userId = user.id;
    
    userItem.innerHTML = `
        <div class="user-avatar" style="background-color: ${user.color}">
            ${user.username.substring(0, 2).toUpperCase()}
        </div>
        <div class="user-details">
            <div class="user-name">${user.username}</div>
            <div class="user-distance">Calculating...</div>
        </div>
    `;
    
    userItem.addEventListener('click', () => {
        if (userMarkers[user.id]) {
            map.setView(userMarkers[user.id].getLatLng(), 18);
            userMarkers[user.id].openPopup();
        }
    });
    
    return userItem;
}

function updateUserInList(user) {
    const userItem = document.querySelector(`[data-user-id="${user.id}"]`);
    if (userItem && currentUser) {
        const distance = calculateDistance(
            currentUser.latitude || 0,
            currentUser.longitude || 0,
            user.latitude,
            user.longitude
        );
        
        const distanceElement = userItem.querySelector('.user-distance');
        if (distance < 1) {
            distanceElement.textContent = `${Math.round(distance * 1000)}m`;
        } else {
            distanceElement.textContent = `${distance.toFixed(1)}km`;
        }
    }
}

function removeUserFromList(userId) {
    const userItem = document.querySelector(`[data-user-id="${userId}"]`);
    if (userItem) {
        userItem.remove();
    }
    updateUsersCount(document.querySelectorAll('.user-item').length);
}

function updateUsersCount(count) {
    document.getElementById('users-online').textContent = count;
}

function updateUserLocation(userData) {
    const { id, latitude, longitude, username, color } = userData;
    const userLocation = [latitude, longitude];
    
    if (userMarkers[id]) {
        // Update existing marker
        userMarkers[id].setLatLng(userLocation);
        userMarkers[id].setPopupContent(createPopupContent(userData));
    } else {
        // Create new marker
        const customIcon = L.divIcon({
            className: 'custom-marker',
            html: `
                <div class="marker-container" style="background-color: ${color}">
                    <div class="marker-pulse"></div>
                    <div class="marker-dot"></div>
                    <div class="marker-label">${username}</div>
                </div>
            `,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });
        
        userMarkers[id] = L.marker(userLocation, { icon: customIcon })
            .addTo(map)
            .bindPopup(createPopupContent(userData));
    }
    
    // Update current user reference
    if (id === currentUser?.id) {
        currentUser = { ...currentUser, ...userData };
    }
}

function createPopupContent(userData) {
    return `
        <div class="custom-popup">
            <h4>${userData.username}</h4>
            <p>Speed: ${userData.speed?.toFixed(1) || 0} km/h</p>
            <p>Heading: ${Math.round(userData.heading || 0)}°</p>
            <p>Accuracy: ${Math.round(userData.accuracy || 0)}m</p>
            <p>Last seen: ${new Date(userData.lastSeen).toLocaleTimeString()}</p>
        </div>
    `;
}

function updateNearestUserInfo(userData) {
    if (!currentUser || !userData.nearbyUsers || userData.nearbyUsers.length === 0) {
        document.getElementById('nearest-info').textContent = 'No other users';
        return;
    }
    
    const nearest = userData.nearbyUsers.reduce((prev, current) => {
        return (prev.distance < current.distance) ? prev : current;
    });
    
    const distance = nearest.distance < 1 ? 
        `${Math.round(nearest.distance * 1000)}m` : 
        `${nearest.distance.toFixed(1)}km`;
    
    document.getElementById('nearest-info').textContent = 
        `${nearest.username}: ${distance} away`;
}

function updateCompass(heading) {
    const needle = document.getElementById('compass-needle');
    needle.style.transform = `translate(-50%, -100%) rotate(${heading}deg)`;
}

function updateTimeDisplay() {
    const timeElement = document.getElementById('current-time');
    const now = new Date();
    timeElement.textContent = now.toLocaleTimeString();
}

// Map control functions
function centerMapOnUser() {
    if (currentUser && currentUser.latitude && currentUser.longitude) {
        map.setView([currentUser.latitude, currentUser.longitude], 18);
        
        // Add animation effect
        const button = document.getElementById('center-map');
        button.style.transform = 'scale(1.2)';
        setTimeout(() => {
            button.style.transform = 'scale(1)';
        }, 200);
    }
}

function toggle3DMode() {
    is3DMode = !is3DMode;
    const button = document.getElementById('toggle-3d');
    
    if (is3DMode) {
        button.style.background = 'linear-gradient(135deg, rgba(0, 255, 0, 0.4), rgba(0, 255, 255, 0.4))';
        map.getContainer().style.transform = 'perspective(1000px) rotateX(15deg)';
    } else {
        button.style.background = 'linear-gradient(135deg, rgba(0, 255, 255, 0.2), rgba(255, 0, 255, 0.2))';
        map.getContainer().style.transform = 'none';
    }
}

function toggleSatelliteView() {
    const button = document.getElementById('toggle-satellite');
    
    if (currentMapStyle === 'street') {
        // Switch to satellite view
        map.eachLayer(layer => {
            if (layer instanceof L.TileLayer) {
                map.removeLayer(layer);
            }
        });
        
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Esri, DigitalGlobe, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community'
        }).addTo(map);
        
        currentMapStyle = 'satellite';
        button.style.background = 'linear-gradient(135deg, rgba(0, 255, 0, 0.4), rgba(0, 255, 255, 0.4))';
    } else {
        // Switch back to street view
        map.eachLayer(layer => {
            if (layer instanceof L.TileLayer) {
                map.removeLayer(layer);
            }
        });
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
        
        currentMapStyle = 'street';
        button.style.background = 'linear-gradient(135deg, rgba(0, 255, 255, 0.2), rgba(255, 0, 255, 0.2))';
    }
}

// Chat functions
function sendMessage() {
    const messageInput = document.getElementById('message-input');
    const message = messageInput.value.trim();
    
    if (message && currentUser) {
        socket.emit('user-message', { message });
        messageInput.value = '';
    }
}

function addMessageToChat(data) {
    const chatMessages = document.getElementById('chat-messages');
    const messageElement = document.createElement('div');
    messageElement.className = 'chat-message';
    
    const time = new Date(data.timestamp).toLocaleTimeString();
    messageElement.innerHTML = `
        <div class="user" style="color: ${data.user.color}">${data.user.username}</div>
        <div class="message">${data.message}</div>
        <div class="timestamp">${time}</div>
    `;
    
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Add notification effect
    showNotification(`New message from ${data.user.username}`);
}

// Utility functions
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function showError(message) {
    console.error(message);
    showNotification(message, 'error');
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Style the notification
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: linear-gradient(135deg, rgba(0, 255, 255, 0.9), rgba(255, 0, 255, 0.9));
        color: white;
        padding: 10px 20px;
        border-radius: 8px;
        border: 1px solid rgba(0, 255, 255, 0.5);
        z-index: 10000;
        font-size: 14px;
        max-width: 300px;
        word-wrap: break-word;
        backdrop-filter: blur(10px);
        box-shadow: 0 4px 20px rgba(0, 255, 255, 0.3);
    `;
    
    if (type === 'error') {
        notification.style.background = 'linear-gradient(135deg, rgba(255, 0, 0, 0.9), rgba(255, 100, 100, 0.9))';
        notification.style.borderColor = 'rgba(255, 0, 0, 0.5)';
    }
    
    document.body.appendChild(notification);
    
    // Animate in
    gsap.from(notification, {
        x: 300,
        opacity: 0,
        duration: 0.5,
        ease: 'power2.out'
    });
    
    // Remove after 3 seconds
    setTimeout(() => {
        gsap.to(notification, {
            x: 300,
            opacity: 0,
            duration: 0.5,
            ease: 'power2.in',
            onComplete: () => {
                document.body.removeChild(notification);
            }
        });
    }, 3000);
}

// Add custom styles for markers
const style = document.createElement('style');
style.textContent = `
    .custom-marker {
        background: transparent !important;
        border: none !important;
    }
    
    .marker-container {
        position: relative;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 20px rgba(0, 255, 255, 0.6);
    }
    
    .marker-pulse {
        position: absolute;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        background: inherit;
        animation: markerPulse 2s infinite;
        opacity: 0.6;
    }
    
    .marker-dot {
        width: 10px;
        height: 10px;
        background: white;
        border-radius: 50%;
        z-index: 2;
    }
    
    .marker-label {
        position: absolute;
        top: -30px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 10px;
        white-space: nowrap;
        font-family: 'Orbitron', monospace;
    }
    
    @keyframes markerPulse {
        0% { transform: scale(1); opacity: 0.6; }
        50% { transform: scale(1.5); opacity: 0.3; }
        100% { transform: scale(1); opacity: 0.6; }
    }
    
    .custom-popup {
        font-family: 'Orbitron', monospace;
        color: #00ffff;
        background: rgba(0, 0, 0, 0.9);
        padding: 10px;
        border-radius: 8px;
        border: 1px solid #00ffff;
    }
    
    .custom-popup h4 {
        margin: 0 0 10px 0;
        color: #ffffff;
    }
    
    .custom-popup p {
        margin: 5px 0;
        font-size: 12px;
    }
    
    .notification {
        animation: slideIn 0.5s ease-out;
    }
    
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;
document.head.appendChild(style);

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
    }
});