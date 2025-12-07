const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { MongoClient } = require("mongodb");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Request logger
app.use((req, res, next) => {
    const time = new Date().toISOString();
    console.log(`[${time}] ${req.method} ${req.url}`);
    next();
});

// Serve images statically
app.use("/images", express.static(path.join(__dirname, "images")));

// Handle image requests with fallback to placeholder
app.get("/images/*", (req, res) => {
    const requestedPath = req.path.replace(/^\/+/, "");
    const filePath = path.join(__dirname, requestedPath);

    fs.access(filePath, fs.constants.R_OK, (err) => {
        if (!err) {
            return res.sendFile(filePath);
        }

        const placeholder = path.join(__dirname, "images", "placeholder.png");
        fs.access(placeholder, fs.constants.R_OK, (phErr) => {
            if (!phErr) {
                return res.sendFile(placeholder);
            }
            res.status(404).send("Image not found");
        });
    });
});

// MongoDB connection
const uri = "mongodb+srv://farhamoosa9_db_user:Farha2005%40@farha.tk5uuv4.mongodb.net/"; 
let db, lessons, orders;

MongoClient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(client => {
        db = client.db("webstore");
        lessons = db.collection("lessons");
        orders = db.collection("orders");
        console.log("✓ Connected to MongoDB Atlas");
    })
    .catch(err => {
        console.error("MongoDB connection error:", err);
        process.exit(1);
    });

// Ensure database is ready before processing requests
app.use((req, res, next) => {
    if (!db && req.path.startsWith("/")) {
        if (req.path.startsWith("/lessons") || req.path.startsWith("/search") || 
            req.path.startsWith("/orders") || req.path.startsWith("/collection")) {
            return res.status(503).json({ error: "Database not connected" });
        }
    }
    next();
});

// Convert relative image paths to absolute URLs
function attachImageUrl(req, item) {
    const host = `${req.protocol}://${req.get("host")}`;
    
    let imageField = item.image || item.icon;
    
    if (!imageField) {
        return { ...item, image: `${host}/images/placeholder.png` };
    }
    
    let filename = imageField.toString();
    filename = filename.replace(/^\/+/, "");
    if (!filename.startsWith("images/")) filename = `images/${filename}`;
    
    const result = { ...item, image: `${host}/${filename}` };
    delete result.icon;
    
    return result;
}

// Get all lessons
app.get("/lessons", async (req, res) => {
    try {
        const docs = await lessons.find({}).toArray();
        const mapped = docs.map(d => attachImageUrl(req, d));
        res.json(mapped);
    } catch (err) {
        console.error("Error fetching lessons:", err);
        res.status(500).json({ error: "Failed to fetch lessons" });
    }
});

// Search lessons by subject, location, price, or spaces
app.get("/search", async (req, res) => {
    try {
        const q = req.query.q;
        if (!q) return res.json([]);

        const results = await lessons.find({
            $or: [
                { subject: { $regex: q, $options: "i" } },
                { location: { $regex: q, $options: "i" } },
                { $expr: { $regexMatch: { input: { $toString: "$price" }, regex: q, options: "i" } } },
                { $expr: { $regexMatch: { input: { $toString: "$spaces" }, regex: q, options: "i" } } }
            ]
        }).toArray();

        const mapped = results.map(r => attachImageUrl(req, r));
        res.json(mapped);
    } catch (err) {
        console.error("Search error:", err);
        res.status(500).json({ error: "Search failed" });
    }
});

// Update lesson available spaces
app.put("/lessons/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const result = await lessons.updateOne(
            { id: id },
            { $set: { spaces: req.body.spaces } }
        );
        res.json({
            success: result.modifiedCount === 1,
            message: result.modifiedCount === 1 ? "Updated" : "Not Found"
        });
    } catch (err) {
        console.error("Update error:", err);
        res.status(500).json({ success: false, error: "Update failed" });
    }
});

// Save new order
app.post("/orders", async (req, res) => {
    try {
        const result = await orders.insertOne(req.body);
        res.json({
            success: true,
            message: "Order saved successfully",
            orderId: result.insertedId
        });
    } catch (err) {
        console.error("Order error:", err);
        res.status(500).json({ success: false, error: "Failed to save order" });
    }
});

// Dynamic collection parameter
app.param("collectionName", (req, res, next, collectionName) => {
    req.collection = db.collection(collectionName);
    next();
});

// Get all documents from a collection
app.get("/collection/:collectionName", async (req, res) => {
    try {
        const results = await req.collection.find({}).toArray();
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Insert document into collection
app.post("/collection/:collectionName", async (req, res) => {
    try {
        const result = await req.collection.insertOne(req.body);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update document in collection
app.put("/collection/:collectionName/:id", async (req, res) => {
    try {
        const { ObjectId } = require("mongodb");
        const result = await req.collection.updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: req.body }
        );
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Global error handler
app.use((err, req, res, next) => {
    console.error("Server Error:", err);
    res.status(500).json({ error: err.message });
});

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`\n Server running on http://localhost:${port}`);
    console.log(` API endpoints available at: http://localhost:${port}/lessons\n`);
});