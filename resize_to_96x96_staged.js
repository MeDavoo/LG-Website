const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

const inputFolder = path.join(__dirname, 'pokemon_correct_size_images');
const outputFolder = path.join(__dirname, 'pokemon_96x96_final');

// Create output folder
if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder, { recursive: true });
}

// Function to clean and format Pokemon name
function cleanPokemonName(filename) {
    // Remove file extension
    let name = filename.replace(/\.(png|jpg|jpeg|gif)$/i, '');
    
    // Remove stage suffixes
    name = name.replace(/_(small|medium|big)$/i, '');
    
    // Handle MEGA/GMAX prefixes - extract the base name for _1 suffix
    const megaMatch = name.match(/^(mega|gmax)[-\s]*(.+)$/i);
    if (megaMatch) {
        name = megaMatch[2]; // Get the Pokemon name after MEGA/GMAX
    }
    
    // Clean up the name - remove special characters except spaces and convert to uppercase
    name = name.replace(/[-_]/g, ' ')  // Replace dashes and underscores with spaces
               .replace(/\s+/g, ' ')   // Replace multiple spaces with single space
               .trim()                 // Remove leading/trailing spaces
               .toUpperCase();         // Convert to uppercase
    
    // Remove spaces for final filename
    return name.replace(/\s/g, '');
}

// Function to get scaling factor based on stage suffix (BETTER size differences with more quality)
function getScalingFactor(filename) {
    if (filename.includes('_small')) {
        return 0.50; // Small Pokemon take up 50% of the canvas (better quality!)
    } else if (filename.includes('_medium')) {
        return 0.70; // Medium Pokemon take up 70% of the canvas 
    } else if (filename.includes('_big')) {
        return 0.90; // Big Pokemon take up 90% of the canvas (nearly full!)
    }
    
    // Default to medium if no suffix found
    return 0.70;
}

// Function to resize image with MAXIMUM QUALITY scaling and centering
async function resizeImageWithScaling(inputPath, outputPath, scalingFactor) {
    try {
        // Load the original image
        const originalImage = await loadImage(inputPath);
        
        // Use MUCH HIGHER resolution for intermediate processing (4x higher)
        const superHighRes = 768; // 8x the final size for ultra-smooth downsampling
        const tempCanvas = createCanvas(superHighRes, superHighRes);
        const tempCtx = tempCanvas.getContext('2d');
        
        // Enable MAXIMUM quality settings
        tempCtx.imageSmoothingEnabled = true;
        tempCtx.imageSmoothingQuality = 'high';
        tempCtx.textRenderingOptimization = 'optimizeQuality';
        tempCtx.antialias = 'default';
        
        // Clear with transparent background
        tempCtx.clearRect(0, 0, superHighRes, superHighRes);
        
        // Calculate dimensions for the scaled image at super high resolution
        const maxSize = superHighRes * scalingFactor;
        
        // Calculate aspect ratio and dimensions with better precision
        let newWidth, newHeight;
        const aspectRatio = originalImage.width / originalImage.height;
        
        if (aspectRatio > 1) {
            // Image is wider than tall
            newWidth = Math.round(maxSize);
            newHeight = Math.round(maxSize / aspectRatio);
        } else {
            // Image is taller than wide or square
            newHeight = Math.round(maxSize);
            newWidth = Math.round(maxSize * aspectRatio);
        }
        
        // Center the image on the super high-res canvas with pixel-perfect positioning
        const x = Math.round((superHighRes - newWidth) / 2);
        const y = Math.round((superHighRes - newHeight) / 2);
        
        // Draw at super high resolution with best quality
        tempCtx.drawImage(originalImage, x, y, newWidth, newHeight);
        
        // Now create intermediate canvas at 384x384 for better downsampling
        const midCanvas = createCanvas(384, 384);
        const midCtx = midCanvas.getContext('2d');
        midCtx.imageSmoothingEnabled = true;
        midCtx.imageSmoothingQuality = 'high';
        
        // First downsample: 768px → 384px (2:1 ratio - optimal for quality)
        midCtx.drawImage(tempCanvas, 0, 0, superHighRes, superHighRes, 0, 0, 384, 384);
        
        // Now create the final 96x96 canvas with premium settings
        const finalCanvas = createCanvas(96, 96);
        const finalCtx = finalCanvas.getContext('2d');
        
        // Use premium quality settings for final downsample
        finalCtx.imageSmoothingEnabled = true;
        finalCtx.imageSmoothingQuality = 'high';
        finalCtx.textRenderingOptimization = 'optimizeQuality';
        
        // Final downsample: 384px → 96px (4:1 ratio - maintains sharpness)
        finalCtx.drawImage(midCanvas, 0, 0, 384, 384, 0, 0, 96, 96);
        
        // Save with maximum PNG quality (no compression)
        const buffer = finalCanvas.toBuffer('image/png', { 
            compressionLevel: 0,  // No compression for maximum quality
            filters: finalCanvas.PNG_FILTER_NONE 
        });
        fs.writeFileSync(outputPath, buffer);
        
        return true;
    } catch (error) {
        console.error(`Error processing ${inputPath}:`, error.message);
        return false;
    }
}

