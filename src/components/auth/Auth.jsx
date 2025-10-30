import React, { useState, useEffect } from 'react';
import './Auth.css';
import { FaUser, FaLock, FaEnvelope, FaTachometerAlt, FaShieldAlt, FaChartLine } from 'react-icons/fa';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [slideRight, setSlideRight] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Create cyber lines on mount
  useEffect(() => {
    const createCyberLines = () => {
      const container = document.querySelector('.cyber-lines');
      if (!container) return;

      for (let i = 0; i < 5; i++) {
        const line = document.createElement('div');
        line.className = 'cyber-line';
        line.style.top = `${Math.random() * 100}%`;
        line.style.animationDelay = `${Math.random() * 8}s`;
        container.appendChild(line);
      }
    };

    createCyberLines();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Validate form
    if (!isLogin && formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        // Check if user exists
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const user = users.find(u => u.email === formData.email && u.password === formData.password);
        
        if (user) {
          localStorage.setItem('currentUser', JSON.stringify({
            email: user.email,
            username: user.username
          }));
          window.dispatchEvent(new Event('userStateChanged'));
          window.history.pushState({}, '', '/');
          window.dispatchEvent(new PopStateEvent('popstate'));
        } else {
          setError('Invalid email or password');
        }
      } else {
        // Register new user
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        if (users.some(u => u.email === formData.email)) {
          setError('Email already exists');
        } else {
          users.push({
            email: formData.email,
            password: formData.password,
            username: formData.username
          });
          localStorage.setItem('users', JSON.stringify(users));
          localStorage.setItem('currentUser', JSON.stringify({
            email: formData.email,
            username: formData.username
          }));
          window.dispatchEvent(new Event('userStateChanged'));
          window.history.pushState({}, '', '/');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    }
    
    setLoading(false);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const toggleMode = () => {
    setSlideRight(!slideRight);
    setTimeout(() => {
      setIsLogin(!isLogin);
      setFormData({
        email: '',
        password: '',
        confirmPassword: '',
        username: ''
      });
    }, 600);
  };

  return (
    <div className="auth-container">
      <div className={`auth-content ${slideRight ? 'slide-right' : ''}`}>
        <div className={`auth-side left colored-side ${isLogin ? 'login-mode' : 'signup-mode'}`}>
          <div className="hero-content">
            <div className="cyber-lines"></div>
            <h1>PodiumGuard</h1>
            <p>{isLogin ? 'Access Your Racing Dashboard' : 'Join the Racing Elite'}</p>
            <div className="feature-grid">
              <div className="feature">
                <FaTachometerAlt />
                <span>Real-time Performance Analytics</span>
              </div>
              <div className="feature">
                <FaShieldAlt />
                <span>Secure Access Control</span>
              </div>
              <div className="feature">
                <FaChartLine />
                <span>Advanced Telemetry Data</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="auth-side right form-side">
          <form onSubmit={handleSubmit} className={`auth-form ${loading ? 'loading' : ''}`}>
            <div className="form-header">
              <h2>{isLogin ? 'Sign In' : 'Sign Up'}</h2>
              <p>{isLogin ? 'Access your dashboard' : 'Create your account'}</p>
            </div>

            {error && <div className="error-message">{error}</div>}

            {!isLogin && (
              <div className="form-group">
                <label>Username</label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="👤 Enter your username"
                    required
                  />
                  <span className="input-focus"></span>
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Email</label>
              <div className="input-wrapper">
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="✉️ Enter your email"
                  required
                />
                <span className="input-focus"></span>
              </div>
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="input-wrapper">
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="🔒 Enter your password"
                  required
                />
                <span className="input-focus"></span>
              </div>
            </div>

            {!isLogin && (
              <div className="form-group">
                <label>Confirm Password</label>
                <div className="input-wrapper">
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="🔒 Confirm your password"
                    required
                  />
                  <span className="input-focus"></span>
                </div>
              </div>
            )}

            <button type="submit" className="auth-button">
              {isLogin ? 'Sign In' : 'Create Account'}
            </button>

            <div className="auth-switch">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <button type="button" className="switch-button" onClick={toggleMode}>
                {isLogin ? 'Sign Up' : 'Sign In'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Auth;