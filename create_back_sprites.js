const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

// Input and output folders
const inputFolder = path.join(__dirname, 'pokemon_images');
const outputFolder = path.join(__dirname, 'pokemon_images_back_sprites');

// Create output folder if it doesn't exist
if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder, { recursive: true });
}

// Configuration for back sprite effects
const config = {
    // Basic transformations
    flipHorizontal: true,
    
    // Crop to upper portion only
    cropBottomPercentage: 0.25, // Remove bottom 25% of the image
};

// Function to create black silhouette
function makeBlackSilhouette(imageData) {
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3]; // Get alpha channel
        
        if (alpha > 0) { // If pixel is not transparent
            data[i] = 0;     // Red = 0 (black)
            data[i + 1] = 0; // Green = 0 (black)  
            data[i + 2] = 0; // Blue = 0 (black)
            // Keep original alpha (transparency)
        }
    }
}

// Function to create back sprite from front sprite
// Function to create back sprite effect
function createBackSprite(canvas, ctx, image) {
    const { width, height } = image;
    
    // Calculate crop dimensions - remove bottom portion
    const cropBottomPixels = Math.floor(height * config.cropBottomPercentage);
    const croppedHeight = height - cropBottomPixels;
    
    // Set canvas size to cropped dimensions
    canvas.width = width;
    canvas.height = croppedHeight;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, croppedHeight);
    
    // Apply horizontal flip if enabled
    if (config.flipHorizontal) {
        ctx.save();
        ctx.scale(-1, 1);
        ctx.translate(-width, 0);
    }
    
    // Draw the cropped image (upper portion only)
    ctx.drawImage(
        image,
        0, 0,                    // Source position (start from top)
        width, croppedHeight,    // Source dimensions (cropped height)
        0, 0,                    // Destination position
        width, croppedHeight     // Destination dimensions
    );
    
    // Restore transformation
    if (config.flipHorizontal) {
        ctx.restore();
    }
}

// Function to process a single image
async function processImage(inputPath, outputPath) {
    try {
        console.log(`🔄 Processing: ${path.basename(inputPath)}`);
        
        // Load the image
        const image = await loadImage(inputPath);
        
        // Create canvas
        const canvas = createCanvas(100, 100); // Will be resized in createBackSprite
        const ctx = canvas.getContext('2d');
        
        // Create the back sprite effect
        createBackSprite(canvas, ctx, image);
        
        console.log(`   🎨 Applied effects:`);
        console.log(`      🔀 Flipped horizontally: ${config.flipHorizontal}`);
        console.log(`      ✂️  Cropped bottom: ${Math.round(config.cropBottomPercentage * 100)}%`);
        
        // Save the modified image
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(outputPath, buffer);
        
        console.log(`   ✅ Saved back sprite: ${path.basename(outputPath)}`);
        
    } catch (error) {
        console.log(`   ❌ Error processing ${path.basename(inputPath)}:`, error.message);
        throw error;
    }
}

// Main function to process all images
async function processAllImages() {
    try {
        console.log('🔄 Starting back sprite creation...');
        console.log(`📁 Input folder: ${inputFolder}`);
        console.log(`📁 Output folder: ${outputFolder}`);
        console.log('⚙️  Back Sprite Configuration:');
        console.log(`   🔀 Horizontal flip: ${config.flipHorizontal}`);
        console.log(`   ✂️  Crop top: ${Math.round(config.cropTop * 100)}% (removes head area)`);
        console.log(`   ✂️  Crop bottom: ${Math.round(config.cropBottom * 100)}% (focuses on upper body)`);
        console.log(`   🌑 Darken amount: ${Math.round(config.darkenAmount * 100)}% (shadow effect)`);
        console.log(`   🎨 Saturation: ${Math.round(config.saturationReduction * 100)}% (less vibrant)`);
        console.log(`   � Blur: ${config.addSoftBlur ? `${config.blurAmount}px` : 'disabled'}`);
        console.log(`   🎭 Vignette: ${config.addVignette ? `${Math.round(config.vignetteStrength * 100)}%` : 'disabled'}`);
        console.log('');
        
        // Check if input folder exists
        if (!fs.existsSync(inputFolder)) {
            console.log('❌ Input folder does not exist!');
            console.log('   Please run the download script first to create pokemon_images folder');
            process.exit(1);
        }
        
        // Get all image files
        const files = fs.readdirSync(inputFolder);
        const imageFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'].includes(ext);
        });
        
        console.log(`📦 Found ${imageFiles.length} image files to process`);
        
        if (imageFiles.length === 0) {
            console.log('❌ No image files found in pokemon_images folder!');
            process.exit(1);
        }
        
        let processedCount = 0;
        let errorCount = 0;
        
        // Process each image
        for (const file of imageFiles) {
            try {
                const inputPath = path.join(inputFolder, file);
                const outputPath = path.join(outputFolder, file);
                
                // Skip if output file already exists
                if (fs.existsSync(outputPath)) {
                    console.log(`⏭️  Skipping ${file} (already exists)`);
                    continue;
                }
                
                await processImage(inputPath, outputPath);
                processedCount++;
                
                // Small delay to prevent overwhelming the system
                await new Promise(resolve => setTimeout(resolve, 50));
                
            } catch (error) {
                console.log(`❌ Failed to process ${file}:`, error.message);
                errorCount++;
            }
        }
        
        console.log(`\n✅ Back sprite creation complete!`);
        console.log(`🔄 Successfully processed: ${processedCount} images`);
        console.log(`❌ Failed to process: ${errorCount} images`);
        console.log(`📁 Back sprites saved to: ${outputFolder}`);
        console.log('');
        console.log('💡 Tips for customization:');
        console.log('   - Edit config object in script to adjust effects');
        console.log('   - Increase cropTop/cropBottom for more dramatic cropping');
        console.log('   - Adjust darkenAmount for more/less shadow effect');
        console.log('   - Modify saturationReduction for color intensity');
        
        process.exit(0);
        
    } catch (error) {
        console.error('💥 Error:', error);
        process.exit(1);
    }
}

// Run the processing
processAllImages();