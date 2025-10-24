export interface Pokemon {
  id: string;
  name: string;
  types: PokemonType[];
  artist: string;
  imageUrl: string;
  additionalImages?: string[]; // Array of up to 3 additional image URLs
  pokedexNumber?: number; // Pokedex number for ordering
  unique?: string; // U0, U1, U2 for unique Pokemon (0=no evolve, 1=evolves once, 2=evolves twice)
  evolutionStage?: number; // 0=base, 1=first evo, 2=second evo, 3=GMAX, 4=Legendary, 5=MEGA
  description?: string;
  stats?: PokemonStats;
  ability?: PokemonAbility;
  createdAt: Date;
  updatedAt: Date;
  likes: number;
  comments: Comment[];
}

export interface PokemonStats {
  hp: number;
  attack: number;
  defense: number;
  spAttack: number;
  spDefense: number;
  speed: number;
  total?: number; // Calculated total
}

export interface PokemonAbility {
  id: string;
  name: string;
  description: string;
  type: PokemonType; // Associated type for visual grouping
}

export interface Comment {
  id: string;
  author: string;
  content: string;
  createdAt: Date;
}

export interface Artist {
  id: string;
  name: string;
  avatar?: string;
  pokemonCount: number;
  joinedAt: Date;
}

export enum PokemonType {
  NORMAL = 'normal',
  FIRE = 'fire',
  WATER = 'water',
  ELECTRIC = 'electric',
  GRASS = 'grass',
  ICE = 'ice',
  FIGHTING = 'fighting',
  POISON = 'poison',
  GROUND = 'ground',
  FLYING = 'flying',
  PSYCHIC = 'psychic',
  BUG = 'bug',
  ROCK = 'rock',
  GHOST = 'ghost',
  DRAGON = 'dragon',
  DARK = 'dark',
  STEEL = 'steel',
  FAIRY = 'fairy'
}

export interface Statistics {
  totalPokemon: number;
  typeDistribution: { [key in PokemonType]: number };
  artistStats: { artist: string; count: number }[];
  recentAdditions: Pokemon[];
}

