import React from 'react';
import './Crew.css';
import diyaImg from '../assets/diya.jpeg';
import meghaImg from '../assets/megha.jpeg';
import nikhilImg from '../assets/nikhil.jpeg';
import radhikaImg from '../assets/radhika.jpeg';

const Crew = () => {
  const teamMembers = [
    {
      id: 1,
      name: 'Diya',
      role: 'Engineer',
      image: diyaImg,
      social: { twitter: '#', linkedin: '#', instagram: '#' }
    },
    {
      id: 2,
      name: 'Megha',
      role: 'Analyst',
      image: meghaImg,
      social: { twitter: '#', linkedin: '#', instagram: '#' }
    },
    {
      id: 3,
      name: 'Nikhil',
      role: 'Developer',
      image: nikhilImg,
      social: { twitter: '#', linkedin: '#', instagram: '#' }
    },
    {
      id: 4,
      name: 'Radhika',
      role: 'Lead',
      image: radhikaImg,
      social: { twitter: '#', linkedin: '#', instagram: '#' }
    }
  ];

  return (
    <section className="crew-section" id="crew">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">Meet Our Crew</h2>
          <p className="section-subtitle">The passionate professionals behind your vehicle's transformation</p>
        </div>
        
        <div className="team-grid">
          {teamMembers.map((member) => (
            <div key={member.id} className="team-card">
              <div className="team-image">
                <img src={member.image} alt={member.name} />
                <div className="social-links">
                  <a href={member.social.twitter} className="social-link" aria-label={`${member.name}'s Twitter`}>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                    </svg>
                  </a>
                  <a href={member.social.linkedin} className="social-link" aria-label={`${member.name}'s LinkedIn`}>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452z"/>
                    </svg>
                  </a>
                  <a href={member.social.instagram} className="social-link" aria-label={`${member.name}'s Instagram`}>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.7-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                    </svg>
                  </a>
                </div>
              </div>
              <div className="team-info">
                <h3 className="member-name">{member.name}</h3>
                <p className="member-role">{member.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Crew;
