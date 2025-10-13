const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

// Input and output folders
const inputFolder = path.join(__dirname, 'pokemon_images_back_sprites_resized');
const outputFolder = path.join(__dirname, 'pokemon_images_back_sprites_hue_shifted');

// Create output folder if it doesn't exist
if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder, { recursive: true });
}

// Configuration for hue shifting back sprites
const config = {
    // Hue shift amount (specified by user)
    hueShift: 320, // Shift by 320 degrees
    
    // Keep exact same filenames
    preserveFilenames: true,
};

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

// Function to process a single back sprite
async function processBackSprite(inputPath, outputPath) {
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
        
        console.log(`   🌈 Applying hue shift: +${config.hueShift}°`);
        
        // Apply hue shift
        const shiftedImageData = shiftHue(imageData, config.hueShift);
        
        // Put the modified data back to canvas
        ctx.putImageData(shiftedImageData, 0, 0);
        
        // Save the modified image with exact same filename
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(outputPath, buffer);
        
        console.log(`   ✅ Saved: ${path.basename(outputPath)}`);
        
    } catch (error) {
        console.log(`   ❌ Error processing ${path.basename(inputPath)}:`, error.message);
        throw error;
    }
}

// Main function to process all back sprites
async function processAllBackSprites() {
    try {
        console.log('🎨 Starting back sprite hue shifting...');
        console.log(`📁 Input folder: ${inputFolder}`);
        console.log(`📁 Output folder: ${outputFolder}`);
        console.log(`🌈 Hue shift amount: +${config.hueShift}° (applied to ALL back sprites)`);
        console.log('');
        
        // Check if input folder exists
        if (!fs.existsSync(inputFolder)) {
            console.log('❌ Back sprites resized folder does not exist!');
            console.log('   Please run the back sprite resize script first');
            process.exit(1);
        }
        
        // Get all image files
        const files = fs.readdirSync(inputFolder);
        const imageFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'].includes(ext);
        });
        
        console.log(`📦 Found ${imageFiles.length} back sprite files to process`);
        
        if (imageFiles.length === 0) {
            console.log('❌ No image files found in back sprites resized folder!');
            process.exit(1);
        }
        
        let processedCount = 0;
        let errorCount = 0;
        
        // Process each back sprite
        for (const file of imageFiles) {
            try {
                const inputPath = path.join(inputFolder, file);
                const outputPath = path.join(outputFolder, file); // Keep exact same filename
                
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
        
        console.log(`\n✅ Back sprite hue shifting complete!`);
        console.log(`🌈 Applied +${config.hueShift}° hue shift to all back sprites`);
        console.log(`🎨 Successfully processed: ${processedCount} back sprites`);
        console.log(`❌ Failed to process: ${errorCount} back sprites`);
        console.log(`📁 Hue-shifted back sprites saved to: ${outputFolder}`);
        console.log('');
        console.log('💡 Back Sprite Hue Shift Features:');
        console.log('   - All back sprites get the same +320° hue shift');
        console.log('   - Exact same filenames preserved');
        console.log('   - Perfect for creating color variants of back sprites');
        console.log('   - Ready for use as alternative back-facing Pokemon sprites');
        console.log('   - Maintains transparency and image quality');
        
        process.exit(0);
        
    } catch (error) {
        console.error('💥 Error:', error);
        process.exit(1);
    }
}

// Run the processing
processAllBackSprites();