# Real-time-Geolocation-Tracker

This project is a real-time geolocation tracker built with Node.js, Express, Socket.io, and Leaflet.js. It allows users to share and track their locations on a map in real-time. This project demonstrates the use of WebSockets for real-time communication and geolocation services in a web application.

## Features

- **Real-Time Location Updates**: Users can see their location updated in real-time on the map.
- **Geolocation Tracking**: Tracks the geolocation of users and displays it on the map.
- **Location History**: Maintains a history of locations and displays all users' markers on the map.
- **Interactive Map**: Utilizes Leaflet.js to create an interactive map with markers.
- **Responsive Notifications**: Provides real-time notifications for connection status and geolocation errors.
- **User Identification**: Displays usernames on the map to identify different users.

## Technologies Used

- **Node.js**: JavaScript runtime environment for building server-side applications.
- **Express.js**: Web application framework for Node.js.
- **Socket.io**: Enables real-time, bidirectional communication between web clients and servers.
- **Leaflet.js**: Open-source JavaScript library for mobile-friendly interactive maps.
- **EJS**: Embedded JavaScript templates for server-side rendering.


## Setup and Installation

1. **Clone the repository**:

    git clone https://github.com/anshulkotwal/Real-time-Geolocation-Tracker
    cd geolocation-tracker

2. **Install dependencies**:
   
    npm install

3. **Run the server**:
 
    node server.js
  
4. **Access the application**:
    Open your browser and navigate to `http://localhost:3000`

## File Structure

geolocation-tracker/
├── public/
│ ├── style/
│ │ └── style.css
│ ├── script/
│ │ └── script.js
├── views/
│ └── index.ejs
├── server.js
├── package.json
└── README.md

## Future Improvements

- **User Authentication**: Implement user authentication for secure access.
- **Database Integration**: Store location history in a database.
- **Enhanced UI**: Improve the user interface for better user experience.
- **Mobile Support**: Optimize the application for mobile devices.

## Contributing

Contributions are welcome! Please fork this repository and submit a pull request for any improvements or bug fixes.
