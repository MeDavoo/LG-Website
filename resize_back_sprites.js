const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

// Input and output folders
const inputFolder = path.join(__dirname, 'pokemon_images_back_sprites');
const outputFolder = path.join(__dirname, 'pokemon_images_back_sprites_resized');

// Create output folder if it doesn't exist
if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder, { recursive: true });
}

// Configuration for resizing back sprites
const config = {
    // Target size for all back sprites
    targetSize: 160,         // All back sprites will be 160x160
    
    // Pixel density
    pixelDensity: 2,         // 2x pixel density
    
    // Quality settings
    useHighQualityScaling: true,
    maintainAspectRatio: true,
    addPadding: true,        // Add transparent padding if needed
};

// Function to calculate dimensions maintaining aspect ratio
function calculateDimensions(originalWidth, originalHeight, targetSize) {
    const aspectRatio = originalWidth / originalHeight;
    
    let newWidth, newHeight;
    
    if (originalWidth > originalHeight) {
        // Landscape orientation
        newWidth = targetSize;
        newHeight = Math.round(targetSize / aspectRatio);
    } else {
        // Portrait or square orientation
        newHeight = targetSize;
        newWidth = Math.round(targetSize * aspectRatio);
    }
    
    // Ensure dimensions don't exceed target size
    if (newWidth > targetSize) {
        newWidth = targetSize;
        newHeight = Math.round(targetSize / aspectRatio);
    }
    if (newHeight > targetSize) {
        newHeight = targetSize;
        newWidth = Math.round(targetSize * aspectRatio);
    }
    
    return { newWidth, newHeight };
}

// Function to resize back sprite with high quality (bottom-aligned)
function resizeBackSprite(canvas, ctx, image, targetSize) {
    const { width: originalWidth, height: originalHeight } = image;
    
    // Calculate new dimensions
    const { newWidth, newHeight } = calculateDimensions(originalWidth, originalHeight, targetSize);
    
    // Set canvas size to target size (with padding if needed)
    canvas.width = targetSize * config.pixelDensity;
    canvas.height = targetSize * config.pixelDensity;
    
    // Scale context for pixel density
    ctx.scale(config.pixelDensity, config.pixelDensity);
    
    // Clear canvas with transparent background
    ctx.clearRect(0, 0, targetSize, targetSize);
    
    // Calculate padding - center horizontally, align to bottom vertically
    const paddingX = config.addPadding ? (targetSize - newWidth) / 2 : 0;
    const paddingY = config.addPadding ? (targetSize - newHeight) : 0; // Bottom-aligned
    
    // Apply high-quality scaling
    if (config.useHighQualityScaling) {
        // Use bicubic-like scaling for better quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
    }
    
    // Draw the resized image (bottom-aligned)
    ctx.drawImage(
        image,
        paddingX, paddingY,     // Destination position (centered horizontally, bottom-aligned vertically)
        newWidth, newHeight     // Destination size
    );
    
    return {
        targetSize,
        newWidth,
        newHeight,
        paddingX,
        paddingY,
        pixelDensity: config.pixelDensity,
        alignment: 'bottom-aligned'
    };
}

// Function to process a single back sprite
async function processBackSprite(inputPath, outputPath) {
    try {
        console.log(`🔄 Processing: ${path.basename(inputPath)}`);
        
        // Load the image
        const image = await loadImage(inputPath);
        const { width: originalWidth, height: originalHeight } = image;
        
        console.log(`   📐 Original: ${originalWidth}x${originalHeight}`);
        console.log(`   🎯 Target: ${config.targetSize}x${config.targetSize}`);
        
        // Create canvas
        const canvas = createCanvas(100, 100); // Will be resized in resizeBackSprite
        const ctx = canvas.getContext('2d');
        
        // Resize the back sprite
        const result = resizeBackSprite(canvas, ctx, image, config.targetSize);
        
        console.log(`   ✨ Resized to: ${result.newWidth}x${result.newHeight} (${result.alignment})`);
        console.log(`   📐 Position: centered horizontally, bottom-aligned vertically`);
        console.log(`   🎨 Pixel density: ${result.pixelDensity}x`);
        console.log(`   📦 Canvas size: ${canvas.width}x${canvas.height}px`);
        
        // Save the resized back sprite
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(outputPath, buffer);
        
        console.log(`   ✅ Saved: ${path.basename(outputPath)}`);
        
        return result;
        
    } catch (error) {
        console.log(`   ❌ Error processing ${path.basename(inputPath)}:`, error.message);
        throw error;
    }
}

