# Pokemon 4-Variant Generation Pipeline
# Simple PowerShell script to run existing scripts in sequence
# Usage: .\generate_variants.ps1 [hue_shift]
# Example: .\generate_variants.ps1 338
# Example: .\generate_variants.ps1 200

param(
    [int]$HueShift = 338  # Default to 338° if no parameter provided
)

# Validate hue shift parameter
if ($HueShift -lt 1 -or $HueShift -gt 359) {
    Write-Host "ERROR: Hue shift must be between 1-359 degrees!" -ForegroundColor Red
    Write-Host "Usage: .\generate_variants.ps1 [hue_shift]" -ForegroundColor Yellow
    Write-Host "Example: .\generate_variants.ps1 338" -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "Pokemon 4-Variant Generation Pipeline" -ForegroundColor Cyan
Write-Host "Hue Shift: +$HueShift degrees" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

# Check if input folder exists
if (!(Test-Path "pokemon_processing\input")) {
    Write-Host "ERROR: pokemon_processing\input folder not found!" -ForegroundColor Red
    Write-Host "Please put your images in pokemon_processing\input folder" -ForegroundColor Yellow
    pause
    exit 1
}

# Count input images
$inputImages = Get-ChildItem "pokemon_processing\input" -Filter "*.png" | Measure-Object
Write-Host "Found $($inputImages.Count) images to process" -ForegroundColor Green

Write-Host ""
Write-Host "Step 1: Resize images to 96x96 with size-based scaling..." -ForegroundColor Yellow
# Copy images from input to correct_size_images for the resize script
if (!(Test-Path "pokemon_correct_size_images")) { New-Item -ItemType Directory -Path "pokemon_correct_size_images" -Force }
Copy-Item "pokemon_processing\input\*" "pokemon_correct_size_images\" -Force
node resize_to_96x96_staged.js
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Resize failed!" -ForegroundColor Red
    pause
    exit 1
}

Write-Host ""
Write-Host "Step 2: Copy to front_normal folder with cleanup..." -ForegroundColor Yellow
if (!(Test-Path "pokemon_processing\front_normal")) { New-Item -ItemType Directory -Path "pokemon_processing\front_normal" -Force }

# Clean up any existing _2 files first to prevent conflicts
Write-Host "  Cleaning up any duplicate files..." -ForegroundColor Gray
Get-ChildItem "pokemon_96x96_final" -Filter "*_2.*" -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
Get-ChildItem "pokemon_processing\front_normal" -Filter "*_2.*" -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue

Copy-Item "pokemon_96x96_final\*" "pokemon_processing\front_normal\" -Force

Write-Host ""
Write-Host "Step 3: Apply sharpening to front_normal (ONLY sharpening step)..." -ForegroundColor Yellow
# Use ultra-aggressive sharpening script
$ultraSharpenScript = Get-Content "ultra_sharpen_96x96.js" -Raw
$modifiedUltraSharpen = $ultraSharpenScript -replace "pokemon_96x96_final", "pokemon_processing/front_normal" -replace "pokemon_96x96_sharpened", "pokemon_processing/front_normal"
Set-Content "temp_ultra_sharpen_front.js" $modifiedUltraSharpen
node temp_ultra_sharpen_front.js
Remove-Item "temp_ultra_sharpen_front.js" -Force

Write-Host ""
Write-Host "Step 4: Create front_shiny from sharpened front_normal (hue +$HueShift°)..." -ForegroundColor Yellow
if (!(Test-Path "pokemon_processing\front_shiny")) { New-Item -ItemType Directory -Path "pokemon_processing\front_shiny" -Force }

# Clean up any _2 files first
Get-ChildItem "pokemon_processing\front_shiny" -Filter "*_2.*" -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue

# Create custom hue shift script that outputs to the right folder
@"
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

const inputFolder = './pokemon_processing/front_normal';
const outputFolder = './pokemon_processing/front_shiny';
const hueShift = $HueShift;

function hslToRgb(h, s, l) {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    
    let r, g, b;
    if (0 <= h && h < 60) {
        [r, g, b] = [c, x, 0];
    } else if (60 <= h && h < 120) {
        [r, g, b] = [x, c, 0];
    } else if (120 <= h && h < 180) {
        [r, g, b] = [0, c, x];
    } else if (180 <= h && h < 240) {
        [r, g, b] = [0, x, c];
    } else if (240 <= h && h < 300) {
        [r, g, b] = [x, 0, c];
    } else {
        [r, g, b] = [c, 0, x];
    }
    
    return [
        Math.round((r + m) * 255),
        Math.round((g + m) * 255),
        Math.round((b + m) * 255)
    ];
}

