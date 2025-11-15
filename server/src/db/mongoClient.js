import { MongoClient } from 'mongodb';

// const uri = process.env.DBURL || "mongodb://localhost:27017";
// const dbName = "etlPipelineDb"; 

// const client = new MongoClient(uri);

let db; 

async function connectToDb() {
  try { 

    const uri = process.env.DBURL || "mongodb://localhost:27017";
    const dbName = "etlPipelineDb"; 

    const client = new MongoClient(uri);

    // let db;

    console.log(`Connecting to MongoDB at ${uri}`);
    await client.connect();
    
    db = client.db(dbName); 
    
    console.log(`Successfully connected to MongoDB`);
  } catch (error) {
    console.error("Could not connect to MongoDB", error);
    process.exit(1); // Exit the application if DB connection fails
  }
}

/**
 * Gets the database instance.
 * Other files will use this to interact with the database.
 */
function getDb() {
  // This now READS the module-level 'db' variable
  if (!db) {
    throw new Error("Database not initialized! Check connection.");
  }
  return db;
}

export { connectToDb, getDb };