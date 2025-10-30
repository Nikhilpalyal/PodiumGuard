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
      title: 'Performance Tuning',
      description: 'Maximize your vehicle\'s potential with our expert tuning services. Get the most out of your engine with our specialized tuning solutions.',
      icon: '⚡',
    },
    {
      id: 2,
      title: 'Custom Builds',
      description: 'Create your dream vehicle with our bespoke customization options. From concept to completion, we bring your vision to life.',
      icon: '🔧',
    },
    {
      id: 3,
      title: 'Maintenance',
      description: 'Keep your vehicle in peak condition with our expert technicians. Regular maintenance to ensure optimal performance.',
      icon: '🔍',
    },
    {
      id: 4,
      title: 'Restoration',
      description: 'Bring classic vehicles back to their original glory. Meticulous attention to detail in every restoration project.',
      icon: '✨',
    },
    {
      id: 5,
      title: 'Race Track Preparation',
      description: 'Get your vehicle ready for the track with our professional race preparation services. From safety checks to performance optimization.',
      icon: '🏁',
    },
    {
      id: 6,
      title: 'Advanced Diagnostics',
      description: 'State-of-the-art diagnostic tools and expertise to identify and resolve complex automotive issues with precision.',
      icon: '💻',
    }
  ];

  const [activeService, setActiveService] = useState(0);
  const sectionRef = useRef(null);
  const modelRef = useRef(null);

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
          
          // Update model position with smooth animation
          if (modelRef.current) {
            const rotateY = scrollProgress * 360; // One full rotation through all features
            const translateY = Math.sin(scrollProgress * Math.PI) * 50; // Smooth up and down movement
            modelRef.current.style.transform = 
              `translateY(${translateY}px) rotateY(${rotateY}deg)`;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial call
    return () => window.removeEventListener('scroll', handleScroll);
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
                  src="/2014-ferrari-laferrari/source/FINAL_MODEL/FINAL_MODEL.fbx"
                  alt="Ferrari LaFerrari 3D model"
                  auto-rotate
                  camera-controls
                  shadow-intensity="1"
                  camera-orbit="45deg 55deg 2.5m"
                  environment-image="neutral"
                  style={{ width: '100%', height: '100%' }}
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
          <div className="services-grid">
            {services.map((service, index) => (
              <div 
                key={service.id} 
                className={`service-card ${index === activeService ? 'active' : ''}`}
                style={{
                  opacity: index === activeService ? 1 : 0,
                  transform: `translateX(${index === activeService ? '0' : '100%'})`,
                  position: index === activeService ? 'relative' : 'absolute',
                  transition: 'all 0.6s ease-in-out',
                  top: 0,
                  right: 0,
                  width: '100%'
                }}
              >
                <div className="service-icon">{service.icon}</div>
                <div className="service-content">
                  <h3 className="service-title">{service.title}</h3>
                  <p className="service-description">{service.description}</p>
                </div>
                <button className="learn-more">
                  <span>Explore</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Services;