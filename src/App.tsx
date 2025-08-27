import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Statistics from './pages/Statistics';

function App() {
  return (
    <Router>
      <div className="min-h-screen">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/statistics" element={<Statistics />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
