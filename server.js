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

// CORS + IMAGES
app.use("/images", express.static(path.join(__dirname, "images")));

const uri = "mongodb+srv://farhamoosa9_db_user:Farha2005%40@farha.tk5uuv4.mongodb.net/";
let db, lessons, orders;

// START SERVER
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
MongoClient.connect(uri)
    .then(client => {
        db = client.db("webstore");
        lessons = db.collection("lessons");
        orders = db.collection("orders");
        console.log("Connected to MongoDB Atlas");
    })
    .catch(err => console.error("MongoDB error:", err));

// DYNAMIC COLLECTION PARAM HANDLER
app.param("collectionName", (req, res, next, collectionName) => {
    req.collection = db.collection(collectionName);
    next();
});

// GET ALL LESSONS
app.get("/lessons", async (req, res) => {
    const data = await lessons.find({}).toArray();
    res.json(data);
});

// DYNAMIC COLLECTION PARAM HANDLER (duplicate for version progress)
app.param("collectionName", (req, res, next, collectionName) => {
    req.collection = db.collection(collectionName);
    next();
});

// GET ALL LESSONS (duplicate for version progress)
app.get("/lessons", async (req, res) => {
    const data = await lessons.find({}).toArray();
    res.json(data);
});
