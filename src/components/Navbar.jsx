import './Navbar.css';
import img1 from '../assets/1.jpg';
import img2 from '../assets/2.jpg';
import img3 from '../assets/3.jpg';
import img4 from '../assets/4.jpg';
import img5 from '../assets/5.jpg';
import img6 from '../assets/6.jpg';

function Navbar() {
  const navigate = (e, path) => {
    e.preventDefault();
    if (window.location.pathname === path) return;
    window.history.pushState({}, '', path);
    // trigger popstate so App can react
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <nav className="navbar">
      <div className="nav-left">
        <a href="/" className="nav-link home" onClick={(e) => navigate(e, '/')}>Home</a>
        <div className="nav-links">
          <a href="/dashboard" className="nav-image-link" onClick={(e) => navigate(e, '/dashboard')}>
            <img src={img6} alt="dashboard" className="nav-image" />
          </a>
          <a href="/insurancepool" className="nav-image-link" onClick={(e) => navigate(e, '/insurancepool')}>
            <img src={img2} alt="Insurance Pool" className="nav-image" />
          </a>
          <a href="/page3" className="nav-image-link" onClick={(e) => navigate(e, '/page3')}>
            <img src={img3} alt="Page 3" className="nav-image" />
          </a>
        </div>
      </div>

      <div className="nav-center">
        <h1 className="logo">PODIUM GUARD</h1>
      </div>

      <div className="nav-right">
        <div className="nav-links">
          <a href="/audit" className="nav-image-link" onClick={(e) => navigate(e, '/audit')}>
            <img src={img4} alt="Audit & Proof" className="nav-image" />
          </a>
          <a href="/telemetry" className="nav-image-link" onClick={(e) => navigate(e, '/telemetry')}>
            <img src={img5} alt="Telemetry" className="nav-image" />
          </a>
          <a href="/mempool" className="nav-image-link" onClick={(e) => navigate(e, '/mempool')}>
            <img src={img1} alt="Mempool Scanner" className="nav-image" />
          </a>
        </div>
        <a href="/login" className="login-btn" onClick={(e) => navigate(e, '/login')}>LOGIN</a>
      </div>
    </nav>
  );
}

export default Navbar;
