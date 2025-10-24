import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  // OpenAI API key from environment variables
  apiKey: process.env.OPENAI_API_KEY,

  // Model to use (gpt-4o is the latest vision model)
  model: process.env.MODEL || 'gpt-4o',

  // Directory containing images to process
  imagesDir: process.env.IMAGES_DIR || './images',

  // Output file for results
  outputFile: process.env.OUTPUT_FILE || './results.json',

  // Prompt to send with each image
  prompt: process.env.PROMPT || 'Describe this image in detail, including any text, objects, people, and activities visible.',

  // Maximum tokens for the response
  maxTokens: parseInt(process.env.MAX_TOKENS) || 500,

  // Concurrent requests (be careful with rate limits)
  concurrency: parseInt(process.env.CONCURRENCY) || 5,

  // Delay between batches (in milliseconds)
  batchDelay: parseInt(process.env.BATCH_DELAY) || 1000,

  // Supported image extensions
  imageExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],

  // Retry configuration
  maxRetries: 3,
  retryDelay: 2000
};

class ImageBatchProcessor {
  constructor(config) {
    this.config = config;
    this.openai = new OpenAI({ apiKey: config.apiKey });
    this.results = [];
    this.errors = [];
    this.processedCount = 0;
    this.totalCount = 0;
  }

  /**
   * Convert image file to base64
   */
  async imageToBase64(imagePath) {
    const imageBuffer = await fs.readFile(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const ext = path.extname(imagePath).toLowerCase();

    // Determine MIME type
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };

    const mimeType = mimeTypes[ext] || 'image/jpeg';
    return `data:${mimeType};base64,${base64Image}`;
  }

  /**
   * Analyze a single image
   */
  async analyzeImage(imagePath, retryCount = 0) {
    try {
      const base64Image = await this.imageToBase64(imagePath);

      const response = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: this.config.prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: base64Image
                }
              }
            ]
          }
        ],
        max_tokens: this.config.maxTokens
      });

      return {
        image: path.basename(imagePath),
        path: imagePath,
        success: true,
        description: response.choices[0].message.content,
        model: response.model,
        usage: response.usage,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      // Retry logic
      if (retryCount < this.config.maxRetries) {
        console.log(`   Retrying ${path.basename(imagePath)} (attempt ${retryCount + 1}/${this.config.maxRetries})...`);
        await this.delay(this.config.retryDelay);
        return this.analyzeImage(imagePath, retryCount + 1);
      }

      return {
        image: path.basename(imagePath),
        path: imagePath,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get all image files from directory
   */
  async getImageFiles() {
    try {
      const files = await fs.readdir(this.config.imagesDir);
      const imageFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return this.config.imageExtensions.includes(ext);
      });

      return imageFiles.map(file => path.join(this.config.imagesDir, file));
    } catch (error) {
      throw new Error(`Failed to read images directory: ${error.message}`);
    }
  }

  /**
   * Delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Process images in batches
   */
  async processBatch(imagePaths) {
    const promises = imagePaths.map(async (imagePath) => {
      const result = await this.analyzeImage(imagePath);
      this.processedCount++;

      const percentage = ((this.processedCount / this.totalCount) * 100).toFixed(1);
      console.log(`[${this.processedCount}/${this.totalCount}] (${percentage}%) Processed: ${path.basename(imagePath)}`);

      if (result.success) {
        this.results.push(result);
      } else {
        this.errors.push(result);
        console.error(`   ❌ Error: ${result.error}`);
      }

      return result;
    });

    await Promise.all(promises);
  }

  /**
   * Main processing function
   */
  async process() {
    console.log('🚀 Starting batch image processing...\n');

    // Validate API key
    if (!this.config.apiKey) {
      throw new Error('OPENAI_API_KEY is not set in environment variables');
    }

    // Get all image files
    console.log(`📁 Reading images from: ${this.config.imagesDir}`);
    const imageFiles = await this.getImageFiles();
    this.totalCount = imageFiles.length;

    if (this.totalCount === 0) {
      console.log('⚠️  No images found in the directory');
      return;
    }

    console.log(`📸 Found ${this.totalCount} images to process`);
    console.log(`🤖 Using model: ${this.config.model}`);
    console.log(`💬 Prompt: "${this.config.prompt}"`);
    console.log(`⚡ Concurrency: ${this.config.concurrency}\n`);

    // Process in batches
    for (let i = 0; i < imageFiles.length; i += this.config.concurrency) {
      const batch = imageFiles.slice(i, i + this.config.concurrency);
      await this.processBatch(batch);

      // Delay between batches (except for the last batch)
      if (i + this.config.concurrency < imageFiles.length) {
        await this.delay(this.config.batchDelay);
      }
    }

    // Save results
    await this.saveResults();

    // Print summary
    this.printSummary();
  }

  /**
   * Save results to JSON file
   */
  async saveResults() {
    const output = {
      metadata: {
        processedAt: new Date().toISOString(),
        totalImages: this.totalCount,
        successfulCount: this.results.length,
        errorCount: this.errors.length,
        model: this.config.model,
        prompt: this.config.prompt
      },
      results: this.results,
      errors: this.errors
    };

    await fs.writeFile(
      this.config.outputFile,
      JSON.stringify(output, null, 2),
      'utf8'
    );

    console.log(`\n💾 Results saved to: ${this.config.outputFile}`);
  }

  /**
   * Print processing summary
   */
  printSummary() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 PROCESSING SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total images: ${this.totalCount}`);
    console.log(`✅ Successful: ${this.results.length}`);
    console.log(`❌ Failed: ${this.errors.length}`);

    if (this.results.length > 0) {
      const totalTokens = this.results.reduce((sum, r) => sum + (r.usage?.total_tokens || 0), 0);
      console.log(`🎯 Total tokens used: ${totalTokens.toLocaleString()}`);
    }

    console.log('='.repeat(50) + '\n');
  }
}

// Main execution
async function main() {
  try {
    const processor = new ImageBatchProcessor(CONFIG);
    await processor.process();
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default ImageBatchProcessor;
