# Pokémon Image Hue Shift Tool

This script processes all images in the `pokemon_images` folder and creates hue-shifted versions with random color variations.

## Features

- 🎨 **Consistent Hue Shifting**: All images get the SAME hue shift amount for uniform color schemes
- 🔧 **Customizable Amount**: Specify any hue shift from 1-359 degrees via command line
- 🌈 **Color Preservation**: Maintains saturation and lightness while only shifting hue
- 📁 **Batch Processing**: Processes all images in the pokemon_images folder automatically
- ⏭️ **Skip Existing**: Won't overwrite existing processed images
- 🔍 **Progress Tracking**: Shows real-time processing status
- ❌ **Error Handling**: Continues processing even if some images fail

## Setup

1. **Install required dependencies:**
```powershell
npm install canvas
```

2. **Ensure you have images to process:**
   - Make sure the `pokemon_images` folder exists with images
   - If you don't have images yet, run the download script first: `node download_pokemon_images.js`

## Usage

**Option 1: Use default hue shift (120 degrees):**
```powershell
node hue_shift_images.js
```

**Option 2: Specify your own hue shift amount:**
```powershell
node hue_shift_images.js 180    # Shift by 180 degrees (opposite colors)
node hue_shift_images.js 60     # Shift by 60 degrees (slight change)
node hue_shift_images.js 270    # Shift by 270 degrees (dramatic change)
```

**Popular hue shift values:**
- `60` - Subtle color change
- `120` - Complementary colors
- `180` - Opposite colors (most dramatic)
- `240` - Cool to warm shift

## Output

- Creates a new folder: `pokemon_images_hue_shifted`
- Contains all original images with the SAME hue shift applied to all
- Preserves original filenames and formats
- All images maintain consistent color relationships

## Example Output

```
🎨 Starting hue shift processing...
🌈 Hue shift amount: +180° (applied to ALL images)
📁 Input folder: E:\LGDEX Website\LG-Website\pokemon_images
📁 Output folder: E:\LGDEX Website\LG-Website\pokemon_images_hue_shifted
📦 Found 150 image files to process
🎨 Processing: 001_raclover.png
   🌈 Applying hue shift: +180°
   ✅ Saved: 001_raclover.png
🎨 Processing: 002_rogoon.png
   🌈 Applying hue shift: +180°
   ✅ Saved: 002_rogoon.png
...
✅ Hue shift processing complete!
🌈 Applied +180° hue shift to all images
🎨 Successfully processed: 150 images
❌ Failed to process: 0 images
📁 Hue-shifted images saved to: pokemon_images_hue_shifted
```

## Technical Details

- **Hue Consistency**: All images get the exact same hue shift for uniform color schemes
- **Hue Range**: Any value from 1-359 degrees (default: 120°)
- **Color Space**: Uses HSL (Hue, Saturation, Lightness) for accurate hue manipulation
- **Format Support**: PNG, JPG, JPEG, WebP, GIF, BMP
- **Performance**: Includes small delays between processing to prevent system overload
- **Memory Efficient**: Processes one image at a time to manage memory usage

## Troubleshooting

**Error: Cannot find module 'canvas'**
- Run `npm install canvas` to install the required image processing library

**No images found**
- Ensure the `pokemon_images` folder exists and contains image files
- Run the download script first if needed

**Permission errors**
- Make sure you have write permissions to create the output folder
- Try running the terminal as administrator if needed

## Notes

- The original images in `pokemon_images` remain unchanged
- All images get the SAME hue shift amount for consistent color schemes
- The script will skip processing if output images already exist
- Transparent pixels are preserved without color changes
- Use values like 60, 120, 180, 240, 300 for common color wheel shifts