function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    
    let h = 0;
    if (delta !== 0) {
        if (max === r) {
            h = ((g - b) / delta) % 6;
        } else if (max === g) {
            h = (b - r) / delta + 2;
        } else {
            h = (r - g) / delta + 4;
        }
    }
    h = Math.round(h * 60);
    if (h < 0) h += 360;
    
    const l = (max + min) / 2;
    const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
    
    return [h, s, l];
}

async function processImage(inputPath, outputPath) {
    const image = await loadImage(inputPath);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        
        if (a === 0) continue;
        
        const [h, s, l] = rgbToHsl(r, g, b);
        const newH = (h + hueShift) % 360;
        const [newR, newG, newB] = hslToRgb(newH, s, l);
        
        data[i] = newR;
        data[i + 1] = newG;
        data[i + 2] = newB;
    }
    
    ctx.putImageData(imageData, 0, 0);
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);
}

async function processAllImages() {
    const files = fs.readdirSync(inputFolder);
    const imageFiles = files.filter(file => /\.(png|jpg|jpeg|gif)$/i.test(file));
    
    console.log('Creating ' + imageFiles.length + ' front shiny images (hue +' + hueShift + '°)...');
    
    for (const file of imageFiles) {
        const inputPath = path.join(inputFolder, file);
        const outputPath = path.join(outputFolder, file);
        await processImage(inputPath, outputPath);
    }
    
    console.log('Front shiny creation complete!');
}

processAllImages().catch(console.error);
"@ | Set-Content "temp_create_front_shiny.js"
node temp_create_front_shiny.js
Remove-Item "temp_create_front_shiny.js" -Force

Write-Host ""
Write-Host "Step 5: Create back_normal from sharpened front_normal..." -ForegroundColor Yellow
if (!(Test-Path "pokemon_processing\back_normal")) { New-Item -ItemType Directory -Path "pokemon_processing\back_normal" -Force }

# Clean up any _2 files first
Get-ChildItem "pokemon_processing\back_normal" -Filter "*_2.*" -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue

# Create simple flip script (no crop) - uses SHARPENED front_normal as source
@"
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

const inputFolder = './pokemon_processing/front_normal';
const outputFolder = './pokemon_processing/back_normal';

async function flipImage(inputPath, outputPath) {
    const image = await loadImage(inputPath);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    
    ctx.scale(-1, 1);
    ctx.drawImage(image, -image.width, 0);
    
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);
}

async function processAllImages() {
    const files = fs.readdirSync(inputFolder);
    const imageFiles = files.filter(file => /\.(png|jpg|jpeg|gif)$/i.test(file));
    
    console.log('Flipping ' + imageFiles.length + ' SHARPENED normal images...');
    
    for (const file of imageFiles) {
        const inputPath = path.join(inputFolder, file);
        const outputPath = path.join(outputFolder, file);
        await flipImage(inputPath, outputPath);
    }
    
    console.log('Normal flip complete!');
}

processAllImages().catch(console.error);
"@ | Set-Content "temp_flip_normal.js"
node temp_flip_normal.js
Remove-Item "temp_flip_normal.js" -Force

Write-Host ""
Write-Host "Step 6: Create back_shiny from sharpened front_shiny..." -ForegroundColor Yellow
if (!(Test-Path "pokemon_processing\back_shiny")) { New-Item -ItemType Directory -Path "pokemon_processing\back_shiny" -Force }

# Clean up any _2 files first
Get-ChildItem "pokemon_processing\back_shiny" -Filter "*_2.*" -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue

# Create flip script for shiny - uses SHARPENED front_shiny as source
@"
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

const inputFolder = './pokemon_processing/front_shiny';
const outputFolder = './pokemon_processing/back_shiny';

async function flipImage(inputPath, outputPath) {
    const image = await loadImage(inputPath);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    
    ctx.scale(-1, 1);
    ctx.drawImage(image, -image.width, 0);
    
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);
}

