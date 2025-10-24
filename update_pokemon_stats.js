const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

// Firebase configuration from your project
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

// Path to the pokemon data files
const pokemonTxtPath = 'c:\\Users\\David Maddin\\Downloads\\pokemonwebsitedata.txt';
const abilitiesTxtPath = 'e:\\pk rpg essentials\\Pokemon_Zero_v0.13.1_alpha\\PBS\\abilities.txt';

// Type mappings to match website format
const typeMapping = {
  'NORMAL': 'Normal',
  'FIRE': 'Fire',
  'WATER': 'Water',
  'ELECTRIC': 'Electric',
  'GRASS': 'Grass',
  'ICE': 'Ice',
  'FIGHTING': 'Fighting',
  'POISON': 'Poison',
  'GROUND': 'Ground',
  'FLYING': 'Flying',
  'PSYCHIC': 'Psychic',
  'BUG': 'Bug',
  'ROCK': 'Rock',
  'GHOST': 'Ghost',
  'DRAGON': 'Dragon',
  'DARK': 'Dark',
  'STEEL': 'Steel',
  'FAIRY': 'Fairy'
};

// Function to parse abilities.txt file
function parseAbilities() {
  console.log('📖 Parsing abilities.txt...');
  try {
    const abilitiesContent = fs.readFileSync(abilitiesTxtPath, 'latin1');
    const abilities = {};
    
    const lines = abilitiesContent.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes(',')) {
        const parts = trimmed.split(',');
        if (parts.length >= 3) {
          const id = parts[0];
          const internalName = parts[1];
          const displayName = parts[2];
          const description = parts[3] || '';
          
          abilities[internalName] = {
            id: parseInt(id),
            internalName,
            displayName,
            description: description.replace(/"/g, '')
          };
        }
      }
    }
    
    console.log(`✅ Parsed ${Object.keys(abilities).length} abilities`);
    return abilities;
  } catch (error) {
    console.error('❌ Error parsing abilities.txt:', error);
    return {};
  }
}

