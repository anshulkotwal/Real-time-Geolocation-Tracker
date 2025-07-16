const express = require('express');
const app = express();
const http = require('http');
const path = require('path');
const socketio = require('socket.io');

const server = http.createServer(app);
const io = socketio(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

// Store user data
const users = new Map();

// Calculate distance between two points using Haversine formula
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

// Calculate bearing between two points
function calculateBearing(lat1, lon1, lat2, lon2) {
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
    const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
              Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
    let bearing = Math.atan2(y, x) * 180 / Math.PI;
    return (bearing + 360) % 360;
}

// Generate random colors for users
function getRandomColor() {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3', '#54A0FF'];
    return colors[Math.floor(Math.random() * colors.length)];
}

// Generate random usernames
function generateUsername() {
    const adjectives = ['Swift', 'Brave', 'Mystic', 'Cyber', 'Lunar', 'Solar', 'Neon', 'Quantum'];
    const nouns = ['Explorer', 'Tracker', 'Navigator', 'Wanderer', 'Scout', 'Voyager', 'Ranger', 'Seeker'];
    return `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}`;
}

io.on('connection', function(socket) {
    console.log('User connected:', socket.id);
    
    // Initialize user data
    const userData = {
        id: socket.id,
        username: generateUsername(),
        color: getRandomColor(),
        latitude: 0,
        longitude: 0,
        lastSeen: Date.now(),
        speed: 0,
        heading: 0,
        accuracy: 0
    };
    
    users.set(socket.id, userData);
    
    // Send user their initial data
    socket.emit('user-initialized', userData);
    
    // Send current users to new user
    socket.emit('users-list', Array.from(users.values()));
    
    // Notify others of new user
    socket.broadcast.emit('user-joined', userData);
    
    socket.on("send-location", function(data) {
        if (users.has(socket.id)) {
            const user = users.get(socket.id);
            
            // Calculate speed if we have previous location
            if (user.latitude && user.longitude) {
                const distance = calculateDistance(user.latitude, user.longitude, data.latitude, data.longitude);
                const timeDiff = (Date.now() - user.lastSeen) / 1000; // seconds
                user.speed = timeDiff > 0 ? (distance / timeDiff) * 3600 : 0; // km/h
            }
            
            // Update user data
            user.latitude = data.latitude;
            user.longitude = data.longitude;
            user.heading = data.heading || 0;
            user.accuracy = data.accuracy || 0;
            user.lastSeen = Date.now();
            
            users.set(socket.id, user);
            
            // Calculate distances and bearings to other users
            const otherUsers = Array.from(users.values()).filter(u => u.id !== socket.id);
            const userWithDistances = {
                ...user,
                nearbyUsers: otherUsers.map(otherUser => ({
                    ...otherUser,
                    distance: calculateDistance(user.latitude, user.longitude, otherUser.latitude, otherUser.longitude),
                    bearing: calculateBearing(user.latitude, user.longitude, otherUser.latitude, otherUser.longitude)
                }))
            };
            
            // Broadcast updated location to all users
            io.emit("receive-location", userWithDistances);
        }
    });
    
    socket.on("user-message", function(data) {
        if (users.has(socket.id)) {
            const user = users.get(socket.id);
            io.emit("receive-message", {
                user: user,
                message: data.message,
                timestamp: Date.now()
            });
        }
    });
    
    socket.on("disconnect", function() {
        console.log('User disconnected:', socket.id);
        users.delete(socket.id);
        io.emit("user-disconnected", socket.id);
    });
});

app.get('/', function(req, res) {
    res.render('index');
});

server.listen(3000, function() {
    console.log('Server is running on port 3000');
    console.log('Open http://localhost:3000 in multiple tabs to test');
});