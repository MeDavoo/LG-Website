// Import Firebase v9 modules
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import https from 'https';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyApXtfSzd-lexTDqv_SN2hys39ArZMBrCs",
  authDomain: "losgamers-website.firebaseapp.com",
  projectId: "losgamers-website",
  storageBucket: "losgamers-website.firebasestorage.app",
  messagingSenderId: "2782474569",
  appId: "1:2782474569:web:139978c2c8e18e456e2a98"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Size classification lists
const SMALL_POKEMON = [
    'RACLOVER', 'FLAMOG', 'SHRIKO', 'BWIK', 'SHAMLIN', 'GOBUNI', 'RATONCIO', 'FLUNG', 
    'ANKYL', 'CUPCAKI', 'DRIBY', 'METALBOT', 'ASQUIMA', 'PURRLOON', 'HAMWHEEL', 
    'ROCKUMMY', 'PUNKSTAR', 'FLURFLOOM', 'LAMPINA', 'GARGOL', 'GRIGON', 'TOXICAKE', 
    'PINI-Q', 'CERBERCUB', 'SPRHAST', 'MELONCIO', 'STACKTURN', 'SERPEGG', 'NARWICE', 
    'ZIPTIP', 'MAWLURK', 'BOXTING', 'LARVICE', 'CAMWILT', 'SNIB', 'PYROFLY', 'WISPY', 
    'BUBBLI', 'INKOPUS', 'FLEAPUP', 'ALIFLOSS', 'ZINGWING', 'SOUTELOU', 'ROTTY', 
    'KNITUSA', 'GREPOX', 'MOROOL', 'PLAGRAT', 'CHUN-PEA', 'LILTAY', 'FLUFFIO', 
    'KARTIE', 'PICART', 'FAWNDER', 'TARDIGRIZ', 'MUDDIES', 'MAHOKI', 'TELEMITE', 
    'PHANGEON', 'POGGLE', 'LEPHAND', 'PIRANIB', 'FLOAMY'
];

const MEDIUM_POKEMON = [
    'ROGOON', 'HOGROCK', 'MAWFIN', 'BWIKOT', 'SHMIZ', 'SKULUNI', 'RANCID', 'LOCKEYE', 
    'ANKYLOLO', 'BOMBCAKI', 'ARMAPUS', 'ZAPPROT', 'PSQUIKE', 'MEOFLITS', 'CHEEKWHEEL', 
    'ROCKSECT', 'PUNKADER', 'MOSSOOM', 'LAMPRINKINA', 'DRAGOL', 'GRIMAT', 'NOXITILLY', 
    'PUPPE-Q', 'CERBERDUO', 'SPROOT', 'MELONOTTO', 'STURNIO', 'FLYPER', 'NARWULCE', 
    'ZAPTOP', 'PUNKURS', 'FISTUNG', 'GLASCOON', 'CAMELARK', 'SNOBY', 'HEROFLY', 
    'WILLOH', 'BUBTAN', 'OCTOGUM', 'PARSOG', 'CROKNWING', 'PSIGON', 'DRILORM', 
    'ROTTERON', 'MUSKOT', 'POXTER', 'FUNGOOSH', 'PLAGUS', 'PEARLYN', 'LYLURE', 
    'ELIONGANT', 'KLISH', 'ARTISC', 'DIRGLEAM', 'SPOOCOON', 'ROCKIES', 'MAHIKIN', 
    'CLOUDETTE', 'FLICCLE', 'CAPSYBA', 'SNOUTER', 'TRILUMI', 'AQUALLICHI', 'EELOCK', 
    'TOXOFLY', 'GRIFFLET', 'EZMA', 'BEETOOT', 'ARMUGA', 'SYMOCHIP', 'MONFLURK', 
    'YINYAN', 'PUMLIK', 'TRUNKUA', 'PIRANIAT', 'BUOYTAIL'
];

// Function to clean and normalize Pokemon names for comparison
function normalizeNameForComparison(name) {
    return name.toUpperCase()
        .replace(/[^A-Z0-9]/g, '')  // Remove all non-alphanumeric characters
        .replace(/MEGA/gi, '')      // Remove MEGA prefix
        .replace(/GMAX/gi, '')      // Remove GMAX prefix
        .replace(/GIGANTAMAX/gi, '') // Remove GIGANTAMAX prefix
        .trim();
}

// Function to get size classification
function getSizeClassification(pokemonName) {
    const normalizedName = normalizeNameForComparison(pokemonName);
    
    // Check small list
    for (const small of SMALL_POKEMON) {
        if (normalizeNameForComparison(small) === normalizedName) {
            return 'small';
        }
    }
    
    // Check medium list
    for (const medium of MEDIUM_POKEMON) {
        if (normalizeNameForComparison(medium) === normalizedName) {
            return 'medium';
        }
    }
    
    // Default to big
    return 'big';
}