// Function to parse pokemon.txt file and extract relevant Pokemon (custom Pokemon only)
function parsePokemonTxt() {
  console.log('📖 Parsing pokemon.txt...');
  try {
    const content = fs.readFileSync(pokemonTxtPath, 'latin1');
    const pokemon = {};
    
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
          const id = parseInt(idMatch[1]);
          currentPokemon = {
            id,
            name: '',
            internalName: '',
            type1: '',
            type2: '',
            baseStats: [],
            abilities: [],
            hiddenAbility: '',
            evolutionMethod: ''
          };
          continue;
        }
        
        if (!currentPokemon) continue;
        
        // Parse Pokemon data
        if (trimmed.startsWith('Name = ')) {
          currentPokemon.name = trimmed.substring(7);
        } else if (trimmed.startsWith('InternalName = ')) {
          currentPokemon.internalName = trimmed.substring(15);
        } else if (trimmed.startsWith('Type1 = ')) {
          currentPokemon.type1 = typeMapping[trimmed.substring(8)] || trimmed.substring(8);
        } else if (trimmed.startsWith('Type2 = ')) {
          currentPokemon.type2 = typeMapping[trimmed.substring(8)] || trimmed.substring(8);
        } else if (trimmed.startsWith('BaseStats = ')) {
          const stats = trimmed.substring(12).split(',').map(s => parseInt(s.trim()));
          if (stats.length === 6) {
            // Pokemon.txt order: HP, ATK, DEF, SPEED, SP.ATK, SP.DEF
            // Website order:     HP, ATK, DEF, SP.ATK, SP.DEF, SPEED
            currentPokemon.baseStats = {
              hp: stats[0],        // HP
              attack: stats[1],    // ATK
              defense: stats[2],   // DEF
              spAttack: stats[4],  // SP.ATK (from position 4 in pokemon.txt)
              spDefense: stats[5], // SP.DEF (from position 5 in pokemon.txt)
              speed: stats[3]      // SPEED (from position 3 in pokemon.txt)
            };
          }
        } else if (trimmed.startsWith('Abilities = ')) {
          const abilitiesList = trimmed.substring(12).split(',').map(a => a.trim());
          currentPokemon.abilities = abilitiesList;
        } else if (trimmed.startsWith('HiddenAbility = ')) {
          currentPokemon.hiddenAbility = trimmed.substring(16);
        } else if (trimmed.startsWith('Evolutions = ')) {
          // Parse evolution data: "RAGOON,Level,16" or "RACCLOAK,Level,32"
          const evolutionData = trimmed.substring(13);
          if (evolutionData && evolutionData !== '') {
            const parts = evolutionData.split(',');
            if (parts.length >= 3) {
              const evolutionName = parts[0].trim();
              const evolutionType = parts[1].trim();
              const evolutionValue = parts[2].trim();
              
              // Format evolution method for display
              if (evolutionType.toLowerCase() === 'level') {
                currentPokemon.evolutionMethod = `Level ${evolutionValue}`;
              } else if (evolutionType.toLowerCase() === 'item') {
                currentPokemon.evolutionMethod = `${evolutionValue}`;
              } else if (evolutionType.toLowerCase() === 'happiness') {
                currentPokemon.evolutionMethod = 'High Friendship';
              } else if (evolutionType.toLowerCase() === 'trade') {
                currentPokemon.evolutionMethod = 'Trade';
              } else {
                // Generic format for other evolution types
                currentPokemon.evolutionMethod = `${evolutionType} ${evolutionValue}`;
              }
            }
          }
        }
      }
      
      // Store the Pokemon if it's valid - use name as key for matching
      if (currentPokemon && currentPokemon.name) {
        pokemon[currentPokemon.name] = currentPokemon;
      }
    }
    
    console.log(`✅ Parsed ${Object.keys(pokemon).length} Pokemon from pokemon.txt`);
    return pokemon;
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
      // Match by name instead of ID
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

// Function to format ability for Firebase (just return the display name string)
function formatAbilityForFirebase(abilityInternalName, abilitiesDb) {
  if (!abilityInternalName || !abilitiesDb[abilityInternalName]) {
    // If ability not found in database, return the internal name formatted
    return abilityInternalName ? abilityInternalName.charAt(0).toUpperCase() + abilityInternalName.slice(1).toLowerCase() : null;
  }
  
  const ability = abilitiesDb[abilityInternalName];
  // Return just the display name as a string (not an object)
  return ability.displayName;
}

// Function to update a single Pokemon in Firebase
async function updatePokemonInFirebase(firebaseId, pokemonData, abilitiesDb) {
  try {
    const docRef = doc(db, 'pokemon', firebaseId);
    
    // Prepare the update data
    const updateData = {
      stats: pokemonData.baseStats,
      types: [pokemonData.type1, pokemonData.type2].filter(Boolean)
    };
    
    // Add primary ability (first in the list)
    if (pokemonData.abilities.length > 0) {
      const primaryAbility = formatAbilityForFirebase(pokemonData.abilities[0], abilitiesDb);
      if (primaryAbility) {
        updateData.ability = primaryAbility; // Store as string
      }
    }
    
    // Add hidden ability if it exists
    if (pokemonData.hiddenAbility) {
      const hiddenAbility = formatAbilityForFirebase(pokemonData.hiddenAbility, abilitiesDb);
      if (hiddenAbility) {
        updateData.hiddenAbility = hiddenAbility; // Store as string
      }
    }
    
    // Add secondary ability if it exists (for future use)
    if (pokemonData.abilities.length > 1) {
      const secondaryAbility = formatAbilityForFirebase(pokemonData.abilities[1], abilitiesDb);
      if (secondaryAbility) {
        updateData.secondaryAbility = secondaryAbility; // Store as string
      }
    }
    
    // Add evolution method if it exists
    if (pokemonData.evolutionMethod && pokemonData.evolutionMethod.trim() !== '') {
      updateData.evolutionMethod = pokemonData.evolutionMethod.trim();
    }
    
    await updateDoc(docRef, updateData);
    return true;
  } catch (error) {
    console.error(`❌ Failed to update Pokemon ${pokemonData.name}:`, error);
    return false;
  }
}

