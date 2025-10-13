# Pokémon Back Sprite Creator

This script transforms front-facing Pokemon images into back-facing sprites by flipping them horizontally and cropping to show only the upper portion (simulating a "back view").

## Features

- 🔀 **Horizontal Flip**: Mirrors images to face the opposite direction
- ✂️ **Smart Cropping**: Shows only the top portion of Pokemon (like viewing from behind)
- 📐 **Configurable Settings**: Adjust crop percentage and positioning
- 📁 **Batch Processing**: Processes all images in the pokemon_images folder automatically
- ⏭️ **Skip Existing**: Won't overwrite existing processed images
- 🔍 **Progress Tracking**: Shows real-time processing status
- ❌ **Error Handling**: Continues processing even if some images fail

## Setup

1. **Ensure you have the canvas dependency installed:**
```powershell
npm install canvas
```

2. **Ensure you have images to process:**
   - Make sure the `pokemon_images` folder exists with images
   - If you don't have images yet, run the download script first: `node download_pokemon_images.js`

## Usage

Run the back sprite creation script:
```powershell
node create_back_sprites.js
```

## Output

- Creates a new folder: `pokemon_images_back_sprites`
- Contains "back view" versions of all Pokemon images
- Images are horizontally flipped and cropped to show top 65% of the original
- Preserves original filenames and PNG format

## Configuration

You can edit the script to adjust these settings:

```javascript
const config = {
    // What percentage of the image height to keep (from the top)
    cropPercentage: 0.65, // Keep top 65% of the image
    
    // Whether to flip horizontally
    flipHorizontal: true,
    
    // Optional: Add a slight vertical offset to better center the "back view"
    verticalOffset: 0.05 // Move crop area down by 5% of image height
};
```

### Configuration Options:

- **`cropPercentage`**: Controls how much of the top portion to keep
  - `0.5` = Keep top 50% (shows upper body only)
  - `0.65` = Keep top 65% (default - shows most of body)
  - `0.8` = Keep top 80% (shows almost full body)

- **`flipHorizontal`**: Whether to mirror the image
  - `true` = Flip to face opposite direction (default)
  - `false` = Keep original facing direction

- **`verticalOffset`**: Fine-tune the crop area position
  - `0.0` = Start from very top of image
  - `0.05` = Start slightly lower (default)
  - `0.1` = Start 10% down from top

## Example Output

```
🔄 Starting back sprite creation...
📁 Input folder: E:\LGDEX Website\LG-Website\pokemon_images
📁 Output folder: E:\LGDEX Website\LG-Website\pokemon_images_back_sprites
⚙️  Configuration:
   🔀 Flip horizontal: true
   ✂️  Crop to top: 65% of image height
   📐 Vertical offset: 5%
📦 Found 150 image files to process
🔄 Processing: 001_raclover.png
   🔀 Flipped and cropped to 195px height
   ✅ Saved back sprite: 001_raclover.png
🔄 Processing: 002_rogoon.png
   🔀 Flipped and cropped to 195px height
   ✅ Saved back sprite: 002_rogoon.png
...
✅ Back sprite creation complete!
🔄 Successfully processed: 150 images
❌ Failed to process: 0 images
📁 Back sprites saved to: pokemon_images_back_sprites
```

## Technical Details

- **Image Processing**: Uses HTML5 Canvas for precise image manipulation
- **Flip Method**: Horizontal scaling with -1 and translation
- **Crop Method**: Takes top portion of image with configurable offset
- **Format Support**: PNG, JPG, JPEG, WebP, GIF, BMP input; PNG output
- **Performance**: Includes small delays between processing to prevent system overload
- **Memory Efficient**: Processes one image at a time to manage memory usage

## Troubleshooting

**Error: Cannot find module 'canvas'**
- Run `npm install canvas` to install the required image processing library

**Back sprites look weird**
- Try adjusting the `cropPercentage` to show more or less of the Pokemon
- Modify `verticalOffset` to fine-tune which part of the Pokemon is shown
- Some Pokemon might look better with different crop settings

**Images appear too small/large**
- The script maintains original image width and adjusts height based on crop percentage
- Original images remain unchanged in the `pokemon_images` folder

## Creative Ideas

- **Battle Sprites**: Use `cropPercentage: 0.5` for upper-body only battle sprites
- **Portrait Mode**: Use `cropPercentage: 0.4` for head/shoulder portraits
- **Full Back View**: Use `cropPercentage: 0.8` to show more of the Pokemon's back
- **No Flip Mode**: Set `flipHorizontal: false` to create top-cropped front sprites

## Notes

- The original images in `pokemon_images` remain unchanged
- Back sprites are saved as PNG format for best quality
- The script will skip processing if output images already exist
- Transparent backgrounds are preserved
- Works best with Pokemon that have distinct upper body features