// Main function to process all back sprites
async function processAllBackSprites() {
    try {
        console.log('🔄 Starting back sprite resizing...');
        console.log(`📁 Input folder: ${inputFolder}`);
        console.log(`📁 Output folder: ${outputFolder}`);
        console.log('');
        console.log('⚙️  Back Sprite Resize Configuration:');
        console.log(`   📏 Target size: ${config.targetSize}x${config.targetSize}px (uniform for all back sprites)`);
        console.log(`   📐 Alignment: Bottom-aligned (Pokemon feet touch bottom edge)`);
        console.log(`   🎨 Pixel density: ${config.pixelDensity}x`);
        console.log(`   🎯 Maintain aspect ratio: ${config.maintainAspectRatio}`);
        console.log(`   📦 Add padding: ${config.addPadding} (transparent top/side padding)`);
        console.log(`   ✨ High quality scaling: ${config.useHighQualityScaling}`);
        console.log('');
        
        // Check if input folder exists
        if (!fs.existsSync(inputFolder)) {
            console.log('❌ Back sprites folder does not exist!');
            console.log('   Please run the back sprite creation script first');
            process.exit(1);
        }
        
        // Get all image files
        const files = fs.readdirSync(inputFolder);
        const imageFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'].includes(ext);
        });
        
        console.log(`📦 Found ${imageFiles.length} back sprite files to resize`);
        
        if (imageFiles.length === 0) {
            console.log('❌ No image files found in back sprites folder!');
            console.log('   Please run: node create_back_sprites.js first');
            process.exit(1);
        }
        
        let processedCount = 0;
        let errorCount = 0;
        
        // Process each back sprite
        for (const file of imageFiles) {
            try {
                const inputPath = path.join(inputFolder, file);
                const outputPath = path.join(outputFolder, file);
                
                // Skip if output file already exists
                if (fs.existsSync(outputPath)) {
                    console.log(`⏭️  Skipping ${file} (already exists)`);
                    continue;
                }
                
                await processBackSprite(inputPath, outputPath);
                processedCount++;
                
                // Small delay to prevent overwhelming the system
                await new Promise(resolve => setTimeout(resolve, 50));
                
            } catch (error) {
                console.log(`❌ Failed to process ${file}:`, error.message);
                errorCount++;
            }
        }
        
        console.log(`\n✅ Back sprite resizing complete!`);
        console.log(`🔄 Successfully processed: ${processedCount} back sprites`);
        console.log(`❌ Failed to process: ${errorCount} back sprites`);
        console.log(`📏 All back sprites resized to: ${config.targetSize}x${config.targetSize}px`);
        console.log(`🎨 All back sprites have ${config.pixelDensity}x pixel density`);
        console.log(`📁 Resized back sprites saved to: ${outputFolder}`);
        console.log('');
        console.log('💡 Back Sprite Features:');
        console.log('   - Uniform 160x160 size for consistent back sprite display');
        console.log('   - Bottom-aligned: Pokemon feet touch the bottom edge');
        console.log('   - Horizontally centered with transparent side padding');
        console.log('   - Aspect ratio preserved with transparent top padding');
        console.log('   - High-quality scaling maintains back sprite details');
        console.log('   - 2x pixel density for crisp display on retina screens');
        console.log('   - Perfect for game UIs where Pokemon stand on ground level');
        
        process.exit(0);
        
    } catch (error) {
        console.error('💥 Error:', error);
        process.exit(1);
    }
}

// Run the processing
processAllBackSprites();