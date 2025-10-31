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
import Auth from './components/auth/Auth';
import MEVDefenseDashboard from './components/MEVDefenseDashboard';
import EnhancedMempool from './components/EnhancedMempool';
import Track3D from './pages/Track3D';

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
          <MEVDefenseDashboard />
        ) : route === '/insurancepool' ? (
          <InsurancePool />
        ) : route === '/telemetry' ? (
          <Telemetry />
        ) : route === '/mempool' ? (
          <EnhancedMempool />
        ) : route === '/audit' ? (
          <Audit />
        ) : route === '/auth' ? (
          <Auth />
        ) : route === '/track' ? (
          <Track3D />
        ) : (
          <>
            <Hero />
            <Services />
            <Crew />
          </>
        )}
      </main>
      {route !== '/auth' && <Footer />}
    </div>
  );
}

export default App;
