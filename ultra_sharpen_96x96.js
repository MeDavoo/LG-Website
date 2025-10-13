const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

// Source and destination folders
const inputFolder = path.join(__dirname, 'pokemon_96x96_final');
const outputFolder = path.join(__dirname, 'pokemon_96x96_sharpened');

// Ensure destination exists
if (!fs.existsSync(outputFolder)) {
  fs.mkdirSync(outputFolder, { recursive: true });
}

/**
 * IMPROVED sharpening - strong but stable, no artifacts
 */
function improvedSharpen(srcCanvas) {
  const w = srcCanvas.width;
  const h = srcCanvas.height;
  const ctx = srcCanvas.getContext('2d');
  
  // Get original image data
  const original = ctx.getImageData(0, 0, w, h);
  const data = original.data;
  const output = new Uint8ClampedArray(data);
  
  // Single pass with proper clamping - more reliable
  // Standard unsharp mask with stronger parameters
  const amount = 2.0;  // Stronger than normal (typically 0.5-1.5)
  const radius = 1;
  const threshold = 3;
  
  // Create blurred version for unsharp mask
  const blurred = new Uint8ClampedArray(data);
  
  // Simple box blur
  for (let y = radius; y < h - radius; y++) {
    for (let x = radius; x < w - radius; x++) {
      for (let c = 0; c < 3; c++) { // RGB only
        let sum = 0;
        let count = 0;
        
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const idx = ((y + dy) * w + (x + dx)) * 4 + c;
            sum += data[idx];
            count++;
          }
        }
        
        const idx = (y * w + x) * 4 + c;
        blurred[idx] = sum / count;
      }
    }
  }
  
  // Apply unsharp mask with careful clamping
  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const original_val = data[i + c];
      const blurred_val = blurred[i + c];
      const diff = original_val - blurred_val;
      
      // Only sharpen if difference is above threshold
      if (Math.abs(diff) > threshold) {
        let sharpened = original_val + (amount * diff);
        
        // CRITICAL: Proper clamping to prevent white pixels
        output[i + c] = Math.max(0, Math.min(255, Math.round(sharpened)));
      } else {
        output[i + c] = original_val;
      }
    }
    // Preserve alpha
    output[i + 3] = data[i + 3];
  }
  
  // Create new ImageData and put it back
  const sharpened = ctx.createImageData(w, h);
  sharpened.data.set(output);
  ctx.putImageData(sharpened, 0, 0);
  
  return srcCanvas;
}

async function processImage(inputPath, outputPath) {
  try {
    console.log(`🔧 Improved sharpening: ${path.basename(inputPath)}`);
    
    const image = await loadImage(inputPath);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(image, 0, 0);
    
    // Apply improved sharpening (no more artifacts)
    improvedSharpen(canvas);
    
    // Save with maximum quality
    const buffer = canvas.toBuffer('image/png', { 
      compressionLevel: 0,  // No compression for maximum quality
      filters: canvas.PNG_FILTER_NONE 
    });
    
    fs.writeFileSync(outputPath, buffer);
    console.log(`✅ Sharpened: ${path.basename(outputPath)}`);
    
  } catch (error) {
    console.error(`❌ Error processing ${inputPath}:`, error.message);
  }
}

async function processAllImages() {
  console.log('🚀 Starting IMPROVED sharpening process...');
  console.log(`📂 Input:  ${inputFolder}`);
  console.log(`📂 Output: ${outputFolder}`);
  
  const files = fs.readdirSync(inputFolder);
  const imageFiles = files.filter(file => /\.(png|jpg|jpeg|gif)$/i.test(file));
  
  if (imageFiles.length === 0) {
    console.log('⚠️  No image files found in input folder.');
    return;
  }
  
  console.log(`📊 Found ${imageFiles.length} images to process`);
  
  for (const file of imageFiles) {
    const inputPath = path.join(inputFolder, file);
    const outputPath = path.join(outputFolder, file);
    await processImage(inputPath, outputPath);
  }
  
  console.log('\n🎉 SHARPENING COMPLETE!');
  console.log('💡 Images should now be sharper without artifacts!');
}

// Run the processing
processAllImages().catch(console.error);