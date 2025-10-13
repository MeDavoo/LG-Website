const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

// Input and output folders
const inputFolder = path.join(__dirname, 'pokemon_images');
const outputFolder = path.join(__dirname, 'pokemon_images_resized');

// Create output folder if it doesn't exist
if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder, { recursive: true });
}

// Configuration for resizing
const config = {
    // Target sizes based on original image size
    smallTargetSize: 160,    // For smaller images
    largeTargetSize: 192,    // For larger images
    sizeThreshold: 300,      // If original is above this, use large size
    
    // Pixel density
    pixelDensity: 2,         // 2x pixel density
    
    // Quality settings
    useHighQualityScaling: true,
    maintainAspectRatio: true,
    addPadding: true,        // Add transparent padding if needed
};

// Function to determine target size based on original dimensions
function getTargetSize(originalWidth, originalHeight) {
    const maxDimension = Math.max(originalWidth, originalHeight);
    
    if (maxDimension >= config.sizeThreshold) {
        return config.largeTargetSize;
    } else {
        return config.smallTargetSize;
    }
}

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

// Function to resize image with high quality
function resizeImage(canvas, ctx, image, targetSize) {
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
    
    // Calculate padding to center the image
    const paddingX = config.addPadding ? (targetSize - newWidth) / 2 : 0;
    const paddingY = config.addPadding ? (targetSize - newHeight) / 2 : 0;
    
    // Apply high-quality scaling
    if (config.useHighQualityScaling) {
        // Use bicubic-like scaling for better quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
    }
    
    // Draw the resized image
    ctx.drawImage(
        image,
        paddingX, paddingY,     // Destination position (centered)
        newWidth, newHeight     // Destination size
    );
    
    return {
        targetSize,
        newWidth,
        newHeight,
        paddingX,
        paddingY,
        pixelDensity: config.pixelDensity
    };
}

// Function to process a single image
async function processImage(inputPath, outputPath) {
    try {
        console.log(`🔄 Processing: ${path.basename(inputPath)}`);
        
        // Load the image
        const image = await loadImage(inputPath);
        const { width: originalWidth, height: originalHeight } = image;
        
        // Determine target size
        const targetSize = getTargetSize(originalWidth, originalHeight);
        
        console.log(`   📐 Original: ${originalWidth}x${originalHeight}`);
        console.log(`   🎯 Target size: ${targetSize}x${targetSize}`);
        
        // Create canvas
        const canvas = createCanvas(100, 100); // Will be resized in resizeImage
        const ctx = canvas.getContext('2d');
        
        // Resize the image
        const result = resizeImage(canvas, ctx, image, targetSize);
        
        console.log(`   ✨ Resized to: ${result.newWidth}x${result.newHeight} (centered in ${targetSize}x${targetSize})`);
        console.log(`   🎨 Pixel density: ${result.pixelDensity}x`);
        console.log(`   📦 Canvas size: ${canvas.width}x${canvas.height}px`);
        
        // Save the resized image
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(outputPath, buffer);
        
        console.log(`   ✅ Saved: ${path.basename(outputPath)}`);
        
        return result;
        
    } catch (error) {
        console.log(`   ❌ Error processing ${path.basename(inputPath)}:`, error.message);
        throw error;
    }
}

// Main function to process all images
async function processAllImages() {
    try {
        console.log('🖼️  Starting image resizing...');
        console.log(`📁 Input folder: ${inputFolder}`);
        console.log(`📁 Output folder: ${outputFolder}`);
        console.log('');
        console.log('⚙️  Resize Configuration:');
        console.log(`   📏 Small target size: ${config.smallTargetSize}x${config.smallTargetSize}px`);
        console.log(`   📏 Large target size: ${config.largeTargetSize}x${config.largeTargetSize}px`);
        console.log(`   🚪 Size threshold: ${config.sizeThreshold}px (above this = large size)`);
        console.log(`   🎨 Pixel density: ${config.pixelDensity}x`);
        console.log(`   🎯 Maintain aspect ratio: ${config.maintainAspectRatio}`);
        console.log(`   📦 Add padding: ${config.addPadding}`);
        console.log(`   ✨ High quality scaling: ${config.useHighQualityScaling}`);
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
        let smallSizeCount = 0;
        let largeSizeCount = 0;
        
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
                
                const result = await processImage(inputPath, outputPath);
                
                // Track size statistics
                if (result.targetSize === config.smallTargetSize) {
                    smallSizeCount++;
                } else {
                    largeSizeCount++;
                }
                
                processedCount++;
                
                // Small delay to prevent overwhelming the system
                await new Promise(resolve => setTimeout(resolve, 50));
                
            } catch (error) {
                console.log(`❌ Failed to process ${file}:`, error.message);
                errorCount++;
            }
        }
        
        console.log(`\n✅ Image resizing complete!`);
        console.log(`🖼️  Successfully processed: ${processedCount} images`);
        console.log(`❌ Failed to process: ${errorCount} images`);
        console.log(`📏 Resized to ${config.smallTargetSize}x${config.smallTargetSize}: ${smallSizeCount} images`);
        console.log(`📏 Resized to ${config.largeTargetSize}x${config.largeTargetSize}: ${largeSizeCount} images`);
        console.log(`🎨 All images have ${config.pixelDensity}x pixel density`);
        console.log(`📁 Resized images saved to: ${outputFolder}`);
        console.log('');
        console.log('💡 Tips:');
        console.log('   - All images maintain their aspect ratio');
        console.log('   - Transparent padding centers smaller images');
        console.log('   - High-quality scaling preserves image details');
        console.log('   - 2x pixel density provides crisp display on retina screens');
        
        process.exit(0);
        
    } catch (error) {
        console.error('💥 Error:', error);
        process.exit(1);
    }
}

// Run the processing
processAllImages();