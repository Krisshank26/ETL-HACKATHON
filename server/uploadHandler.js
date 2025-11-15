import fs from 'fs/promises';
import { parseFileContent } from './parser.js';
import { getDb } from './src/db/mongoClient.js';
import { manageSchemaEvolution } from './schemaManager.js';

export async function handleUpload(req, res) {
  try {
    const { source_id } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).send({ error: 'No file uploaded.' });
    }
    if (!source_id) {
      return res.status(400).send({ error: 'Missing source_id.' });
    }

    const fileContent = await fs.readFile(file.path, 'utf-8');
    const { parsedData, fragmentsSummary } = await parseFileContent(fileContent, file.mimetype);

    const { schemaId, notes } = await manageSchemaEvolution(source_id, parsedData);

    const documentsToInsert = parsedData.filter(
      item => typeof item === 'object' && item !== null && !Array.isArray(item)
    );
    // --- END OF FIX ---

    const dataCollectionName = `data_${source_id}`;
    const db = getDb();
    
    if (documentsToInsert.length > 0) {
      await db.collection(dataCollectionName).insertMany(documentsToInsert);
    } else {
      console.log(`No valid documents found to insert for source_id: ${source_id}`);
    }

    await fs.unlink(file.path);

    res.status(201).json({
      status: "ok",
      source_id: source_id,
      file_id: file.filename,
      schema_id: schemaId,
      migration_notes: notes,
      parsed_fragments_summary: fragmentsSummary,
      documents_inserted: documentsToInsert.length
    });

  } catch (error) {
    console.error('Upload failed:', error); 
    res.status(500).send({ error: 'Internal server error' });
  }
}
