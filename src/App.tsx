import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Challenges from './pages/Challenges';
import Statistics from './pages/Statistics';
import Wheels from './pages/Wheels';

function App() {
  return (
    <Router>
      <div className="min-h-screen">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/challenges" element={
            <>
              <Navbar />
              <main className="container mx-auto px-4 py-8">
                <Challenges />
              </main>
            </>
          } />
          <Route path="/statistics" element={
            <>
              <Navbar />
              <main className="container mx-auto px-4 py-8">
                <Statistics />
              </main>
            </>
          } />
          <Route path="/wheels" element={
            <>
              <Navbar />
              <main className="container mx-auto px-4 py-8">
                <Wheels />
              </main>
            </>
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
