# LGDEX - Pokemon Art Gallery

A simple and beautiful website to showcase custom Pokemon artwork with statistics tracking.

## Features

### 🏠 Home Page - Pokedex Style
- Grid layout showing all 151 Pokemon slots (like a Pokedex)
- Interactive hover effects that show large preview images
- Shows which slots have custom artwork vs empty slots
- Progress tracking (X/151 Pokemon completed)

### 📊 Statistics Page
- Overview cards showing total stats
- Charts for type distribution and artist contributions
- Individual artist performance metrics
- Most popular Pokemon rankings

## Technology Stack

- **React** with TypeScript
- **Vite** for fast development
- **Tailwind CSS** for styling
- **Chart.js** for statistics visualization
- **Lucide React** for icons
- **Firebase** ready for backend (optional)

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   Navigate to `http://localhost:3000`

## Project Structure

```
src/
├── components/
│   └── Navbar.tsx          # Navigation bar
├── pages/
│   ├── Home.tsx            # Pokedex-style main page
│   └── Statistics.tsx      # Charts and analytics
├── types/
│   └── pokemon.ts          # TypeScript interfaces
├── config/
│   └── firebase.ts         # Firebase configuration (ready to use)
└── App.tsx                 # Main app component
```

## Adding New Pokemon

Currently using mock data. To add real Pokemon artwork:

1. Update the `mockPokemon` array in `Home.tsx`
2. Add corresponding data in `Statistics.tsx`
3. Later: Connect to Firebase database for dynamic content

## Customization

- Update colors in `tailwind.config.js`
- Modify Pokemon types in the type system
- Add new chart types in Statistics page
- Customize hover effects and animations

## Future Enhancements

- Firebase integration for dynamic content
- Image upload functionality
- User authentication (if needed)
- Search and filter capabilities
- Like/comment system

## License

This project is for personal use.