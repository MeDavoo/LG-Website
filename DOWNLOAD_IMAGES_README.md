# Pokemon Image Downloader

This script downloads all main Pokemon images from your Firebase database.

## Setup

1. **Install Firebase dependency:**
   ```bash
   npm install firebase
   ```

2. **Run the script:**
   ```bash
   node download_pokemon_images.js
   ```

## What it does

- Connects to your Firebase database
- Fetches all Pokemon from the 'pokemon' collection
- Downloads each Pokemon's main image (imageUrl field)
- Saves images with format: `001_pokemon_name.jpg`
- Creates a `pokemon_images` folder in your project root
- Skips already downloaded images
- Shows progress and summary

## Features

- ✅ Handles redirects
- ✅ Sanitizes filenames 
- ✅ Skips existing files
- ✅ Progress logging
- ✅ Error handling
- ✅ Respectful delays between downloads

## Output

Images will be saved as:
- `001_bulbasaur.jpg`
- `002_ivysaur.png`
- `003_venusaur.webp`
- etc.

The script will show you:
- How many images were downloaded
- How many were skipped (already exist)
- How many failed
- Where the images are saved