async function processAllImages() {
    const files = fs.readdirSync(inputFolder);
    const imageFiles = files.filter(file => /\.(png|jpg|jpeg|gif)$/i.test(file));
    
    console.log('Flipping ' + imageFiles.length + ' SHARPENED shiny images...');
    
    for (const file of imageFiles) {
        const inputPath = path.join(inputFolder, file);
        const outputPath = path.join(outputFolder, file);
        await flipImage(inputPath, outputPath);
    }
    
    console.log('Shiny flip complete!');
}

processAllImages().catch(console.error);
"@ | Set-Content "temp_flip_shiny.js"
node temp_flip_shiny.js
Remove-Item "temp_flip_shiny.js" -Force

Write-Host ""
Write-Host "Step 7: Create sprite sheets (128x60, 2-frame animation)..." -ForegroundColor Yellow
if (!(Test-Path "pokemon_processing\sprite_sheets")) { New-Item -ItemType Directory -Path "pokemon_processing\sprite_sheets" -Force }

# Clean up any existing _2 files first
Write-Host "  Cleaning up duplicate files..." -ForegroundColor Gray
Get-ChildItem "pokemon_processing\sprite_sheets" -Filter "*_2.*" -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue

# Create sprite sheet generator
@"
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

const inputFolder = './pokemon_processing/input';  // Use original input images, not resized ones
const outputFolder = './pokemon_processing/sprite_sheets';

// PROPER POKEMON NAME CLEANING - same logic as resize script
function cleanPokemonName(filename) {
    let name = path.parse(filename).name.toUpperCase();
    
    // Remove size classifications first
    name = name.replace(/_(SMALL|MEDIUM|BIG)$/gi, '');
    
    // Handle MEGA Pokemon - convert to _1 format
    if (name.includes('MEGA')) {
        name = name.replace(/^MEGA[-_]*/gi, '').trim();
        name = name + '_1';
    }
    
    // Handle GMAX Pokemon - convert to _1 format  
    if (name.includes('GMAX')) {
        name = name.replace(/^GMAX[-_]*/gi, '').trim();
        name = name + '_1';
    }
    
    // Clean up any extra characters
    name = name.replace(/[^A-Z0-9_]/g, '_');
    name = name.replace(/_+/g, '_');
    name = name.replace(/^_|_$/g, '');
    
    return name;
}

// Track used names to handle duplicates
const usedNames = new Set();

