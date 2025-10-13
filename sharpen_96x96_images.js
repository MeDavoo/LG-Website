const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

// Source and destination folders
const inputFolder = path.join(__dirname, 'pokemon_96x96_final');
const outputFolder = path.join(__dirname, 'pokemon_96x96_sharpened');

// Ensure destination exists
if (!fs.existsSync(outputFolder)) {
  fs.mkdirSync(outputFolder, { recursive: true });
}

/**
 * Apply an unsharp mask to a canvas context.
 * amount: how strong to add the edge mask (e.g., 0.5 - 1.5)
 * radius: blur radius (currently only small integer radii supported via box blur passes)
 * threshold: minimum edge intensity (0-255) to keep (avoid amplifying flat noise)
 */
function unsharpMask(srcCanvas, { amount = 0.8, radius = 1, threshold = 4 } = {}) {
  // Clone original image data
  const w = srcCanvas.width;
  const h = srcCanvas.height;
  const ctx = srcCanvas.getContext('2d');
  const original = ctx.getImageData(0, 0, w, h);

  // Create blurred version
  const blurred = ctx.getImageData(0, 0, w, h);

  // Simple box blur repeated radius times (horizontal + vertical)
  const iterations = Math.max(1, radius);
  for (let i = 0; i < iterations; i++) {
    boxBlur(blurred, w, h, true);  // horizontal
    boxBlur(blurred, w, h, false); // vertical
  }

  const oData = original.data;
  const bData = blurred.data;

  // Apply unsharp mask: result = original + amount * (original - blurred) where |difference| > threshold
  for (let i = 0; i < oData.length; i += 4) {
    const or = oData[i];
    const og = oData[i + 1];
    const ob = oData[i + 2];
    const br = bData[i];
    const bg = bData[i + 1];
    const bb = bData[i + 2];

    let dr = or - br;
    let dg = og - bg;
    let db = ob - bb;

    // Luminance difference for threshold (approx BT.709)
    const lumDiff = 0.2126 * Math.abs(dr) + 0.7152 * Math.abs(dg) + 0.0722 * Math.abs(db);
    if (lumDiff < threshold) continue; // skip low-contrast areas

    let nr = or + amount * dr;
    let ng = og + amount * dg;
    let nb = ob + amount * db;

    // Clamp
    oData[i] = nr < 0 ? 0 : nr > 255 ? 255 : nr;
    oData[i + 1] = ng < 0 ? 0 : ng > 255 ? 255 : ng;
    oData[i + 2] = nb < 0 ? 0 : nb > 255 ? 255 : nb;
  }

  ctx.putImageData(original, 0, 0);
  return srcCanvas;
}

// In-place 1D box blur pass across rows or columns
function boxBlur(imageData, w, h, horizontal = true) {
  const data = imageData.data;
  const radius = 1; // fixed small radius for subtle blur
  const kernelSize = radius * 2 + 1;
  const tmp = new Uint8ClampedArray(data.length);

  if (horizontal) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let r = 0, g = 0, b = 0, a = 0;
        for (let k = -radius; k <= radius; k++) {
          const ix = Math.min(w - 1, Math.max(0, x + k));
          const idx = (y * w + ix) * 4;
          r += data[idx];
          g += data[idx + 1];
            b += data[idx + 2];
          a += data[idx + 3];
        }
        const di = (y * w + x) * 4;
        tmp[di] = r / kernelSize;
        tmp[di + 1] = g / kernelSize;
        tmp[di + 2] = b / kernelSize;
        tmp[di + 3] = a / kernelSize;
      }
    }
  } else {
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        let r = 0, g = 0, b = 0, a = 0;
        for (let k = -radius; k <= radius; k++) {
          const iy = Math.min(h - 1, Math.max(0, y + k));
          const idx = (iy * w + x) * 4;
          r += data[idx];
          g += data[idx + 1];
          b += data[idx + 2];
          a += data[idx + 3];
        }
        const di = (y * w + x) * 4;
        tmp[di] = r / kernelSize;
        tmp[di + 1] = g / kernelSize;
        tmp[di + 2] = b / kernelSize;
        tmp[di + 3] = a / kernelSize;
      }
    }
  }

  // Copy back
  data.set(tmp);
}

async function sharpenAll({ amount = 0.85, radius = 1, threshold = 6 } = {}) {
  const start = Date.now();
  const files = fs.readdirSync(inputFolder).filter(f => /\.(png)$/i.test(f));
  console.log(`\n🔍 Sharpening ${files.length} sprites (amount=${amount}, radius=${radius}, threshold=${threshold})...`);

  let processed = 0; let failed = 0;
  for (const file of files) {
    try {
      const inputPath = path.join(inputFolder, file);
      const img = await loadImage(inputPath);
      const canvas = createCanvas(img.width, img.height); // should be 96x96
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false; // keep pixel edges crisp before sharpening
      ctx.drawImage(img, 0, 0);

      unsharpMask(canvas, { amount, radius, threshold });

      const outPath = path.join(outputFolder, file);
      fs.writeFileSync(outPath, canvas.toBuffer('image/png', { compressionLevel: 0 }));
      processed++;
      if (processed % 25 === 0) console.log(`  ✅ ${processed} done...`);
    } catch (err) {
      console.error(`❌ ${file}: ${err.message}`);
      failed++;
    }
  }
  const ms = Date.now() - start;
  console.log(`\n🎉 Sharpen complete. Success: ${processed}, Failed: ${failed}, Time: ${ms}ms`);
  console.log(`📁 Output folder: ${outputFolder}`);
  console.log(`🆚 Compare original vs sharpened by opening both folders side-by-side.`);
}

// Allow parameter overrides via CLI (e.g., node sharpen_96x96_images.js 1.0 1 4)
const [,, amountArg, radiusArg, thresholdArg] = process.argv;
const amount = amountArg ? parseFloat(amountArg) : 0.85;
const radius = radiusArg ? parseInt(radiusArg, 10) : 1;
const threshold = thresholdArg ? parseInt(thresholdArg, 10) : 6;

console.log('🚀 Starting sharpening pass for 96x96 sprites...');
sharpenAll({ amount, radius, threshold });
