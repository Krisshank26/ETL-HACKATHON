import { parse } from 'csv-parse/sync';

// This regex finds *potential* CSV blocks.
// It looks for a block of 3 or more consecutive lines,
// where each line contains at least one comma.
// (?:^|[\n\r]) - Ensures it starts on a new line.
// ([^\n,]+(,[^\n,]+)+) - A line with at least one comma
// ([\n\r]|$){3,} - Followed by 3 or more newlines (or end of string)
const CSV_BLOCK_REGEX = /(?:^|[\n\r])((?:[^\n,]+(?:,[^\n,]+)+)(?:[\n\r]|$)){3,}/g;

export async function processCsvBlocks(context) {
  const text = context.remainingText;
  let newText = text;

  newText = text.replace(CSV_BLOCK_REGEX, (blockMatch) => {
    // Trim whitespace to avoid empty rows
    const block = blockMatch.trim();

    // --- Validation Step ---
    // Now we validate if all lines *actually* have the same comma count.
    const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 3) return blockMatch; // Not enough rows

    const headerCommaCount = (lines[0].match(/,/g) || []).length;
    if (headerCommaCount === 0) return blockMatch; // Not a CSV

    const allSameCount = lines.every(
      line => (line.match(/,/g) || []).length === headerCommaCount
    );

    if (!allSameCount) {
      // This block has varying comma counts, it's not a uniform CSV.
      // Leave it for another parser (like KV) to handle.
      return blockMatch;
    }

    // --- Parsing Step ---
    // Validation passed. Try to parse as CSV.
    try {
      const records = parse(block, {
        columns: true, // Use first line as headers
        skip_empty_lines: true,
        trim: true,
        relax_column_count: false, // Ensure all rows match header
      });

      if (records.length > 0) {
        context.allParsedData.push(...records);
        context.fragmentsSummary.csv_sections++;
        return `\n__CSV_BLOCK_${context.fragmentsSummary.csv_sections}__\n`;
      }

      // Parser ran but found no records.
      return blockMatch;

    } catch (e) {
      // Parsing failed (e.g., malformed quotes)
      console.warn('Failed to parse CSV-like block:', e.message);
      return blockMatch; // Leave it
    }
  });

  context.remainingText = newText;
}