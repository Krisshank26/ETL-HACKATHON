import { getDb } from './src/db/mongoClient.js';
import diff from 'deep-diff';

const SCHEMA_COLLECTION = '_schemas';

/**
 * Takes the `parsedData` array and generates a schema.
 * This is the "candidate" schema.
 */
function generateSchemaFromData(parsedData) {
  const fieldMap = new Map();

  // Loop through every record and every key
  for (const record of parsedData) {
    if (typeof record !== 'object' || record === null) continue;

    for (const key of Object.keys(record)) {
      const value = record[key];
      const type = getMongoType(value);

      if (!fieldMap.has(key)) {
        // First time seeing this field
        fieldMap.set(key, { 
          types: new Set([type]), 
          example_value: value 
        });
      } else {
        // Field already seen, add the new type if it's different
        fieldMap.get(key).types.add(type);
      }
    }
  }

  // Convert the map to the final schema field array
  const fields = [];
  for (const [name, def] of fieldMap.entries()) {
    const typeList = Array.from(def.types);
    fields.push({
      name: name,
      path: `$.${name}`,
      type: typeList.length === 1 ? typeList[0] : typeList, // Handle mixed types [cite: 314-323]
      nullable: def.types.has('null'),
      example_value: def.example_value,
      confidence: 1.0 // Placeholder
    });
  }
  return { fields };
}

/**
 * Main function. Compares new data against the latest schema
 * and saves a new version if changes are detected.
 */
export async function manageSchemaEvolution(source_id, parsedData) {
  const db = getDb();
  const schemaCollection = db.collection(SCHEMA_COLLECTION);

  // 1. Generate a "candidate" schema from the new data
  const candidateSchema = generateSchemaFromData(parsedData);
  candidateSchema.source_id = source_id;
  candidateSchema.generated_at = new Date();
  candidateSchema.compatible_dbs = ["mongodb"];

  // 2. Get the LATEST current schema for this source_id
  const currentSchema = await schemaCollection.findOne(
    { source_id: source_id },
    { sort: { version: -1 } }
  );

  // 3. Handle First Upload (no current schema)
  if (!currentSchema) {
    candidateSchema.version = 1;
    candidateSchema.migration_notes = "Initial schema creation.";
    const result = await schemaCollection.insertOne(candidateSchema);
    return { schemaId: result.insertedId, notes: candidateSchema.migration_notes };
  }

  // 4. Compare new schema with current schema
  // We only compare the 'fields' part [cite: 104-107]
  const changes = diff(currentSchema.fields, candidateSchema.fields);

  // 5. Handle Idempotency (Phase 7) - No Changes
  if (!changes) {
    // No changes detected. Return the existing schema ID.
    return { schemaId: currentSchema._id, notes: "No schema changes detected." };
  }

  // 6. Handle Evolution (Phase 3) - Changes Detected!
  const newVersion = currentSchema.version + 1;
  candidateSchema.version = newVersion;
  candidateSchema.migration_notes = generateMigrationNotes(changes); // Create notes
  
  const result = await schemaCollection.insertOne(candidateSchema);
  return { schemaId: result.insertedId, notes: candidateSchema.migration_notes };
}

// --- Helper Functions ---

function getMongoType(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number') return 'double';
  if (typeof value === 'string') return 'string';
  if (typeof value === 'boolean') return 'bool';
  if (value instanceof Date) return 'date';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') return 'object';
  return 'string'; // Default fallback
}

function generateMigrationNotes(changes) {
  const notes = [];
  for (const change of changes) {
    if (change.kind === 'N') {
      notes.push(`Added field: '${change.path.join('.')}'`);
    } else if (change.kind === 'D') {
      notes.push(`Removed field: '${change.path.join('.')}'`);
    } else if (change.kind === 'E') {
      notes.push(`Changed field type: '${change.path.join('.')}'`);
    }
  }
  return notes.join('\n');
}