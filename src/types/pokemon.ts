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
  stats?: {
    hp: number;
    attack: number;
    defense: number;
    speed: number;
  };
  createdAt: Date;
  updatedAt: Date;
  likes: number;
  comments: Comment[];
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