// Main function to process all images
async function processAllImages() {
    try {
        console.log('🎨 Starting ULTRA-QUALITY Pokemon image processing with dramatic size differences...');
        
        // Get all image files from input folder
        const files = fs.readdirSync(inputFolder).filter(file => 
            /\.(png|jpg|jpeg|gif)$/i.test(file)
        );
        
        console.log(`📋 Found ${files.length} images to process`);
        
        // Track statistics
        let processed = 0;
        let failed = 0;
        const nameTracker = {}; // Track duplicate names
        
        // Process each image
        for (const file of files) {
            try {
                const inputPath = path.join(inputFolder, file);
                
                // Get clean Pokemon name
                let cleanName = cleanPokemonName(file);
                
                // Check if this is a MEGA/GMAX variant
                const isMegaVariant = file.toLowerCase().includes('mega') || 
                                    file.toLowerCase().includes('gmax') || 
                                    file.toLowerCase().includes('gigantamax');
                
                // FIXED: Handle naming to ensure normal Pokemon get base name
                let finalName = cleanName;
                
                if (isMegaVariant) {
                    // MEGA variants always get _1 suffix
                    finalName = `${cleanName}_1`;
                    // Reserve the base name for normal Pokemon
                    if (!nameTracker[cleanName]) {
                        nameTracker[cleanName] = { normal: false, mega: true };
                    } else {
                        nameTracker[cleanName].mega = true;
                    }
                } else {
                    // Normal Pokemon - check if base name is available
                    if (!nameTracker[cleanName]) {
                        // Base name available - use it
                        nameTracker[cleanName] = { normal: true, mega: false };
                        finalName = cleanName;
                    } else if (nameTracker[cleanName].normal) {
                        // Base name taken by another normal Pokemon - add number
                        let counter = 2;
                        while (nameTracker[`${cleanName}_${counter}`]) {
                            counter++;
                        }
                        finalName = `${cleanName}_${counter}`;
                        nameTracker[`${cleanName}_${counter}`] = { normal: true, mega: false };
                    } else {
                        // Base name reserved but not used - use it
                        nameTracker[cleanName].normal = true;
                        finalName = cleanName;
                    }
                }
                
                const outputPath = path.join(outputFolder, `${finalName}.png`);
                
                // Get scaling factor based on stage
                const scalingFactor = getScalingFactor(file);
                
                // Determine stage name for logging
                let stageName = 'medium';
                if (file.includes('_small')) stageName = 'small';
                else if (file.includes('_big')) stageName = 'big';
                
                console.log(`🔄 Processing ${file} → ${finalName}.png (${stageName}: ${Math.round(scalingFactor * 100)}% scale - HIGH QUALITY!)`);
                
                // Resize and save the image
                const success = await resizeImageWithScaling(inputPath, outputPath, scalingFactor);
                
                if (success) {
                    processed++;
                    console.log(`✅ Completed: ${finalName}.png`);
                } else {
                    failed++;
                    console.log(`❌ Failed: ${file}`);
                }
                
                // Small delay to prevent overwhelming the system
                await new Promise(resolve => setTimeout(resolve, 50));
                
            } catch (error) {
                console.error(`💥 Error processing ${file}:`, error.message);
                failed++;
            }
        }
        
        console.log('\n🎉 Processing completed!');
        console.log(`✅ Successfully processed: ${processed} images`);
        console.log(`❌ Failed: ${failed} images`);
        console.log(`📁 96x96px images saved to: ${outputFolder}`);
        
        // Show scaling distribution
        const scaleStats = {
            small: files.filter(f => f.includes('_small')).length,
            medium: files.filter(f => f.includes('_medium')).length,
            big: files.filter(f => f.includes('_big')).length
        };
        
        console.log('\n📊 ULTRA-QUALITY Size Scaling distribution:');
        console.log(`🐣 Small (50% scale - crisp & clear!): ${scaleStats.small} Pokemon`);
        console.log(`🐾 Medium (70% scale - sharp medium!): ${scaleStats.medium} Pokemon`);
        console.log(`🦾 Big (90% scale - crystal clear big!): ${scaleStats.big} Pokemon`);
        
        // Show some examples of renamed files
        console.log('\n📝 Example naming:');
        const examples = files.slice(0, 5);
        examples.forEach(file => {
            const cleanName = cleanPokemonName(file);
            console.log(`  ${file} → ${cleanName}.png`);
        });
        
    } catch (error) {
        console.error('💥 Error during processing:', error);
    }
}

// Run the processing
console.log('🚀 Starting ULTRA-QUALITY 96x96px Pokemon with BETTER size differences (50%, 70%, 90%) + maximum quality preservation!');
processAllImages();