async function createSpriteSheet(inputPath, outputPath) {
    try {
        // Load image with validation
        const image = await loadImage(inputPath);
        if (!image || image.width === 0 || image.height === 0) {
            console.log('Skipping invalid image: ' + inputPath);
            return;
        }
        
        // Create 128x60 canvas for sprite sheet
        const canvas = createCanvas(128, 60);
        const ctx = canvas.getContext('2d');
        
        // Clear with transparent background
        ctx.globalCompositeOperation = 'source-over';
        ctx.clearRect(0, 0, 128, 60);
    
    // FORCE EVERY POKEMON TO BE HUGE - NO EXCEPTIONS
    // Each frame gets 64px width, total height is 60px
    const frameWidth = 64;
    const frameHeight = 60;
    
    // Target 90% of the space - PERIOD
    const targetWidth = frameWidth * 0.9;   // 57.6px
    const targetHeight = frameHeight * 0.9; // 54px
    
    // ALWAYS scale to fill 90% - ignore original proportions if needed
    let scaledWidth = targetWidth;
    let scaledHeight = targetHeight;
    
    const aspectRatio = image.width / image.height;
    
    // Only adjust for aspect ratio if it doesn't make Pokemon tiny
    if (aspectRatio > 1) {
        // Wide Pokemon - fit to width, but ensure height is still big
        scaledHeight = scaledWidth / aspectRatio;
        if (scaledHeight < targetHeight * 0.75) {
            // Height too small, prioritize size over perfect aspect ratio
            scaledHeight = targetHeight * 0.85;
            scaledWidth = targetWidth * 0.95;
        }
    } else {
        // Tall Pokemon - fit to height, but ensure width is still big
        scaledWidth = scaledHeight * aspectRatio;
        if (scaledWidth < targetWidth * 0.75) {
            // Width too small, prioritize size over perfect aspect ratio
            scaledWidth = targetWidth * 0.85;
            scaledHeight = targetHeight * 0.95;
        }
    }
    
    // ABSOLUTE MINIMUM ENFORCEMENT - NO POKEMON CAN BE SMALLER THAN THIS
    if (scaledWidth < targetWidth * 0.8) scaledWidth = targetWidth * 0.85;
    if (scaledHeight < targetHeight * 0.8) scaledHeight = targetHeight * 0.85;
    
    // Frame 1: Normal position (left side)
    const frame1X = 32 - (scaledWidth / 2);  // Center in left half (64px wide)
    const frame1Y = 30 - (scaledHeight / 2); // Center vertically
    
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, frame1X, frame1Y, scaledWidth, scaledHeight);
    
    // Frame 2: Slightly compressed/lowered animation (right side)
    const frame2X = 96 - (scaledWidth / 2);     // Center in right half
    const frame2Y = 32 - (scaledHeight * 0.85 / 2); // Slightly lower and compressed
    const frame2Width = scaledWidth * 0.95;     // Slightly narrower
    const frame2Height = scaledHeight * 0.85;   // Compressed height
    
    ctx.drawImage(image, frame2X, frame2Y, frame2Width, frame2Height);
    
    // MODERATE SHARPENING for sprite sheets - clear but not over-processed
    const imageData = ctx.getImageData(0, 0, 128, 60);
    const data = imageData.data;
    const output = new Uint8ClampedArray(data);
    
    // Balanced sharpening parameters
    const amount = 1.5;  // Moderate sharpening (was 3.0)
    const radius = 1;
    const threshold = 8;  // Higher threshold = less aggressive (was 1)
    
    // Create blurred version for unsharp mask
    const blurred = new Uint8ClampedArray(data);
    
    // Simple box blur
    for (let y = radius; y < 60 - radius; y++) {
        for (let x = radius; x < 128 - radius; x++) {
            for (let c = 0; c < 3; c++) { // RGB only
                let sum = 0;
                let count = 0;
                
                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const idx = ((y + dy) * 128 + (x + dx)) * 4 + c;
                        sum += data[idx];
                        count++;
                    }
                }
                
                const idx = (y * 128 + x) * 4 + c;
                blurred[idx] = sum / count;
            }
        }
    }
    
    // Apply moderate unsharp mask
    for (let i = 0; i < data.length; i += 4) {
        for (let c = 0; c < 3; c++) {
            const original_val = data[i + c];
            const blurred_val = blurred[i + c];
            const diff = original_val - blurred_val;
            
            // Only sharpen significant differences
            if (Math.abs(diff) > threshold) {
                let sharpened = original_val + (amount * diff);
                output[i + c] = Math.max(0, Math.min(255, Math.round(sharpened)));
            } else {
                output[i + c] = original_val;
            }
        }
        output[i + 3] = data[i + 3]; // Preserve alpha
    }
    
    // Put the moderately sharpened data back
    const finalImageData = ctx.createImageData(128, 60);
    finalImageData.data.set(output);
    ctx.putImageData(finalImageData, 0, 0);
    
    // Save sprite sheet with proper error handling
    try {
        // Delete existing file first to prevent corruption
        if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
        }
        
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(outputPath, buffer);
        console.log('✓ Created: ' + path.basename(outputPath));
    } catch (error) {
        console.log('✗ Failed to save: ' + outputPath + ' - ' + error.message);
    }
} catch (error) {
    console.log('✗ Error processing ' + inputPath + ': ' + error.message);
}
}

async function processAllImages() {
    const files = fs.readdirSync(inputFolder);
    const imageFiles = files.filter(file => /\.(png|jpg|jpeg|gif)$/i.test(file));
    
    console.log('Creating ' + imageFiles.length + ' sprite sheets (128x60, 2-frame animation)...');
    console.log('Using proper Pokemon naming (MEGA becomes _1, duplicates get _1)...');
    
    for (const file of imageFiles) {
        const inputPath = path.join(inputFolder, file);
        
        // Generate proper Pokemon name
        let cleanName = cleanPokemonName(file);
        
        // Handle duplicate names by adding _1, _2, etc.
        let finalName = cleanName;
        let counter = 1;
        while (usedNames.has(finalName)) {
            finalName = cleanName + '_' + counter;
            counter++;
        }
        usedNames.add(finalName);
        
        const outputPath = path.join(outputFolder, finalName + '.png');
        
        console.log('Processing: ' + file + ' -> ' + finalName + '.png');
        await createSpriteSheet(inputPath, outputPath);
    }
    
    console.log('Sprite sheet creation complete!');
}

