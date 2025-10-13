# Pokémon Image Resizer

This script resizes all Pokemon images to standardized dimensions (160x160 or 192x192 pixels) with 2x pixel density while maintaining the highest possible quality and preserving aspect ratios.

## Features

- 🎯 **Smart Size Selection**: Automatically chooses 160x160 or 192x192 based on original image size
- 📐 **Aspect Ratio Preservation**: Maintains original proportions without distortion
- 🎨 **2x Pixel Density**: Creates high-DPI images for crisp display on retina screens
- ✨ **High-Quality Scaling**: Uses advanced scaling algorithms to preserve image quality
- 📦 **Centered Padding**: Adds transparent padding to center images in target dimensions
- 📁 **Batch Processing**: Processes all images in the pokemon_images folder automatically
- ⏭️ **Skip Existing**: Won't overwrite existing processed images
- 🔍 **Progress Tracking**: Shows detailed processing information

## Setup

Ensure you have the canvas dependency installed:
```powershell
npm install canvas
```

## Configuration

The script uses intelligent size selection:

```javascript
const config = {
    smallTargetSize: 160,    // For smaller original images
    largeTargetSize: 192,    // For larger original images  
    sizeThreshold: 300,      // If original > 300px, use large size
    pixelDensity: 2,         // 2x pixel density
    useHighQualityScaling: true,
    maintainAspectRatio: true,
    addPadding: true,        // Center with transparent padding
};
```

### Size Selection Logic:
- **Original ≤ 300px**: Resized to **160x160**
- **Original > 300px**: Resized to **192x192**

### Customization Options:

- **`sizeThreshold`**: Change the cutoff point for size selection
  - `250` = More images get 160x160
  - `350` = More images get 192x192

- **`pixelDensity`**: Adjust pixel density
  - `1` = Standard density
  - `2` = Retina/high-DPI (default)
  - `3` = Ultra-high density

## Usage

Run the image resizer:
```powershell
node resize_pokemon_images.js
```

## Output

- Creates a new folder: `pokemon_images_resized`
- Contains all Pokemon images in standardized sizes
- Each image maintains its aspect ratio with transparent padding
- All images have consistent 2x pixel density
- Preserves original filenames and PNG format

## Example Output

```
🖼️  Starting image resizing...
📁 Input folder: E:\LGDEX Website\LG-Website\pokemon_images
📁 Output folder: E:\LGDEX Website\LG-Website\pokemon_images_resized
⚙️  Resize Configuration:
   📏 Small target size: 160x160px
   📏 Large target size: 192x192px
   🚪 Size threshold: 300px (above this = large size)
   🎨 Pixel density: 2x
   🎯 Maintain aspect ratio: true
   📦 Add padding: true
   ✨ High quality scaling: true

📦 Found 150 image files to process
🔄 Processing: 001_raclover.png
   📐 Original: 256x256
   🎯 Target size: 160x160
   ✨ Resized to: 160x160 (centered in 160x160)
   🎨 Pixel density: 2x
   📦 Canvas size: 320x320px
   ✅ Saved: 001_raclover.png
🔄 Processing: 002_rogoon.png
   📐 Original: 512x512
   🎯 Target size: 192x192
   ✨ Resized to: 192x192 (centered in 192x192)
   🎨 Pixel density: 2x
   📦 Canvas size: 384x384px
   ✅ Saved: 002_rogoon.png
...
✅ Image resizing complete!
🖼️  Successfully processed: 150 images
❌ Failed to process: 0 images
📏 Resized to 160x160: 85 images
📏 Resized to 192x192: 65 images
🎨 All images have 2x pixel density
📁 Resized images saved to: pokemon_images_resized
```

## Technical Details

### Quality Preservation:
- **High-Quality Scaling**: Uses `imageSmoothingQuality: 'high'` for best results
- **Bicubic-like Interpolation**: Advanced scaling algorithms prevent pixelation
- **Aspect Ratio Lock**: No stretching or distortion of original proportions
- **Transparent Padding**: Centers images without cropping

### Pixel Density:
- **2x Density**: Physical canvas is 2x the logical size
- **320x320 or 384x384**: Actual canvas dimensions for crisp display
- **Retina Ready**: Perfect for high-DPI displays and modern devices

### Performance:
- **Memory Efficient**: Processes one image at a time
- **Progressive Display**: Shows detailed progress for each image
- **Error Resilient**: Continues processing even if individual images fail

## Use Cases

### Web Development:
- **Consistent UI**: All Pokemon cards have uniform dimensions
- **Performance**: Optimized file sizes for fast loading
- **Responsive**: High-DPI support for all screen types

### Game Development:
- **Sprite Sheets**: Ready for game engine import
- **Uniform Assets**: Consistent sizing for collision detection
- **Quality**: Crisp visuals at any scale

### App Development:
- **Mobile Ready**: Perfect for iOS/Android high-DPI screens
- **Memory Efficient**: Consistent sizes reduce memory fragmentation
- **Professional**: Uniform appearance across all Pokemon

## Troubleshooting

**Error: Cannot find module 'canvas'**
- Run `npm install canvas` to install the required image processing library

**Images look blurry**
- The script uses high-quality scaling by default
- Check that `useHighQualityScaling` is set to `true`
- Ensure source images have sufficient resolution

**Wrong target sizes**
- Adjust `sizeThreshold` to change the cutoff point
- Modify `smallTargetSize` or `largeTargetSize` as needed

**Memory issues**
- The script processes one image at a time to minimize memory usage
- Large source images might require more system memory

## Notes

- Original images in `pokemon_images` remain unchanged
- All output images are PNG format for transparency support
- Transparent backgrounds are preserved
- Images smaller than target size are upscaled with quality enhancement
- Images larger than target size are downscaled with quality preservation
- The 2x pixel density makes images perfect for modern high-DPI displays