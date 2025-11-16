import pdf from 'pdf-parse-new';
import { processJsonBlocks } from './blockProcessors/jsonProcessor.js';
import { processHtmlTableBlocks } from './blockProcessors/htmlTableProcessor.js';
import { processCsvBlocks } from './blockProcessors/csvProcessor.js';
import { processKeyValueBlocks } from './blockProcessors/keyValueProcessor.js';
// We can easily add more processors here, like processYamlBlocks

// The pipeline of processors, in order of precedence.
// We must find "tight" structures (JSON, HTML) before
// "loose" structures (Key-Value).
const processors = [
  processJsonBlocks,
  processHtmlTableBlocks,
  processCsvBlocks,
  processKeyValueBlocks,
  // ... add new processors here
];

export async function parseFileContent(content, mimetype) {
  let textContent = content;

  if (mimetype === 'application/pdf') {
    try {
      console.log('Parsing as PDF...');
      const data = await pdf(content);
      textContent = data.text; // The extracted text
    } catch (pdfError) {
      console.error('PDF parsing failed:', pdfError.message);
      // Throw a specific error if pdf-parse fails
      throw new Error(`Failed to parse PDF: ${pdfError.message}`);
    }
  } else {
    // If it's .txt, .md, .csv, etc., convert the Buffer to a string
    console.log('Parsing as text...');
    textContent = content.toString('utf-8');
  }

  // 2. Initialize the parsing context
  // Each processor will modify this object.
  const context = {
    originalText: textContent,
    remainingText: textContent, // The text left to parse
    allParsedData: [],           // All *structured* objects we find
    fragmentsSummary: {
      json_fragments: 0,
      html_tables: 0,
      csv_sections: 0,
      kv_pairs: 0,
      malformed_fragments: 0,
    },
  };

  // 3. Run the pipeline
  for (const processor of processors) {
    // Each processor finds its blocks, parses them,
    // adds data to `allParsedData`, and "removes"
    // the block from `remainingText` so others don't parse it.
    await processor(context);
  }

  // 4. Handle "leftover" free text (optional)
  // At this point, context.remainingText is just the "noise"
  // We could analyze it for sentiment, entities, etc., or just ignore it.

  // 5. Data Cleaning & Canonicalization
  // We apply this *after* all blocks are parsed.
  // const cleanedData = context.allParsedData.map(record => cleanRecord(record));

  return { 
    parsedData: context.allParsedData, 
    fragmentsSummary: context.fragmentsSummary 
  };
}
