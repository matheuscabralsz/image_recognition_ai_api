# Batch Image Analyzer with OpenAI Vision API

A powerful JavaScript script for extracting data from batches of images (200+) using OpenAI's Vision API. This tool processes images concurrently with rate limiting, error handling, and progress tracking.

## Features

- **Batch Processing**: Process 200+ images efficiently
- **Concurrent Processing**: Configurable concurrency to optimize speed while respecting rate limits
- **Base64 Encoding**: Automatic conversion of local images to base64 for API submission
- **Error Handling**: Robust retry logic with configurable attempts
- **Progress Tracking**: Real-time progress updates during processing
- **Flexible Configuration**: Environment variables for easy customization
- **Multiple Image Formats**: Supports JPG, PNG, GIF, WebP
- **Detailed Results**: JSON output with metadata, descriptions, token usage, and errors

## Prerequisites

- Node.js 18+ (required for ES modules)
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))

## Installation

1. Clone or download this repository

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file from the example:
```bash
cp .env.example .env
```

4. Edit `.env` and add your OpenAI API key:
```env
OPENAI_API_KEY=sk-your-actual-api-key-here
```

## Setup

1. **Create an images directory** and add your images:
```bash
mkdir images
# Copy your images into the images folder
```

2. **Configure settings** in `.env` (optional):
   - `MODEL`: Choose your vision model (default: `gpt-4o`)
   - `IMAGES_DIR`: Path to your images folder
   - `OUTPUT_FILE`: Where to save results
   - `PROMPT`: Custom prompt for image analysis
   - `CONCURRENCY`: Number of simultaneous requests (default: 5)
   - `MAX_TOKENS`: Maximum tokens per response

## Usage

Run the script:
```bash
npm start
```

Or directly with node:
```bash
node index.js
```

### Example Output

```
🚀 Starting batch image processing...

📁 Reading images from: ./images
📸 Found 250 images to process
🤖 Using model: gpt-4o
💬 Prompt: "Describe this image in detail..."
⚡ Concurrency: 5

[1/250] (0.4%) Processed: image001.jpg
[2/250] (0.8%) Processed: image002.jpg
[3/250] (1.2%) Processed: image003.jpg
...

💾 Results saved to: ./results.json

==================================================
📊 PROCESSING SUMMARY
==================================================
Total images: 250
✅ Successful: 248
❌ Failed: 2
🎯 Total tokens used: 125,430
==================================================
```

## Output Format

The script now saves results in batches to reduce memory usage. Instead of a single large file, you'll get:

- **Batch files**: `results0-5.json`, `results5-10.json`, etc. (one file per batch)
- **Summary file**: `results-summary.json` (overall statistics)

Each batch file contains:

```json
{
  "metadata": {
    "batchRange": "0-5",
    "processedAt": "2025-01-15T10:30:00.000Z",
    "totalImages": 5,
    "successfulCount": 5,
    "errorCount": 0,
    "model": "gpt-4o",
    "prompt": "Describe this image in detail..."
  },
  "results": [
    {
      "image": "photo001.jpg",
      "path": "./images/photo001.jpg",
      "success": true,
      "description": "The image shows a sunset over a beach...",
      "model": "gpt-4o-2024-08-06",
      "usage": {
        "prompt_tokens": 1105,
        "completion_tokens": 150,
        "total_tokens": 1255
      },
      "timestamp": "2025-01-15T10:30:15.000Z"
    }
  ],
  "errors": []
}
```

## Viewing Results with the Web Viewer

A beautiful web interface is included for viewing your results!

### Quick Start

1. **Start the web server**:
```bash
npm run viewer
```
Or directly:
```bash
node server.js
```

2. **Open your browser** to `http://localhost:3000`

3. **Load your results**:
   - Click "Select JSON Files"
   - Select all your batch files (e.g., `results0-5.json`, `results5-10.json`, etc.)
   - You can select multiple files at once (Ctrl/Cmd + Click)

### Features

- **Beautiful Gallery View**: See all images with their AI-generated descriptions
- **Batch Support**: Load multiple batch files at once
- **Statistics Dashboard**: View total images processed, success/error counts
- **Error Visualization**: Failed images are highlighted with error details
- **Responsive Design**: Works on desktop and mobile devices
- **No Backend Required**: All processing happens in the browser

### Alternative: Using Python HTTP Server

If you prefer not to use Node.js for the server:

```bash
python3 -m http.server 3000
```

Then open `http://localhost:3000/viewer.html` in your browser.

## Configuration Options

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | *required* | Your OpenAI API key |
| `MODEL` | `gpt-4o` | Vision model to use |
| `IMAGES_DIR` | `./images` | Directory containing images |
| `OUTPUT_FILE` | `./results.json` | Output file path |
| `PROMPT` | Describe this image... | Custom prompt for analysis |
| `MAX_TOKENS` | `500` | Maximum response tokens |
| `CONCURRENCY` | `5` | Concurrent requests |
| `BATCH_DELAY` | `1000` | Delay between batches (ms) |

## Supported Image Formats

- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)

## Rate Limits & Best Practices

OpenAI has rate limits based on your tier:

- **Free tier**: 3 RPM (requests per minute), 40,000 TPM (tokens per minute)
- **Tier 1**: 500 RPM, 150,000 TPM
- **Tier 2+**: Higher limits

**Recommendations:**
- For 200+ images, use `CONCURRENCY=5` and `BATCH_DELAY=1000`
- Monitor the first few runs to ensure you're not hitting rate limits
- Adjust `CONCURRENCY` lower if you see 429 errors
- Consider processing in smaller batches for very large datasets

## Customizing the Prompt

You can customize what data to extract by modifying the `PROMPT` variable:

**Examples:**

```env
# Extract text from images
PROMPT=Extract all visible text from this image and format it as plain text.

# Identify objects
PROMPT=List all objects visible in this image with their approximate locations.

# Product cataloging
PROMPT=Describe this product image including: product name, color, condition, and any visible defects or damage.

# Receipt processing
PROMPT=Extract the following from this receipt: merchant name, date, total amount, and all line items with prices.
```

## Troubleshooting

**"OPENAI_API_KEY is not set"**
- Make sure you created a `.env` file with your API key

**Rate limit errors (429)**
- Decrease `CONCURRENCY` value
- Increase `BATCH_DELAY` value

**"No images found"**
- Check that `IMAGES_DIR` path is correct
- Verify images have supported extensions

**Out of memory errors**
- The script now writes batch files automatically to minimize memory usage
- Each batch is saved to disk immediately (e.g., `results0-5.json`, `results5-10.json`)
- If issues persist, reduce `CONCURRENCY` value

## Cost Estimation

OpenAI Vision API pricing (as of January 2025):
- **gpt-4o**: ~$0.00265 per image (varies by image size and tokens)
- **gpt-4o-mini**: ~$0.0004 per image (more cost-effective)

For 200 images with gpt-4o: approximately $0.50-$1.00

## Advanced Usage

You can also import and use the processor programmatically:

```javascript
import ImageBatchProcessor from './index.js';

const processor = new ImageBatchProcessor({
  apiKey: 'your-api-key',
  model: 'gpt-4o',
  imagesDir: './my-images',
  prompt: 'Custom prompt here',
  concurrency: 3
});

await processor.process();
```

## License

ISC

## Contributing

Feel free to submit issues or pull requests for improvements!
