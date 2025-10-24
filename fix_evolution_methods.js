const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc } = require('firebase/firestore');
const fs = require('fs');

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

// Path to the pokemon data file
const pokemonTxtPath = 'c:\\Users\\David Maddin\\Downloads\\pokemonwebsitedata.txt';

// Function to parse evolution data correctly
function parseEvolutionData() {
  console.log('📖 Parsing evolution data...');
  try {
    const content = fs.readFileSync(pokemonTxtPath, 'latin1');
    const evolutionMethods = {}; // Target Pokemon -> Evolution Method
    
    // Split by Pokemon entries
    const entries = content.split('#-------------------------------');
    
    for (const entry of entries) {
      const lines = entry.trim().split('\n');
      let currentPokemon = null;
      
      for (const line of lines) {
        const trimmed = line.trim();
        
        // Check for Pokemon ID
        const idMatch = trimmed.match(/^\[(\d+)\]$/);
        if (idMatch) {
          currentPokemon = {
            id: parseInt(idMatch[1]),
            name: '',
            evolutions: []
          };
          continue;
        }
        
        if (!currentPokemon) continue;
        
        // Parse Pokemon name
        if (trimmed.startsWith('Name = ')) {
          currentPokemon.name = trimmed.substring(7);
        } else if (trimmed.startsWith('Evolutions = ')) {
          // Parse evolution data: "RAGOON,Level,16" or "RACCLOAK,Level,32"
          const evolutionData = trimmed.substring(13);
          if (evolutionData && evolutionData !== '') {
            const parts = evolutionData.split(',');
            if (parts.length >= 3) {
              const targetName = parts[0].trim();
              const evolutionType = parts[1].trim();
              const evolutionValue = parts[2].trim();
              
              // Format evolution method for display
              let method = '';
              if (evolutionType.toLowerCase() === 'level') {
                method = `Level ${evolutionValue}`;
              } else if (evolutionType.toLowerCase() === 'item') {
                method = `${evolutionValue}`;
              } else if (evolutionType.toLowerCase() === 'happiness') {
                method = 'High Friendship';
              } else if (evolutionType.toLowerCase() === 'trade') {
                method = 'Trade';
              } else {
                method = `${evolutionType} ${evolutionValue}`;
              }
              
              // Store the method for the TARGET Pokemon (the one you evolve into)
              evolutionMethods[targetName] = method;
              console.log(`📝 ${currentPokemon.name} evolves into ${targetName} via: ${method}`);
            }
          }
        }
      }
    }
    
    console.log(`✅ Parsed ${Object.keys(evolutionMethods).length} evolution methods`);
    return evolutionMethods;
  } catch (error) {
    console.error('❌ Error parsing pokemon.txt:', error);
    return {};
  }
}

// Function to get all Pokemon from Firebase
async function getFirebasePokemon() {
  console.log('🔥 Fetching Pokemon from Firebase...');
  try {
    const pokemonCollection = collection(db, 'pokemon');
    const snapshot = await getDocs(pokemonCollection);
    
    const firebasePokemon = {};
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.name) {
        firebasePokemon[data.name] = {
          id: doc.id,
          ...data
        };
      }
    });
    
    console.log(`✅ Found ${Object.keys(firebasePokemon).length} Pokemon in Firebase`);
    return firebasePokemon;
  } catch (error) {
    console.error('❌ Error fetching from Firebase:', error);
    return {};
  }
}

