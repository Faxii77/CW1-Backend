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
    const time = new Date().toISOString();
    console.log(`[API CALL] ${time} - ${req.method} ${req.originalUrl}`);
    next();
});

app.use(function(req, res, next) {
console.log("Request IP: " + req.url);
console.log("Request date: " + new Date());
  next();
});

// CORS
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    next();
});

// SERVE IMAGES FOLDER
app.use("/images", express.static(path.join(__dirname, "images")));


// DATABASE CONNECTION
const uri = "mongodb+srv://farhamoosa9_db_user:Farha2005%40@farha.tk5uuv4.mongodb.net/";
let db, lessons, orders;

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

// SAVE ORDER
app.post("/orders", async (req, res) => {
    await orders.insertOne(req.body);
    res.json({ success: true, message: "Order saved" });
});

// UPDATE LESSON SPACES
app.put("/lessons/:id", async (req, res) => {
    const id = parseInt(req.params.id);

    const result = await lessons.updateOne(
        { id: id },
        { $set: req.body }
    );

    res.json({
        success: result.modifiedCount === 1,
        message: result.modifiedCount === 1 ? "Updated" : "Not Found"
    });
});


app.get("/search", async (req, res) => {
    const q = req.query.q;
    if (!q) return res.json([]);

    const results = await lessons.find({
        $or: [
            { subject: { $regex: q, $options: "i" } },
            { location: { $regex: q, $options: "i" } },

            // Convert numbers → string for regex
            { $expr: { $regexMatch: { input: { $toString: "$price" }, regex: q, options: "i" } } },
            { $expr: { $regexMatch: { input: { $toString: "$spaces" }, regex: q, options: "i" } } }
        ]
    }).toArray();

    res.json(results);
});



// GET ANY COLLECTION
app.get("/collection/:collectionName", (req, res) => {
    req.collection.find({}).toArray((err, results) => {
        res.send(results);
    });
});

// POST INTO ANY COLLECTION
app.post("/collection/:collectionName", (req, res) => {
    req.collection.insertOne(req.body, (err, result) => {
        res.send(result);
    });
});

// UPDATE ANY COLLECTION
app.put("/collection/:collectionName/:id", (req, res) => {
    const { ObjectId } = require("mongodb");

    req.collection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: req.body },
        (err, result) => {
            res.send(result);
        }
    );
});

// ERROR HANDLER
app.use((err, req, res, next) => {
    console.error("Error:", err);
    res.status(500).json({ error: err.message });
});

// START SERVER
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});