// Function to fix existing object-format abilities in Firebase
async function fixExistingAbilities() {
  console.log('🔧 Fixing existing object-format abilities...');
  try {
    const firebasePokemon = await getFirebasePokemon();
    let fixedCount = 0;
    
    for (const [pokemonName, pokemonData] of Object.entries(firebasePokemon)) {
      let needsUpdate = false;
      const updateData = {};
      
      // Check if ability is an object and convert to string
      if (pokemonData.ability && typeof pokemonData.ability === 'object' && pokemonData.ability.name) {
        updateData.ability = pokemonData.ability.name;
        needsUpdate = true;
      }
      
      // Check if hiddenAbility is an object and convert to string
      if (pokemonData.hiddenAbility && typeof pokemonData.hiddenAbility === 'object' && pokemonData.hiddenAbility.name) {
        updateData.hiddenAbility = pokemonData.hiddenAbility.name;
        needsUpdate = true;
      }
      
      // Check if secondaryAbility is an object and convert to string
      if (pokemonData.secondaryAbility && typeof pokemonData.secondaryAbility === 'object' && pokemonData.secondaryAbility.name) {
        updateData.secondaryAbility = pokemonData.secondaryAbility.name;
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        const docRef = doc(db, 'pokemon', pokemonData.id);
        await updateDoc(docRef, updateData);
        console.log(`✅ Fixed abilities for ${pokemonName}`);
        fixedCount++;
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    console.log(`🎉 Fixed ${fixedCount} Pokemon with object-format abilities`);
    return true;
  } catch (error) {
    console.error('❌ Error fixing abilities:', error);
    return false;
  }
}

// Main function to update all Pokemon
async function updateAllPokemon() {
  try {
    console.log('🚀 Starting Pokemon stats and abilities update...\n');
    
    // Parse data files
    const abilitiesDb = parseAbilities();
    const pokemonTxtData = parsePokemonTxt();
    
    // Get Firebase Pokemon
    const firebasePokemon = await getFirebasePokemon();
    
    console.log('\n📊 Starting updates...');
    
    let updatedCount = 0;
    let notFoundCount = 0;
    let errorCount = 0;
    
    // Update each Pokemon found in pokemon.txt
    for (const [pokemonName, pokemonData] of Object.entries(pokemonTxtData)) {
      
      if (firebasePokemon[pokemonName]) {
        console.log(`🔄 Updating ${pokemonData.name} (ID: ${pokemonData.id})...`);
        
        const success = await updatePokemonInFirebase(
          firebasePokemon[pokemonName].id, 
          pokemonData, 
          abilitiesDb
        );
        
        if (success) {
          updatedCount++;
          console.log(`✅ Updated ${pokemonData.name}`);
        } else {
          errorCount++;
        }
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } else {
        console.log(`⚠️  Pokemon ${pokemonData.name} (ID: ${pokemonData.id}) not found in Firebase`);
        notFoundCount++;
      }
    }
    
    console.log('\n🎉 Update complete!');
    console.log(`✅ Successfully updated: ${updatedCount} Pokemon`);
    console.log(`⚠️  Not found in Firebase: ${notFoundCount} Pokemon`);
    console.log(`❌ Errors: ${errorCount} Pokemon`);
    
  } catch (error) {
    console.error('💥 Fatal error:', error);
  }
}

// Function to preview what will be updated (dry run)
async function previewUpdates() {
  try {
    console.log('👀 Preview mode - showing what would be updated...\n');
    
    const abilitiesDb = parseAbilities();
    const pokemonTxtData = parsePokemonTxt();
    const firebasePokemon = await getFirebasePokemon();
    
    console.log('📋 Pokemon that will be updated:');
    console.log('================================');
    
    let count = 0;
    for (const [pokemonName, pokemonData] of Object.entries(pokemonTxtData)) {
      
      if (firebasePokemon[pokemonName]) {
        count++;
        console.log(`\n🔸 ${pokemonData.name} (ID: ${pokemonData.id})`);
        console.log(`   Types: ${[pokemonData.type1, pokemonData.type2].filter(Boolean).join(', ')}`);
        console.log(`   Stats: HP:${pokemonData.baseStats.hp} ATK:${pokemonData.baseStats.attack} DEF:${pokemonData.baseStats.defense} SPATK:${pokemonData.baseStats.spAttack} SPDEF:${pokemonData.baseStats.spDefense} SPD:${pokemonData.baseStats.speed}`);
        
        if (pokemonData.abilities.length > 0) {
          const primaryAbility = abilitiesDb[pokemonData.abilities[0]];
          console.log(`   Primary Ability: ${primaryAbility ? primaryAbility.displayName : pokemonData.abilities[0]}`);
        }
        
        if (pokemonData.abilities.length > 1) {
          const secondaryAbility = abilitiesDb[pokemonData.abilities[1]];
          console.log(`   Secondary Ability: ${secondaryAbility ? secondaryAbility.displayName : pokemonData.abilities[1]}`);
        }
        
        if (pokemonData.hiddenAbility) {
          const hiddenAbility = abilitiesDb[pokemonData.hiddenAbility];
          console.log(`   Hidden Ability: ${hiddenAbility ? hiddenAbility.displayName : pokemonData.hiddenAbility}`);
        }
        
        if (pokemonData.evolutionMethod) {
          console.log(`   Evolution Method: ${pokemonData.evolutionMethod}`);
        }
        
        // Only show first 5 to avoid too much output
        if (count >= 5) {
          console.log(`\n... and ${Object.keys(pokemonTxtData).filter(name => firebasePokemon[name]).length - 5} more Pokemon`);
          break;
        }
      }
    }
    
    const updateCount = Object.keys(pokemonTxtData).filter(name => firebasePokemon[name]).length;
    const notFoundCount = Object.keys(pokemonTxtData).filter(name => !firebasePokemon[name]).length;
    
    console.log(`\n📊 Summary:`);
    console.log(`   Will update: ${updateCount} Pokemon`);
    console.log(`   Not found in Firebase: ${notFoundCount} Pokemon`);
    
  } catch (error) {
    console.error('💥 Preview error:', error);
  }
}

// Command line interface
const args = process.argv.slice(2);

if (args.includes('--preview') || args.includes('-p')) {
  previewUpdates();
} else if (args.includes('--fix-abilities') || args.includes('-f')) {
  console.log('🔧 Fixing object-format abilities in Firebase...');
  fixExistingAbilities();
} else if (args.includes('--help') || args.includes('-h')) {
  console.log('🔧 Pokemon Stats Updater');
  console.log('========================');
  console.log('');
  console.log('Usage:');
  console.log('  node update_pokemon_stats.js              # Update all Pokemon');
  console.log('  node update_pokemon_stats.js --preview     # Preview what will be updated');
  console.log('  node update_pokemon_stats.js --fix-abilities # Fix object-format abilities');
  console.log('  node update_pokemon_stats.js --help        # Show this help');
  console.log('');
  console.log('This script updates Pokemon stats and abilities from pokemon.txt to Firebase.');
  console.log('Matches Pokemon by NAME (not ID) to update website Pokemon only.');
} else {
  console.log('⚠️  This will update your Firebase database!');
  console.log('📝 Run with --preview first to see what will be updated.');
  console.log('');
  
  // Ask for confirmation
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question('Are you sure you want to update Firebase? (y/N): ', (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      rl.close();
      updateAllPokemon();
    } else {
      console.log('❌ Cancelled. Run with --preview to see what would be updated.');
      rl.close();
    }
  });
}