// Function to clear existing evolution methods and set correct ones
async function fixEvolutionMethods() {
  try {
    console.log('🔧 Starting evolution method fix...');
    
    // Parse the correct evolution data
    const correctEvolutionMethods = parseEvolutionData();
    
    // Get Firebase Pokemon
    const firebasePokemon = await getFirebasePokemon();
    
    console.log('\\n🧹 Step 1: Clearing all existing evolution methods...');
    
    // First, clear ALL existing evolution methods
    let clearedCount = 0;
    for (const [pokemonName, pokemonData] of Object.entries(firebasePokemon)) {
      if (pokemonData.evolutionMethod) {
        try {
          const docRef = doc(db, 'pokemon', pokemonData.id);
          await updateDoc(docRef, {
            evolutionMethod: '' // Clear the field
          });
          console.log(`🧹 Cleared evolution method for ${pokemonName}`);
          clearedCount++;
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 50));
        } catch (error) {
          console.error(`❌ Failed to clear evolution method for ${pokemonName}:`, error);
        }
      }
    }
    
    console.log(`\\n✅ Cleared ${clearedCount} existing evolution methods`);
    
    console.log('\\n📝 Step 2: Setting correct evolution methods...');
    
    // Now set the correct evolution methods
    let updatedCount = 0;
    let notFoundCount = 0;
    
    for (const [targetPokemonName, evolutionMethod] of Object.entries(correctEvolutionMethods)) {
      if (firebasePokemon[targetPokemonName]) {
        try {
          const docRef = doc(db, 'pokemon', firebasePokemon[targetPokemonName].id);
          await updateDoc(docRef, {
            evolutionMethod: evolutionMethod
          });
          console.log(`✅ Set evolution method for ${targetPokemonName}: "${evolutionMethod}"`);
          updatedCount++;
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`❌ Failed to update ${targetPokemonName}:`, error);
        }
      } else {
        console.log(`⚠️  Target Pokemon ${targetPokemonName} not found in Firebase`);
        notFoundCount++;
      }
    }
    
    console.log('\\n🎉 Evolution method fix complete!');
    console.log(`✅ Successfully updated: ${updatedCount} Pokemon`);
    console.log(`🧹 Cleared old methods: ${clearedCount} Pokemon`);
    console.log(`⚠️  Not found in Firebase: ${notFoundCount} Pokemon`);
    
  } catch (error) {
    console.error('💥 Fatal error:', error);
  }
}

// Preview what will be changed
async function previewEvolutionFix() {
  try {
    console.log('👀 Preview mode - showing what will be changed...');
    
    const correctEvolutionMethods = parseEvolutionData();
    const firebasePokemon = await getFirebasePokemon();
    
    console.log('\\n📋 Pokemon that will have evolution methods SET:');
    console.log('================================================');
    
    let setCount = 0;
    for (const [targetPokemonName, evolutionMethod] of Object.entries(correctEvolutionMethods)) {
      if (firebasePokemon[targetPokemonName]) {
        console.log(`🔸 ${targetPokemonName}: "${evolutionMethod}"`);
        setCount++;
      }
    }
    
    console.log('\\n📋 Pokemon that will have evolution methods CLEARED:');
    console.log('=====================================================');
    
    let clearCount = 0;
    for (const [pokemonName, pokemonData] of Object.entries(firebasePokemon)) {
      if (pokemonData.evolutionMethod && !correctEvolutionMethods[pokemonName]) {
        console.log(`🧹 ${pokemonName}: "${pokemonData.evolutionMethod}" -> (cleared)`);
        clearCount++;
      }
    }
    
    console.log(`\\n📊 Summary:`);
    console.log(`   Will set evolution methods: ${setCount} Pokemon`);
    console.log(`   Will clear old methods: ${clearCount} Pokemon`);
    console.log(`   Not found in Firebase: ${Object.keys(correctEvolutionMethods).filter(name => !firebasePokemon[name]).length} Pokemon`);
    
  } catch (error) {
    console.error('💥 Preview error:', error);
  }
}

// Command line interface
const args = process.argv.slice(2);

if (args.includes('--preview') || args.includes('-p')) {
  previewEvolutionFix();
} else if (args.includes('--help') || args.includes('-h')) {
  console.log('🔧 Evolution Method Fix Tool');
  console.log('============================');
  console.log('');
  console.log('This tool fixes the evolution method storage issue where methods');
  console.log('were stored on the wrong Pokemon (source instead of target).');
  console.log('');
  console.log('Usage:');
  console.log('  node fix_evolution_methods.js              # Fix evolution methods');
  console.log('  node fix_evolution_methods.js --preview     # Preview what will change');
  console.log('  node fix_evolution_methods.js --help        # Show this help');
} else {
  console.log('⚠️  This will modify your Firebase database!');
  console.log('📝 Run with --preview first to see what will be changed.');
  console.log('');
  
  // Ask for confirmation
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question('Are you sure you want to fix evolution methods? (y/N): ', (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      rl.close();
      fixEvolutionMethods();
    } else {
      console.log('❌ Cancelled. Run with --preview to see what would be changed.');
      rl.close();
    }
  });
}