// Pokemon Abilities Database - Based on Pokemon Essentials Documentation
export const POKEMON_ABILITIES: PokemonAbility[] = [
  // Normal Type Abilities
  { id: "download", name: "Download", description: "When the bearer enters battle, increases the bearer's Attack by 1 stage if the foe's Defense is lower than its Special Defense, or increases the bearer's Special Attack by 1 stage otherwise.", type: PokemonType.NORMAL },
  { id: "intimidate", name: "Intimidate", description: "When the bearer enters battle, lowers the foe's Attack by 1 stage. Out of battle: If the bearer is at the front of the party, 50% chance that a wild Pokémon that would appear won't.", type: PokemonType.DARK },
  { id: "frisk", name: "Frisk", description: "When the bearer enters battle, a message announces the foe's held item. If there are multiple foes with items, a random one is chosen for this ability.", type: PokemonType.NORMAL },
  { id: "anticipation", name: "Anticipation", description: "When the bearer enters battle, a message announces that the bearer 'shudders' if any foe has a damaging move whose type is super-effective against the bearer, or has an OHKO move that is effective against the bearer.", type: PokemonType.PSYCHIC },
  { id: "forewarn", name: "Forewarn", description: "When the bearer enters battle, a message announces the name of the move with the highest base power known by any foe (randomly chooses one if there is a tie).", type: PokemonType.PSYCHIC },
  { id: "trace", name: "Trace", description: "When the bearer enters battle, the bearer's ability is turned into the foe's ability (if there are multiple foes, randomly chooses the ability).", type: PokemonType.PSYCHIC },
  { id: "imposter", name: "Imposter", description: "When the bearer enters battle, it transforms into the foe directly opposite it. It copies everything that the move Transform does.", type: PokemonType.NORMAL },
  { id: "illusion", name: "Illusion", description: "Before bearer enters battle, bearer's appearance becomes that of the last Pokémon in the bearer's party. Copies name, shininess, gender and Poké Ball. Illusion breaks when the bearer takes damage from a move.", type: PokemonType.DARK },
  { id: "regenerator", name: "Regenerator", description: "When the bearer is switched out, it is healed by 1/3 of its maximum HP.", type: PokemonType.GRASS },
  { id: "natural-cure", name: "Natural Cure", description: "When the bearer is switched out or is in battle when it ends, its status is cured.", type: PokemonType.GRASS },

  // Fire Type Abilities
  { id: "drought", name: "Drought", description: "When the bearer enters battle, starts sunny weather. It lasts forever, unless replaced by another weather.", type: PokemonType.FIRE },
  { id: "desolate-land", name: "Desolate Land", description: "When the bearer enters battle, starts extremely harsh sunny weather. It lasts as long as the bearer remains in battle. Also causes all damaging Water-type moves and weather-inducing moves to fail.", type: PokemonType.FIRE },
  { id: "blaze", name: "Blaze", description: "The power of the bearer's Fire-type moves is boosted by 50% while the bearer is at or less than 1/3 of its maximum HP.", type: PokemonType.FIRE },
  { id: "flash-fire", name: "Flash Fire", description: "The bearer is immune to Fire-type moves. If hit by one, the power of all the bearer's Fire-type moves from then on is boosted by 50%.", type: PokemonType.FIRE },
  { id: "flame-body", name: "Flame Body", description: "When a Pokémon hits the bearer with a move that makes contact, 30% chance of the attacker becoming burned. Out of battle: Eggs hatch twice as fast if the bearer is in the party.", type: PokemonType.FIRE },
  { id: "magma-armor", name: "Magma Armor", description: "The bearer cannot become frozen. The bearer is cured of its freeze if it becomes frozen. Out of battle: Eggs hatch twice as fast if the bearer is in the party.", type: PokemonType.FIRE },
  { id: "solar-power", name: "Solar Power", description: "The bearer's Special Attack is boosted by 50% in sunny weather. At the end of each round, the bearer loses 1/8 of its maximum HP in sunny weather.", type: PokemonType.FIRE },
  { id: "flare-boost", name: "Flare Boost", description: "The bearer's Special Attack is boosted by 50% while it is burned.", type: PokemonType.FIRE },

  // Water Type Abilities
  { id: "drizzle", name: "Drizzle", description: "When the bearer enters battle, starts rain weather. It lasts forever, unless replaced by another weather.", type: PokemonType.WATER },
  { id: "primordial-sea", name: "Primordial Sea", description: "When the bearer enters battle, starts heavy rain weather. It lasts as long as the bearer remains in battle. Also causes all damaging Fire-type moves and weather-inducing moves to fail.", type: PokemonType.WATER },
  { id: "torrent", name: "Torrent", description: "The power of the bearer's Water-type moves is boosted by 50% while the bearer is at or less than 1/3 of its maximum HP.", type: PokemonType.WATER },
  { id: "water-absorb", name: "Water Absorb", description: "The bearer is immune to Water-type moves. If hit by one, the bearer is healed by 1/4 of its maximum HP.", type: PokemonType.WATER },
  { id: "storm-drain", name: "Storm Drain", description: "The bearer is immune to Water-type moves. If hit by one, increases the bearer's Special Attack by 1 stage. If another Pokémon uses a Water-type move against a single target that isn't the bearer, the bearer becomes the target.", type: PokemonType.WATER },
  { id: "swift-swim", name: "Swift Swim", description: "The bearer's Speed is doubled in rain weather.", type: PokemonType.WATER },
  { id: "rain-dish", name: "Rain Dish", description: "At the end of each round, the bearer gains 1/16 of its maximum HP in rainy weather.", type: PokemonType.WATER },
  { id: "hydration", name: "Hydration", description: "At the end of each round, cures the bearer's status in rainy weather.", type: PokemonType.WATER },
  { id: "dry-skin", name: "Dry Skin", description: "At the end of each round, the bearer gains 1/8 of its maximum HP in rainy weather, or loses 1/8 of its maximum HP in sunny weather. Fire-type moves that hit the bearer do 25% more damage. The bearer is immune to Water-type moves.", type: PokemonType.WATER },
  { id: "water-veil", name: "Water Veil", description: "The bearer cannot become burned. The bearer is cured of its burn if it becomes burned.", type: PokemonType.WATER },

  // Electric Type Abilities
  { id: "static", name: "Static", description: "When a Pokémon hits the bearer with a move that makes contact, 30% chance of the attacker becoming paralysed.", type: PokemonType.ELECTRIC },
  { id: "lightning-rod", name: "Lightning Rod", description: "The bearer is immune to Electric-type moves. If hit by one, increases the bearer's Special Attack by 1 stage. If another Pokémon uses an Electric-type move against a single target that isn't the bearer, the bearer becomes the target.", type: PokemonType.ELECTRIC },
  { id: "motor-drive", name: "Motor Drive", description: "The bearer is immune to Electric-type moves. If hit by one, increases the bearer's Speed by 1 stage.", type: PokemonType.ELECTRIC },
  { id: "volt-absorb", name: "Volt Absorb", description: "The bearer is immune to Electric-type moves. If hit by one, the bearer is healed by 1/4 of its maximum HP.", type: PokemonType.ELECTRIC },

  // Grass Type Abilities
  { id: "overgrow", name: "Overgrow", description: "The power of the bearer's Grass-type moves is boosted by 50% while the bearer is at or less than 1/3 of its maximum HP.", type: PokemonType.GRASS },
  { id: "chlorophyll", name: "Chlorophyll", description: "The bearer's Speed is doubled in sunny weather.", type: PokemonType.GRASS },
  { id: "sap-sipper", name: "Sap Sipper", description: "The bearer is immune to Grass-type moves. If hit by one, increases the bearer's Attack by 1 stage.", type: PokemonType.GRASS },
  { id: "leaf-guard", name: "Leaf Guard", description: "In sunny weather, the bearer cannot obtain a non-volatile status problem.", type: PokemonType.GRASS },
  { id: "flower-gift", name: "Flower Gift", description: "The bearer's Attack and Special Defense are boosted by 50% in sunny weather. The bearer's ally's Attack and Special Defense are boosted by 50% in sunny weather.", type: PokemonType.GRASS },
  { id: "flower-veil", name: "Flower Veil", description: "All Grass-type Pokémon on the bearer's side cannot obtain a non-volatile status problem, or fall asleep if affected by Yawn. The stats of all Grass-type Pokémon on the bearer's side cannot be lowered (except if self-inflicted).", type: PokemonType.GRASS },
  { id: "grass-pelt", name: "Grass Pelt", description: "The bearer's Defense is boosted by 50% while Grassy Terrain is in effect.", type: PokemonType.GRASS },

  // Ice Type Abilities
  { id: "snow-warning", name: "Snow Warning", description: "When the bearer enters battle, starts hail weather. It lasts forever, unless replaced by another weather.", type: PokemonType.ICE },
  { id: "ice-body", name: "Ice Body", description: "At the end of each round, the bearer gains 1/16 of its maximum HP in hail weather. The bearer takes no damage from hail weather.", type: PokemonType.ICE },
  { id: "snow-cloak", name: "Snow Cloak", description: "The bearer's evasion is boosted by 25% in hail weather. The bearer takes no damage from hail weather.", type: PokemonType.ICE },
  { id: "thick-fat", name: "Thick Fat", description: "The power of Ice-type and Fire-type moves used against the bearer is halved.", type: PokemonType.ICE },

  // Fighting Type Abilities
  { id: "guts", name: "Guts", description: "The bearer's Attack is boosted by 50% while it has a non-volatile status problem. The bearer's Attack isn't lowered by a burn.", type: PokemonType.FIGHTING },
  { id: "iron-fist", name: "Iron Fist", description: "The power of the bearer's punching moves is boosted by 20%.", type: PokemonType.FIGHTING },
  { id: "justified", name: "Justified", description: "When the bearer is hit by a Dark-type move, increases the bearer's Attack by 1 stage.", type: PokemonType.FIGHTING },
  { id: "steadfast", name: "Steadfast", description: "When the bearer flinches, increases the bearer's Speed by 1 stage.", type: PokemonType.FIGHTING },
  { id: "scrappy", name: "Scrappy", description: "The type effectiveness of the bearer's moves against the Ghost-type become 1x if they were originally 0x (i.e. the bearer's Normal-type and Fighting-type moves can hit Ghost-type Pokémon).", type: PokemonType.FIGHTING },
  { id: "inner-focus", name: "Inner Focus", description: "The bearer cannot be made to flinch.", type: PokemonType.FIGHTING },

  // Poison Type Abilities
  { id: "poison-point", name: "Poison Point", description: "When a Pokémon hits the bearer with a move that makes contact, 30% chance of the attacker becoming poisoned.", type: PokemonType.POISON },
  { id: "poison-touch", name: "Poison Touch", description: "When the bearer hits a Pokémon with a move that makes contact, 30% chance of poisoning the target.", type: PokemonType.POISON },
  { id: "poison-heal", name: "Poison Heal", description: "If the bearer is poisoned, the bearer is not hurt by poison damage but instead is healed by 1/8 of its maximum HP.", type: PokemonType.POISON },
  { id: "toxic-boost", name: "Toxic Boost", description: "The bearer's Attack is boosted by 50% while it is poisoned.", type: PokemonType.POISON },
  { id: "immunity", name: "Immunity", description: "The bearer cannot become poisoned. The bearer is cured of poison if it becomes poisoned.", type: PokemonType.POISON },

  // Ground Type Abilities
  { id: "sand-stream", name: "Sand Stream", description: "When the bearer enters battle, starts sandstorm weather. It lasts forever, unless replaced by another weather.", type: PokemonType.GROUND },
  { id: "sand-rush", name: "Sand Rush", description: "The bearer's Speed is doubled in sandstorm weather. The bearer takes no damage from sandstorm weather.", type: PokemonType.GROUND },
  { id: "sand-veil", name: "Sand Veil", description: "The bearer's evasion is boosted by 25% in sandstorm weather. The bearer takes no damage from sandstorm weather.", type: PokemonType.GROUND },
  { id: "sand-force", name: "Sand Force", description: "The power of the bearer's Rock-, Ground- and Steel-type moves is boosted by 30% in sandstorm weather. The bearer takes no damage from sandstorm weather.", type: PokemonType.GROUND },
  { id: "arena-trap", name: "Arena Trap", description: "The bearer's non-airborne foes cannot switch out or flee.", type: PokemonType.GROUND },

  // Flying Type Abilities
  { id: "levitate", name: "Levitate", description: "The bearer is immune to Ground-type moves. The bearer is affected by arena trap if it also has another type that isn't Flying.", type: PokemonType.FLYING },
  { id: "keen-eye", name: "Keen Eye", description: "The bearer's accuracy cannot be lowered by any means.", type: PokemonType.FLYING },
  { id: "early-bird", name: "Early Bird", description: "The bearer will wake up twice as quickly from sleep.", type: PokemonType.FLYING },
  { id: "gale-wings", name: "Gale Wings", description: "The bearer's Flying-type moves gain priority when it has full HP.", type: PokemonType.FLYING },
  { id: "aerilate", name: "Aerilate", description: "The bearer's Normal-type moves become Flying-type and gain 20% power.", type: PokemonType.FLYING },
  { id: "wind-power", name: "Wind Power", description: "When hit by a wind move, the bearer becomes charged.", type: PokemonType.FLYING },
  { id: "wind-rider", name: "Wind Rider", description: "The bearer is immune to wind moves and boosts Attack by 1 when hit by a wind move.", type: PokemonType.FLYING },

  // Psychic Type Abilities
  { id: "synchronize", name: "Synchronize", description: "When the bearer becomes poisoned, paralyzed or burned, the attacker receives the same status condition.", type: PokemonType.PSYCHIC },
  { id: "magic-guard", name: "Magic Guard", description: "The bearer only takes damage from moves. It is not affected by poison, burn, sandstorm, hail, recoil, etc.", type: PokemonType.PSYCHIC },
  { id: "magic-bounce", name: "Magic Bounce", description: "The bearer reflects status moves back at the attacker.", type: PokemonType.PSYCHIC },
  { id: "telepathy", name: "Telepathy", description: "The bearer takes no damage from moves used by allied Pokémon.", type: PokemonType.PSYCHIC },
  { id: "psychic-surge", name: "Psychic Surge", description: "When the bearer enters battle, the field becomes Psychic Terrain.", type: PokemonType.PSYCHIC },
  { id: "neuroforce", name: "Neuroforce", description: "The bearer's super effective moves deal 25% more damage.", type: PokemonType.PSYCHIC },

  // Bug Type Abilities
  { id: "compound-eyes", name: "Compound Eyes", description: "The bearer's accuracy is boosted by 30%.", type: PokemonType.BUG },
  { id: "swarm", name: "Swarm", description: "When the bearer's HP is 1/3 or less, the power of the bearer's Bug-type moves is boosted by 50%.", type: PokemonType.BUG },
  { id: "shield-dust", name: "Shield Dust", description: "The bearer is not affected by the additional effects of moves (but still takes damage).", type: PokemonType.BUG },
  { id: "tinted-lens", name: "Tinted Lens", description: "The bearer's not very effective moves deal double damage.", type: PokemonType.BUG },
  { id: "honey-gather", name: "Honey Gather", description: "The bearer may pick up Honey after battle.", type: PokemonType.BUG },
  { id: "technician", name: "Technician", description: "The bearer's moves with 60 power or less have their power boosted by 50%.", type: PokemonType.BUG },

  // Rock Type Abilities
  { id: "rock-head", name: "Rock Head", description: "The bearer takes no recoil damage from moves.", type: PokemonType.ROCK },
  { id: "sturdy", name: "Sturdy", description: "The bearer cannot be knocked out by a single hit while at full HP. The bearer is immune to OHKO moves.", type: PokemonType.ROCK },
  { id: "battle-armor", name: "Battle Armor", description: "The bearer's stats cannot be lowered by critical hits.", type: PokemonType.ROCK },
  { id: "solid-rock", name: "Solid Rock", description: "Super effective moves against the bearer deal 25% less damage.", type: PokemonType.ROCK },
  { id: "filter", name: "Filter", description: "Super effective moves against the bearer deal 25% less damage.", type: PokemonType.ROCK },

  // Ghost Type Abilities  
  { id: "cursed-body", name: "Cursed Body", description: "When the bearer is hit by a move, 30% chance of disabling that move for the attacker.", type: PokemonType.GHOST },
  { id: "infiltrator", name: "Infiltrator", description: "The bearer's moves ignore substitutes and the effects of Reflect, Light Screen, Safeguard, Mist and Aurora Veil.", type: PokemonType.GHOST },
  { id: "shadow-tag", name: "Shadow Tag", description: "The bearer's foes cannot switch out or flee.", type: PokemonType.GHOST },

  // Dragon Type Abilities
  { id: "multiscale", name: "Multiscale", description: "When the bearer is at full HP, damage taken from attacks is halved.", type: PokemonType.DRAGON },
  { id: "marvel-scale", name: "Marvel Scale", description: "When the bearer has a status condition, its Defense is boosted by 50%.", type: PokemonType.DRAGON },
  { id: "shed-skin", name: "Shed Skin", description: "At the end of each turn, 30% chance of the bearer curing itself of a status condition.", type: PokemonType.DRAGON },

  // Dark Type Abilities
  { id: "pressure", name: "Pressure", description: "When the bearer is targeted by a move, the move loses an additional PP.", type: PokemonType.DARK },
  { id: "unnerve", name: "Unnerve", description: "The bearer's foes cannot eat held Berries.", type: PokemonType.DARK },
  { id: "dark-aura", name: "Dark Aura", description: "The power of all Dark-type moves is boosted by 33%.", type: PokemonType.DARK },
  { id: "moxie", name: "Moxie", description: "When the bearer knocks out a foe, its Attack is boosted by 1 stage.", type: PokemonType.DARK },

  // Steel Type Abilities
  { id: "magnet-pull", name: "Magnet Pull", description: "Steel-type foes cannot switch out or flee.", type: PokemonType.STEEL },
  { id: "clear-body", name: "Clear Body", description: "The bearer's stats cannot be lowered by other Pokémon.", type: PokemonType.STEEL },
  { id: "light-metal", name: "Light Metal", description: "The bearer's weight is halved.", type: PokemonType.STEEL },
  { id: "heavy-metal", name: "Heavy Metal", description: "The bearer's weight is doubled.", type: PokemonType.STEEL },
  { id: "steelworker", name: "Steelworker", description: "The power of the bearer's Steel-type moves is boosted by 50%.", type: PokemonType.STEEL },

  // Fairy Type Abilities
  { id: "pixilate", name: "Pixilate", description: "The bearer's Normal-type moves become Fairy-type and gain 20% power.", type: PokemonType.FAIRY },
  { id: "fairy-aura", name: "Fairy Aura", description: "The power of all Fairy-type moves is boosted by 33%.", type: PokemonType.FAIRY },
  { id: "sweet-veil", name: "Sweet Veil", description: "The bearer and its allies cannot fall asleep.", type: PokemonType.FAIRY },
  { id: "aroma-veil", name: "Aroma Veil", description: "The bearer and its allies are protected from moves that limit their move choices.", type: PokemonType.FAIRY },
  { id: "misty-surge", name: "Misty Surge", description: "When the bearer enters battle, the field becomes Misty Terrain.", type: PokemonType.FAIRY },

  // Additional Normal Type Abilities
  { id: "run-away", name: "Run Away", description: "The bearer can always flee from battle, ignoring the escape calculation.", type: PokemonType.NORMAL },
  { id: "normalize", name: "Normalize", description: "The bearer's moves become Normal-type.", type: PokemonType.NORMAL },
  { id: "adaptability", name: "Adaptability", description: "The STAB for the bearer's moves is 2x rather than 1.5x.", type: PokemonType.NORMAL },
  { id: "skill-link", name: "Skill Link", description: "The bearer's multi-hit moves always hit the maximum number of times.", type: PokemonType.NORMAL },
  { id: "super-luck", name: "Super Luck", description: "The chance of a bearer's move being a critical hit is increased by 1 stage.", type: PokemonType.NORMAL },
  { id: "simple", name: "Simple", description: "All changes to the bearer's stat stages are doubled.", type: PokemonType.NORMAL },
  { id: "unaware", name: "Unaware", description: "When the bearer uses a move, it ignores the target's stat changes.", type: PokemonType.NORMAL },
  { id: "klutz", name: "Klutz", description: "The effects of the bearer's held item are negated.", type: PokemonType.NORMAL },
  { id: "unburden", name: "Unburden", description: "After the bearer loses its held item, its Speed is doubled.", type: PokemonType.NORMAL },

  // Additional Fire Type Abilities
  { id: "white-smoke", name: "White Smoke", description: "The bearer's stats cannot be lowered by other Pokemon.", type: PokemonType.FIRE },

  // Additional Water Type Abilities
  { id: "water-veil-2", name: "Water Veil", description: "The bearer cannot become burned.", type: PokemonType.WATER },
  { id: "storm-drain-2", name: "Storm Drain", description: "The bearer is immune to Water-type moves and redirects them.", type: PokemonType.WATER },
  { id: "swift-swim-2", name: "Swift Swim", description: "The bearer's Speed is doubled in rain weather.", type: PokemonType.WATER },

  // Additional Electric Type Abilities  
  { id: "lightning-rod-2", name: "Lightning Rod", description: "The bearer is immune to Electric-type moves and redirects them.", type: PokemonType.ELECTRIC },
  { id: "motor-drive-2", name: "Motor Drive", description: "The bearer is immune to Electric-type moves and boosts Speed when hit.", type: PokemonType.ELECTRIC },
  { id: "plus", name: "Plus", description: "The bearer's Special Attack is boosted by 50% while the bearer's ally has Plus or Minus.", type: PokemonType.ELECTRIC },
  { id: "minus", name: "Minus", description: "The bearer's Special Attack is boosted by 50% while the bearer's ally has Plus or Minus.", type: PokemonType.ELECTRIC },

  // Additional Grass Type Abilities
  { id: "sap-sipper-2", name: "Sap Sipper", description: "The bearer is immune to Grass-type moves and boosts Attack when hit.", type: PokemonType.GRASS },
  { id: "leaf-guard-2", name: "Leaf Guard", description: "In sunny weather, the bearer cannot obtain a non-volatile status problem.", type: PokemonType.GRASS },
  { id: "flower-veil-2", name: "Flower Veil", description: "All Grass-type Pokemon on the bearer's side cannot obtain status problems.", type: PokemonType.GRASS },
  { id: "flower-gift-2", name: "Flower Gift", description: "The bearer's Attack and Special Defense are boosted by 50% in sunny weather.", type: PokemonType.GRASS },
  { id: "grass-pelt-2", name: "Grass Pelt", description: "The bearer's Defense is boosted by 50% while Grassy Terrain is in effect.", type: PokemonType.GRASS },
  { id: "grassy-surge", name: "Grassy Surge", description: "When the bearer enters battle, the field becomes Grassy Terrain.", type: PokemonType.GRASS },

  // Additional Ice Type Abilities
  { id: "snow-cloak-2", name: "Snow Cloak", description: "The bearer's evasion is boosted by 25% in hail weather and takes no hail damage.", type: PokemonType.ICE },
  { id: "snow-warning-2", name: "Snow Warning", description: "When the bearer enters battle, starts hail weather.", type: PokemonType.ICE },
  { id: "refrigerate", name: "Refrigerate", description: "The bearer's Normal-type moves become Ice-type and gain 30% power.", type: PokemonType.ICE },
  { id: "slush-rush", name: "Slush Rush", description: "The bearer's Speed is doubled in hail weather.", type: PokemonType.ICE },

  // Additional Fighting Type Abilities
  { id: "no-guard", name: "No Guard", description: "The bearer's moves and moves targeting the bearer will always hit.", type: PokemonType.FIGHTING },
  { id: "iron-fist-2", name: "Iron Fist", description: "The power of the bearer's punching moves is boosted by 20%.", type: PokemonType.FIGHTING },
  { id: "reckless", name: "Reckless", description: "The power of the bearer's recoil-inflicting moves is boosted by 20%.", type: PokemonType.FIGHTING },

  // Additional Poison Type Abilities
  { id: "stench", name: "Stench", description: "When the bearer hits a Pokemon with a move, 10% chance of making the target flinch.", type: PokemonType.POISON },
  { id: "effect-spore", name: "Effect Spore", description: "When hit with a contact move, 30% chance of inflicting paralysis, poison, or sleep.", type: PokemonType.POISON },
  { id: "liquid-ooze", name: "Liquid Ooze", description: "If the bearer's HP is drained, the drainer is damaged instead of healed.", type: PokemonType.POISON },

  // Additional Ground Type Abilities
  { id: "earth-eater", name: "Earth Eater", description: "The bearer is immune to Ground-type moves and heals when hit by them.", type: PokemonType.GROUND },

  // Additional Flying Type Abilities
  { id: "big-pecks", name: "Big Pecks", description: "The bearer's Defense cannot be lowered.", type: PokemonType.FLYING },
  { id: "delta-stream", name: "Delta Stream", description: "When the bearer enters battle, starts windy weather that weakens Flying-type weaknesses.", type: PokemonType.FLYING },

  // Additional Psychic Type Abilities
  { id: "forewarn-2", name: "Forewarn", description: "When the bearer enters battle, announces the foe's strongest move.", type: PokemonType.PSYCHIC },
  { id: "anticipation-2", name: "Anticipation", description: "When the bearer enters battle, senses if foes have super-effective or OHKO moves.", type: PokemonType.PSYCHIC },
  { id: "wonder-skin", name: "Wonder Skin", description: "Lowers the accuracy of status moves that target the bearer to 50%.", type: PokemonType.PSYCHIC },

  // Additional Bug Type Abilities
  { id: "run-away-2", name: "Run Away", description: "The bearer can always flee from battle.", type: PokemonType.BUG },

  // Additional Rock Type Abilities
  { id: "shell-armor", name: "Shell Armor", description: "The chance of a move used against the bearer being a critical hit is 0.", type: PokemonType.ROCK },

  // Additional Ghost Type Abilities
  { id: "aftermath", name: "Aftermath", description: "When the bearer is knocked out by a contact move, the attacker loses 1/4 HP.", type: PokemonType.GHOST },

  // Additional Dragon Type Abilities
  { id: "rough-skin", name: "Rough Skin", description: "When hit with a contact move, the attacker loses 1/8 of its maximum HP.", type: PokemonType.DRAGON },

  // Additional Dark Type Abilities
  { id: "prankster", name: "Prankster", description: "Increases the priority of the bearer's status moves by 1.", type: PokemonType.DARK },
  { id: "super-luck-2", name: "Super Luck", description: "The chance of a bearer's move being a critical hit is increased.", type: PokemonType.DARK },

  // Additional Steel Type Abilities
  { id: "bulletproof", name: "Bulletproof", description: "The bearer is immune to ballistic moves.", type: PokemonType.STEEL },
  { id: "heatproof", name: "Heatproof", description: "The power of Fire-type moves used against the bearer is halved.", type: PokemonType.STEEL }
];