// Function to clean filename for saving
function cleanFilename(name) {
    return name
        // Remove special characters and accents
        .normalize('NFD')  // Decompose accented characters
        .replace(/[\u0300-\u036f]/g, '')  // Remove accent marks
        .replace(/[àáâãäåæç]/gi, 'a')  // Replace accented a's
        .replace(/[èéêë]/gi, 'e')      // Replace accented e's
        .replace(/[ìíîï]/gi, 'i')      // Replace accented i's
        .replace(/[òóôõöø]/gi, 'o')    // Replace accented o's
        .replace(/[ùúûü]/gi, 'u')      // Replace accented u's
        .replace(/[ñ]/gi, 'n')         // Replace ñ
        .replace(/[ç]/gi, 'c')         // Replace ç
        .replace(/[♀♂]/g, '')          // Remove gender symbols
        .replace(/[<>:"/\\|?*]/g, '')  // Remove invalid filename characters
        .replace(/\s+/g, '-')          // Replace spaces with dashes
        .replace(/[^A-Za-z0-9\-_]/g, '') // Remove any other special characters
        .replace(/-+/g, '-')           // Replace multiple dashes with single dash
        .replace(/^-|-$/g, '')         // Remove leading/trailing dashes
        .trim();                       // Remove any remaining whitespace
}

// Function to download image
function downloadImage(url, filepath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(filepath);
        
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download: ${response.statusCode}`));
                return;
            }
            
            response.pipe(file);
            
            file.on('finish', () => {
                file.close();
                resolve();
            });
            
            file.on('error', (err) => {
                fs.unlink(filepath, () => {}); // Delete partial file
                reject(err);
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

async function downloadAllPokemonWithSizes() {
    try {
        console.log('🚀 Starting Pokemon download with size classification...');
        
        // Create output directory
        const outputDir = './pokemon_correct_size_images';
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // Get all Pokemon from Firestore
        console.log('📡 Fetching Pokemon data from Firestore...');
        const pokemonCollection = await getDocs(collection(db, 'pokemon'));
        
        console.log(`📋 Found ${pokemonCollection.size} Pokemon in database`);
        
        let downloaded = 0;
        let failed = 0;
        let skipped = 0;
        
        const sizeStats = { small: 0, medium: 0, big: 0 };
        const nameTracker = {}; // Track used names to handle duplicates
        
        for (const doc of pokemonCollection.docs) {
            const pokemon = doc.data();
            const pokemonName = pokemon.name;
            
            try {
                // Debug: Log the first few Pokemon to see the data structure
                if (downloaded === 0) {
                    console.log('🔍 DEBUG - Pokemon data structure:', JSON.stringify(pokemon, null, 2));
                }
                
                // Try different possible image field names
                let imageUrl = pokemon.mainImage || pokemon.image || pokemon.imageUrl || pokemon.frontImage || pokemon.sprite;
                
                // Skip if no image found
                if (!imageUrl) {
                    console.log(`⚠️  Skipping ${pokemonName} - no image found (checked: mainImage, image, imageUrl, frontImage, sprite)`);
                    skipped++;
                    continue;
                }
                
                // Get size classification
                const sizeClass = getSizeClassification(pokemonName);
                sizeStats[sizeClass]++;
                
                // Clean the name first
                const cleanName = cleanFilename(pokemonName);
                
                // Handle duplicate names by adding _1, _2, etc.
                let finalName = cleanName;
                if (nameTracker[cleanName]) {
                    nameTracker[cleanName]++;
                    finalName = `${cleanName}_${nameTracker[cleanName]}`;
                } else {
                    nameTracker[cleanName] = 0;
                }
                
                // Create filename with size classification
                const filename = `${finalName}_${sizeClass}.png`;
                const filepath = path.join(outputDir, filename);
                
                // Debug: Show name cleaning for problematic names
                if (pokemonName !== cleanName) {
                    console.log(`🔧 Name cleaned: "${pokemonName}" → "${cleanName}"`);
                }
                
                // Debug: Show duplicate handling
                if (finalName !== cleanName) {
                    console.log(`🔀 Duplicate handled: "${cleanName}" → "${finalName}"`);
                }
                
                // Skip if file already exists
                if (fs.existsSync(filepath)) {
                    console.log(`⏭️  Already exists: ${filename}`);
                    continue;
                }
                
                console.log(`📥 Downloading: ${pokemonName} → ${filename} (${sizeClass})`);
                
                // Download the image
                await downloadImage(imageUrl, filepath);
                downloaded++;
                
                console.log(`✅ Downloaded: ${filename}`);
                
                // Small delay to be nice to the server
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                console.error(`❌ Failed to download ${pokemonName}:`, error.message);
                failed++;
            }
        }
        
        console.log('\n🎉 Download complete!');
        console.log(`✅ Downloaded: ${downloaded} Pokemon`);
        console.log(`❌ Failed: ${failed} Pokemon`);
        console.log(`⏭️  Skipped: ${skipped} Pokemon`);
        console.log('\n📊 Size Classification Distribution:');
        console.log(`🐣 Small: ${sizeStats.small} Pokemon`);
        console.log(`🐾 Medium: ${sizeStats.medium} Pokemon`);
        console.log(`🦾 Big: ${sizeStats.big} Pokemon`);
        console.log(`📁 Images saved to: ${path.resolve(outputDir)}`);
        
    } catch (error) {
        console.error('💥 Error:', error);
    } finally {
        // Close Firebase connection
        process.exit(0);
    }
}

// Run the download
downloadAllPokemonWithSizes();