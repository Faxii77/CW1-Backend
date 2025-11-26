// REQUIRE MODULES
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { MongoClient } = require("mongodb");

const app = express();
app.use(express.json());

// LOGGER
app.use((req, res, next) => {
    console.log(`[API CALL] ${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
    next();
});

// CORS
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    next();
});

// IMAGES
app.use("/images", express.static(path.join(__dirname, "images")));

// START SERVER
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
