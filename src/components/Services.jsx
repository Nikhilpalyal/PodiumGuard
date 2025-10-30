import React, { useEffect, useState, useRef } from 'react';
import './Services.css';

// Load model-viewer script dynamically
const loadModelViewer = () => {
  const script = document.createElement('script');
  script.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.3.0/model-viewer.min.js';
  script.type = 'module';
  document.head.appendChild(script);
  return () => {
    document.head.removeChild(script);
  };
};

const Services = () => {
  const carImages = [
    '/images/ferrari-f8.jpg',
    '/images/porsche-911.jpg',
    '/images/lamborghini-huracan.jpg',
    '/images/mclaren-720s.jpg',
    '/images/aston-martin-vantage.jpg',
    '/images/mercedes-amg-gt.jpg'
  ];

  const services = [
    {
      id: 1,
      title: 'MEV Defence',
      description: 'Real-time protection against frontrunning, sandwiching, and malicious MEV tactics.',
      icon: '🛡️',
    },
    {
      id: 2,
      title: 'Audit',
      description: 'Comprehensive audits for contracts, systems, and on-chain logic integrity.',
      icon: '🔎',
    },
    {
      id: 3,
      title: 'Trophy',
      description: 'Podium-grade achievements and analytics for performance and reliability.',
      icon: '🏆',
    },
    {
      id: 4,
      title: 'Telemetry Engine',
      description: 'High-fidelity telemetry streams for metrics, alerts, and operational insights.',
      icon: '📡',
    },
    {
      id: 5,
      title: 'Insurance Pool',
      description: 'Transparent, verifiable coverage with real-time AI risk assessment.',
      icon: '🪙',
    }
  ];

  const [activeService, setActiveService] = useState(0);
  const sectionRef = useRef(null);
  const modelRef = useRef(null);
  const viewerRef = useRef(null);
  // Removed viewerContainerRef; use modelRef wrapper instead

  useEffect(() => {
    loadModelViewer();
    
    const handleScroll = () => {
      if (sectionRef.current) {
        const rect = sectionRef.current.getBoundingClientRect();
        const startPoint = window.innerHeight * 0.3;
        const sectionHeight = rect.height;
        const scrollProgress = Math.max(0, Math.min(1, (startPoint - rect.top) / sectionHeight));
        
        // Calculate which feature should be active based on scroll position
        if (scrollProgress >= 0) {
          const stepSize = 1 / services.length;
          const serviceIndex = Math.min(
            Math.floor(scrollProgress / stepSize),
            services.length - 1
          );
          setActiveService(serviceIndex);
          
          // Keep model still on scroll; interaction handled by pointer movement
          if (modelRef.current) {
            modelRef.current.style.transform = 'none';
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial call

    // Cursor-driven camera control
    const handlePointerMove = (e) => {
      if (!viewerRef.current || !modelRef.current) return;
      const bounds = modelRef.current.getBoundingClientRect();
      const x = (e.clientX - bounds.left) / bounds.width; // 0..1
      const y = (e.clientY - bounds.top) / bounds.height; // 0..1

      const normalizedX = (x - 0.5) * 2; // -1..1
      const normalizedY = (y - 0.5) * 2; // -1..1

      // Slightly stronger mapping for clearer response
      const azimuthDeg = 90 + normalizedX * 120; // rotate left/right
      const polarDeg = 60 - normalizedY * 35; // tilt up/down

      // Zoom based on distance from center
      const distanceFromCenter = Math.min(1, Math.hypot(normalizedX, normalizedY));
      const radiusM = 1.5 + distanceFromCenter * 0.7; // 1.5m to 2.2m
      const fovDeg = 35 + distanceFromCenter * 8; // subtle zoom

      try {
        viewerRef.current.cameraOrbit = `${azimuthDeg}deg ${polarDeg}deg ${radiusM}m`;
        viewerRef.current.fieldOfView = `${fovDeg}deg`;
      } catch (_) {}
    };

    const container = modelRef.current;
    container?.addEventListener('pointermove', handlePointerMove);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      container?.removeEventListener('pointermove', handlePointerMove);
    };
  }, [services.length]);

  return (
    <section className="services-section" id="services" ref={sectionRef}>
      <div className="services-container">
        <div className="section-header">
          <h2 className="section-title">Our Services</h2>
          <p className="section-subtitle">Premium automotive solutions tailored to your needs</p>
        </div>
        
        <div className="services-layout">
          {/* Car showcase on the left */}
          <div className="model-container">
            <div className="model-wrapper" ref={modelRef}>
              {/* 3D Model */}
              <div className="model-3d">
                <model-viewer
                  src="/2014_ferrari.glb"
                  alt="Ferrari LaFerrari 3D model"
                  camera-controls
                  touch-action="none"
                  shadow-intensity="1"
                  camera-orbit="90deg 60deg 1.6m"
                  environment-image="neutral"
                  style={{ width: '100%', height: '100%' }}
                  ref={viewerRef}
                >
                  <div className="progress-bar" slot="progress-bar">
                    <div className="progress-bar-container">
                      <div className="progress-bar-fill"></div>
                    </div>
                  </div>
                </model-viewer>
              </div>
              
              {/* Scrolling Car Images */}
              <div className="car-images-container">
                {carImages.map((image, index) => (
                  <div
                    key={index}
                    className="car-image"
                    style={{
                      backgroundImage: `url(${image})`,
                      opacity: index === activeService ? 1 : 0,
                      transform: `
                        scale(${index === activeService ? 1.1 : 0.9})
                        translateY(${index === activeService ? 0 : 30}px)
                      `,
                      zIndex: index === activeService ? 2 : 1
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Services list on the right */}
          <div className="pitlane-panel">
            {/* Removed telemetry-header */}
            <div className="pitlane-track">
              <div className="lap-markers">
                {services.map((_, i) => (
                  <div key={i} className={`marker ${i === activeService ? 'active' : ''}`}> 
                    <span/>
                  </div>
                ))}
              </div>
              <div className="pit-box">
                {services.map((service, index) => (
                  <div 
                    key={service.id}
                    className={`pit-card ${index === activeService ? 'active' : ''}`}
                    style={{ zIndex: index === activeService ? 3 : 1 }}
                  >
                    <div className="pit-card-accent"/>
                    <div className="pit-card-head">
                      <div className="pit-icon">{service.icon}</div>
                      <h3 className="pit-title">{service.title}</h3>
                    </div>
                    <p className="pit-desc">{service.description}</p>
                    <button className="cta">Enter Pit</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Services;