import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const RESULTS_DIR = './results';
const OUTPUT_FILE = './extracts/descriptions.json';

/**
 * Extract all descriptions from result files
 */
async function extractDescriptions() {
  console.log('🔍 Starting description extraction...\n');

  try {
    // Read all files from results directory
    const files = await fs.readdir(RESULTS_DIR);

    // Filter for JSON files (excluding summary)
    const jsonFiles = files.filter(file =>
      file.endsWith('.json') &&
      !file.includes('summary')
    );

    if (jsonFiles.length === 0) {
      console.log('⚠️  No result files found in ./results directory');
      return;
    }

    console.log(`📁 Found ${jsonFiles.length} result files`);
    console.log(`📂 Reading from: ${RESULTS_DIR}\n`);

    const allDescriptions = [];
    const metadata = {
      extractedAt: new Date().toISOString(),
      totalFiles: jsonFiles.length,
      totalImages: 0,
      successfulDescriptions: 0,
      failedImages: 0
    };

    // Process each file
    for (const file of jsonFiles) {
      const filePath = path.join(RESULTS_DIR, file);

      try {
        const content = await fs.readFile(filePath, 'utf8');
        const data = JSON.parse(content);

        // Extract descriptions from successful results
        if (data.results && Array.isArray(data.results)) {
          for (const result of data.results) {
            metadata.totalImages++;

            if (result.success && result.description) {
              allDescriptions.push({
                image: result.image,
                description: result.description,
                timestamp: result.timestamp,
                tokens: result.usage?.total_tokens || null
              });
              metadata.successfulDescriptions++;
            }
          }
        }

        // Count failed images
        if (data.errors && Array.isArray(data.errors)) {
          metadata.failedImages += data.errors.length;
          metadata.totalImages += data.errors.length;
        }

      } catch (error) {
        console.error(`   ❌ Error reading ${file}: ${error.message}`);
      }
    }

    // Prepare output
    const output = {
      metadata,
      descriptions: allDescriptions.map(item => item.description)
    };

    const detailedOutput = {
      metadata,
      descriptions: allDescriptions
    };

    // Save both versions
    await fs.writeFile(
      OUTPUT_FILE,
      JSON.stringify(output, null, 2),
      'utf8'
    );

    const detailedOutputFile = OUTPUT_FILE.replace('.json', '-detailed.json');
    await fs.writeFile(
      detailedOutputFile,
      JSON.stringify(detailedOutput, null, 2),
      'utf8'
    );

    // Print summary
    console.log('='.repeat(50));
    console.log('📊 EXTRACTION SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total result files processed: ${metadata.totalFiles}`);
    console.log(`Total images found: ${metadata.totalImages}`);
    console.log(`✅ Successful descriptions: ${metadata.successfulDescriptions}`);
    console.log(`❌ Failed images: ${metadata.failedImages}`);
    console.log('='.repeat(50));
    console.log(`\n💾 Descriptions saved to:`);
    console.log(`   - ${OUTPUT_FILE} (simple list)`);
    console.log(`   - ${detailedOutputFile} (with metadata)`);
    console.log('\n✨ Extraction complete!\n');

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run extraction
extractDescriptions();
