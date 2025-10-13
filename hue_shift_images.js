const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

// Input and output folders
const inputFolder = path.join(__dirname, 'pokemon_images');
const outputFolder = path.join(__dirname, 'pokemon_images_hue_shifted');

// Create output folder if it doesn't exist
if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder, { recursive: true });
}

// Function to convert RGB to HSL
function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    
    if (max === min) {
        h = s = 0; // achromatic
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    
    return [h * 360, s * 100, l * 100];
}

// Function to convert HSL to RGB
function hslToRgb(h, s, l) {
    h /= 360;
    s /= 100;
    l /= 100;
    
    const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
    };
    
    let r, g, b;
    
    if (s === 0) {
        r = g = b = l; // achromatic
    } else {
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// Get hue shift amount from command line argument or use default
function getHueShift() {
    const args = process.argv.slice(2);
    if (args.length > 0) {
        const shift = parseInt(args[0]);
        if (isNaN(shift)) {
            console.log('❌ Invalid hue shift value. Please provide a number between 1-359.');
            process.exit(1);
        }
        if (shift < 1 || shift > 359) {
            console.log('❌ Hue shift must be between 1-359 degrees.');
            process.exit(1);
        }
        return shift;
    }
    
    // Default shift if no argument provided
    console.log('ℹ️  No hue shift specified. Using default +120 degrees.');
    console.log('   Usage: node hue_shift_images.js [degrees]');
    console.log('   Example: node hue_shift_images.js 180');
    return 120;
}

// Function to shift hue of image data
function shiftHue(imageData, hueShift) {
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        
        // Skip transparent pixels
        if (a === 0) continue;
        
        // Convert to HSL
        const [h, s, l] = rgbToHsl(r, g, b);
        
        // Shift hue
        let newHue = (h + hueShift) % 360;
        if (newHue < 0) newHue += 360;
        
        // Convert back to RGB
        const [newR, newG, newB] = hslToRgb(newHue, s, l);
        
        // Update pixel data
        data[i] = newR;
        data[i + 1] = newG;
        data[i + 2] = newB;
        // Keep original alpha
    }
    
    return imageData;
}

// Function to process a single image
async function processImage(inputPath, outputPath, hueShift) {
    try {
        console.log(`🎨 Processing: ${path.basename(inputPath)}`);
        
        // Load the image
        const image = await loadImage(inputPath);
        
        // Create canvas with same dimensions
        const canvas = createCanvas(image.width, image.height);
        const ctx = canvas.getContext('2d');
        
        // Draw image to canvas
        ctx.drawImage(image, 0, 0);
        
        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        console.log(`   🌈 Applying hue shift: +${hueShift}°`);
        
        // Apply hue shift
        const shiftedImageData = shiftHue(imageData, hueShift);
        
        // Put the modified data back to canvas
        ctx.putImageData(shiftedImageData, 0, 0);
        
        // Save the modified image
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(outputPath, buffer);
        
        console.log(`   ✅ Saved: ${path.basename(outputPath)}`);
        
    } catch (error) {
        console.log(`   ❌ Error processing ${path.basename(inputPath)}:`, error.message);
        throw error;
    }
}

// Main function to process all images
async function processAllImages() {
    try {
        // Get the hue shift amount
        const hueShift = getHueShift();
        
        console.log('🎨 Starting hue shift processing...');
        console.log(`🌈 Hue shift amount: +${hueShift}° (applied to ALL images)`);
        console.log(`📁 Input folder: ${inputFolder}`);
        console.log(`📁 Output folder: ${outputFolder}`);
        
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
                
                await processImage(inputPath, outputPath, hueShift);
                processedCount++;
                
                // Small delay to prevent overwhelming the system
                await new Promise(resolve => setTimeout(resolve, 50));
                
            } catch (error) {
                console.log(`❌ Failed to process ${file}:`, error.message);
                errorCount++;
            }
        }
        
        console.log(`\n✅ Hue shift processing complete!`);
        console.log(`🌈 Applied +${hueShift}° hue shift to all images`);
        console.log(`🎨 Successfully processed: ${processedCount} images`);
        console.log(`❌ Failed to process: ${errorCount} images`);
        console.log(`📁 Hue-shifted images saved to: ${outputFolder}`);
        
        process.exit(0);
        
    } catch (error) {
        console.error('💥 Error:', error);
        process.exit(1);
    }
}

// Run the processing
processAllImages();