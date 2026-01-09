
mkdir my-app
cd my-app
npm init
npm install express
npm install express socket.io
npm install cors
npm install tesseract.js
npm install node-native-ocr
npm install fs-extra
npm install path
npm install electron
npm install node-webcam
npm install sharp
//---------------------------------------------------
Create a file named index.js
// index.js

//
let appName = "[WEB API / NODE.JS - DEMO]";
//
let appVersion = "1.0.0.3";
//
let portNumber = 4000;
let chatPortNumber = 3000;
//
const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

//---------------------------------------------------
// Handling GET requests for different endpoints
//---------------------------------------------------
//

//
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*"); // Allow all origins for testing
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept",
  );
  next();
});

io.on("connection", (socket) => {
  console.log("A user connected");

  // Handle incoming messages from the client
  socket.on("chat message", (msg) => {
    console.log("Message:", msg);
    io.emit("chat message", msg); // Broadcast message to all clients
  });

  // Handle disconnections
  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});

//---------------------------------------------------
// DRIVER CODE
//---------------------------------------------------
//
http.listen(chatPortNumber, () => {
  console.log("Server listening on port " + chatPortNumber);
});

//---------------------------------------------------

node index.js

http://localhost:300