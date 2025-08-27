import { Link, useLocation } from 'react-router-dom';
import { Home, BarChart3 } from 'lucide-react';

interface NavbarProps {
  pokemonCount?: number;
  totalPokemon?: number;
  filteredCount?: number;
  hasActiveFilters?: boolean;
}

const Navbar = ({ pokemonCount = 0, totalPokemon = 151, filteredCount, hasActiveFilters }: NavbarProps) => {
  const location = useLocation();
  
  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/statistics', label: 'Statistics', icon: BarChart3 },
  ];

  return (
    <nav className="bg-white/10 backdrop-blur-md border-b border-white/20">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full overflow-hidden">
              <img src="/lgicon.png" alt="LG Icon" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col">
              <span className="text-yellow-300 font-bold text-xl">LG Pokedex</span>
              <div className="text-white/60 text-sm">
                <span className="text-yellow-300 font-bold">{pokemonCount}</span> / {totalPokemon} Pokemon Registered
                {hasActiveFilters && filteredCount !== undefined && (
                  <span className="ml-2 text-blue-300">
                    ({filteredCount} filtered)
                  </span>
                )}
              </div>
            </div>
          </Link>
          
          <div className="flex space-x-1">
            {navItems.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                  location.pathname === path
                    ? 'bg-yellow-400 text-black'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon size={18} />
                <span className="hidden md:block">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
