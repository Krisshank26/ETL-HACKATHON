import express from "express"
import dotenv from "dotenv"
import multer from "multer";
import { handleUpload } from './uploadHandler.js';
import { connectToDb, getDb } from './src/db/mongoClient.js'; // Import getDb

const app = express()
const upload = multer({ dest: 'uploads/' });

app.use(express.json())
dotenv.config()

// --- API ROUTES ---

// 1. The Ingestion Route
app.post("/upload", upload.single('file'), handleUpload);

// 2. Get the LATEST schema
app.get("/schema", async (req, res) => {
  try {
    const { source_id } = req.query;
    if (!source_id) {
      return res.status(400).send({ error: "source_id is required" });
    }
    
    const db = getDb();
    const schema = await db.collection("_schemas").findOne(
      { source_id: source_id },
      { sort: { version: -1 } } // Get the latest version
    );

    if (!schema) {
      return res.status(440).send({ error: "No schema found for this source_id" });
    }
    res.status(200).json(schema);

  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// 3. Get the ENTIRE schema history
app.get("/schema/history", async (req, res) => {
  try {
    const { source_id } = req.query;
    if (!source_id) {
      return res.status(400).send({ error: "source_id is required" });
    }
    
    const db = getDb();
    const history = await db.collection("_schemas")
      .find({ source_id: source_id })
      .sort({ version: 1 }) // Show history from v1 up
      .toArray();

    res.status(200).json(history);

  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// --- Server Start ---
const port = process.env.PORT || 8080; // Use port 8080

// This is the CORRECT way to start
// It waits for the DB connection before starting the server
connectToDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server Is Listening On PORT ${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start server", error);
    process.exit(1);
  });