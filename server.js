// REQUIRE MODULES
const express = require("express");
const cors = require("cors");
const path = require("path");
const { MongoClient } = require("mongodb");

const app = express();

// ENABLE CORS FIRST
app.use(cors());
app.use(express.json());

// LOGGER
app.use((req, res, next) => {
    const time = new Date().toISOString();
    console.log(`[${time}] ${req.method} ${req.url}`);
    next();
});

// SERVE STATIC FILES 
app.use(express.static(path.join(__dirname)));
app.use("/images", express.static(path.join(__dirname, "images")));

// DATABASE CONNECTION
const uri = "mongodb+srv://farhamoosa9_db_user:Farha2005%40@farha.tk5uuv4.mongodb.net/";
let db, lessons, orders;

MongoClient.connect(uri)
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

// MIDDLEWARE: Check DB connection
app.use((req, res, next) => {
    if (!db) {
        return res.status(503).json({ error: "Database not connected" });
    }
    next();
});

// GET ALL LESSONS
app.get("/lessons", async (req, res) => {
    try {
        const data = await lessons.find({}).toArray();
        res.json(data);
    } catch (err) {
        console.error("Error fetching lessons:", err);
        res.status(500).json({ error: "Failed to fetch lessons" });
    }
});

// SEARCH LESSONS
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

        res.json(results);
    } catch (err) {
        console.error("Search error:", err);
        res.status(500).json({ error: "Search failed" });
    }
});

// LESSON SPACES
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

// Saving the orders
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

// DYNAMIC COLLECTION ROUTES 
app.param("collectionName", (req, res, next, collectionName) => {
    req.collection = db.collection(collectionName);
    next();
});

app.get("/collection/:collectionName", async (req, res) => {
    try {
        const results = await req.collection.find({}).toArray();
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/collection/:collectionName", async (req, res) => {
    try {
        const result = await req.collection.insertOne(req.body);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

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

// root route
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// ERROR HANDLER
app.use((err, req, res, next) => {
    console.error("Server Error:", err);
    res.status(500).json({ error: err.message });
});

// START SERVER
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`\n Server running on http://localhost:${port}`);
    console.log(` Serving frontend files from: ${__dirname}`);
    console.log(`  API endpoints available at: http://localhost:${port}/lessons\n`);
});