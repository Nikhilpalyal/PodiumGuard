import './App.css';
import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Services from './components/Services';
import Crew from './components/Crew';
import Footer from './components/Footer';
import Dashboard from './pages/Dashboard';
import InsurancePool from './pages/InsurancePool';
import Telemetry from './pages/Telemetry';
import Mempool from './pages/Mempool';
import Audit from './pages/Audit';

function App() {
  const [route, setRoute] = useState(window.location.pathname);

  useEffect(() => {
    const onPop = () => setRoute(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  return (
    <div className="app">
      <Navbar />
      <main>
        {route === '/dashboard' ? (
          <Dashboard />
        ) : route === '/insurancepool' ? (
          <InsurancePool />
        ) : route === '/telemetry' ? (
          <Telemetry />
        ) : route === '/mempool' ? (
          <Mempool />
        ) : route === '/audit' ? (
          <Audit />
        ) : (
          <>
            <Hero />
            <Services />
            <Crew />
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default App;