processAllImages().catch(console.error);
"@ | Set-Content "temp_create_sprite_sheets.js"
node temp_create_sprite_sheets.js
Remove-Item "temp_create_sprite_sheets.js" -Force

Write-Host ""
Write-Host "🧹 Cleaning up unnecessary folders and files..." -ForegroundColor Yellow

# Remove incorrectly named folders that might have been created
$unwantedFolders = @(
    "pokemon_images_hue_shifted",
    "pokemon_images_back_sprites", 
    "pokemon_processing\front_normal_hue_shifted",
    "pokemon_processing\back_normal_hue_shifted"
)

foreach ($folder in $unwantedFolders) {
    if (Test-Path $folder) {
        Write-Host "  Removing unwanted folder: $folder" -ForegroundColor Gray
        Remove-Item $folder -Recurse -Force
    }
}

# Clean up old/unnecessary script files
$unnecessaryScripts = @(
    "generate_pokemon_variants.js",
    "generate_all_variants.js", 
    "debug_simple.js",
    "test_debug.js",
    "download_pokemon_images.js",
    "download_stage_based_images.js",
    "download_evolution_based_images.js",
    "download_correct_sizes.js",
    "analyze_evolution_families.js",
    "create_sprite_sheets.js",
    "hue_shift_resized_images.js",
    "rename_pokemon_images.js",
    "rename_hue_shifted_images.js",
    "rename_back_sprites.js"
)

foreach ($script in $unnecessaryScripts) {
    if (Test-Path $script) {
        Write-Host "  Removing unnecessary script: $script" -ForegroundColor Gray
        Remove-Item $script -Force
    }
}

Write-Host ""
Write-Host "====================================" -ForegroundColor Green
Write-Host "SUCCESS! All 5 variants generated:" -ForegroundColor Green
Write-Host "- front_normal:  pokemon_processing/front_normal/ (sharpened)" -ForegroundColor White
Write-Host "- front_shiny:   pokemon_processing/front_shiny/ (hue +$HueShift°)" -ForegroundColor White  
Write-Host "- back_normal:   pokemon_processing/back_normal/ (flipped)" -ForegroundColor White
Write-Host "- back_shiny:    pokemon_processing/back_shiny/ (flipped shiny)" -ForegroundColor White
Write-Host "- sprite_sheets: pokemon_processing/sprite_sheets/ (128x60, 2-frame)" -ForegroundColor White

# Count results and verify consistency
$frontNormal = Get-ChildItem "pokemon_processing\front_normal" -Filter "*.png" -ErrorAction SilentlyContinue | Measure-Object
$frontShiny = Get-ChildItem "pokemon_processing\front_shiny" -Filter "*.png" -ErrorAction SilentlyContinue | Measure-Object
$backNormal = Get-ChildItem "pokemon_processing\back_normal" -Filter "*.png" -ErrorAction SilentlyContinue | Measure-Object
$backShiny = Get-ChildItem "pokemon_processing\back_shiny" -Filter "*.png" -ErrorAction SilentlyContinue | Measure-Object
$spriteSheets = Get-ChildItem "pokemon_processing\sprite_sheets" -Filter "*.png" -ErrorAction SilentlyContinue | Measure-Object

Write-Host ""
Write-Host "Generated files:" -ForegroundColor Cyan
Write-Host "  Front Normal:  $($frontNormal.Count) files" -ForegroundColor White
Write-Host "  Front Shiny:   $($frontShiny.Count) files" -ForegroundColor White
Write-Host "  Back Normal:   $($backNormal.Count) files" -ForegroundColor White
Write-Host "  Back Shiny:    $($backShiny.Count) files" -ForegroundColor White
Write-Host "  Sprite Sheets: $($spriteSheets.Count) files (128x60, 2-frame)" -ForegroundColor White

# Check if all folders have the same count
$expectedCount = $frontNormal.Count
if ($frontShiny.Count -ne $expectedCount -or $backNormal.Count -ne $expectedCount -or $backShiny.Count -ne $expectedCount -or $spriteSheets.Count -ne $expectedCount) {
    Write-Host ""
    Write-Host "⚠️  WARNING: File counts don't match! Some variants may be missing." -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "✅ All variants generated successfully! ($expectedCount files each)" -ForegroundColor Green
}
Write-Host "====================================" -ForegroundColor Green

pause