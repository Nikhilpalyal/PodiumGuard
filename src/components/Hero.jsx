import { useEffect, useRef } from 'react';
import './Hero.css';
import carVideo from '../assets/car1.mp4';

function Hero() {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      const playPromise = video.play();
      
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.log("Video play was prevented:", error);
          const handleFirstInteraction = () => {
            video.play();
            document.removeEventListener('click', handleFirstInteraction);
          };
          document.addEventListener('click', handleFirstInteraction);
        });
      }
    }
  }, []);

  return (
    <section className="hero-section">
      <div className="video-container">
        <video
          ref={videoRef}
          className="hero-video"
          autoPlay
          muted
          loop
          playsInline
        >
          <source src={carVideo} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        <div className="hero-overlay">
          <div className="hero-content">
            <p className="tagline">Built for Speed. Forged for Trust.</p>
            <h2 className="headline">
              PodiumGuard X turns every on-chain moment into a victory lap for security
            </h2>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero