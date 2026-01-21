"use client";
import { useState, useEffect } from 'react';

const ConfettiAnimation = ({ show }) => {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (show) {
      // Generate confetti particles
      const newParticles = [];
      const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#FFD700', '#FF69B4', '#87CEEB'];
      
      // Adjust particle count for mobile performance
      const particleCount = window.innerWidth < 768 ? 30 : 50;
      
      for (let i = 0; i < particleCount; i++) {
        newParticles.push({
          id: i,
          left: Math.random() * 100,
          animationDelay: Math.random() * 2,
          animationDuration: 3 + Math.random() * 2,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: window.innerWidth < 768 ? 8 + Math.random() * 12 : 10 + Math.random() * 20,
          type: Math.random() > 0.5 ? 'square' : 'rectangle'
        });
      }
      
      setParticles(newParticles);
      
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        setParticles([]);
      }, 5000);
      
      return () => clearTimeout(timer);
    } else {
      setParticles([]);
    }
  }, [show]);

  if (!show || particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            transform: translate(100vw, 100vh) rotate(0deg);
            opacity: 1;
          }
          25% {
            transform: translate(75vw, 75vh) rotate(90deg);
            opacity: 1;
          }
          50% {
            transform: translate(50vw, 50vh) rotate(180deg);
            opacity: 1;
          }
          75% {
            transform: translate(25vw, 25vh) rotate(270deg);
            opacity: 0.8;
          }
          100% {
            transform: translate(0vw, 0vh) rotate(360deg);
            opacity: 0;
          }
        }
        
        @media (max-width: 768px) {
          @keyframes confetti-fall-mobile {
            0% {
              transform: translate(100vw, 120vh) rotate(0deg) scale(0.8);
              opacity: 1;
            }
            25% {
              transform: translate(75vw, 90vh) rotate(90deg) scale(0.85);
              opacity: 1;
            }
            50% {
              transform: translate(50vw, 60vh) rotate(180deg) scale(0.9);
              opacity: 1;
            }
            75% {
              transform: translate(25vw, 30vh) rotate(270deg) scale(0.95);
              opacity: 0.8;
            }
            100% {
              transform: translate(0vw, 0vh) rotate(360deg) scale(1);
              opacity: 0;
            }
          }
        }
        
        .confetti-particle {
          position: absolute;
          animation: confetti-fall linear forwards;
          will-change: transform, opacity;
        }
        
        .confetti-square {
          border-radius: 2px;
        }
        
        .confetti-rectangle {
          border-radius: 2px;
          width: 6px !important;
        }
        
        @media (max-width: 768px) {
          .confetti-particle {
            animation: confetti-fall-mobile linear forwards;
          }
          
          .confetti-rectangle {
            width: 4px !important;
          }
        }
      `}</style>
      
      {particles.map((particle) => (
        <div
          key={particle.id}
          className={`confetti-particle ${particle.type === 'square' ? 'confetti-square' : 'confetti-rectangle'}`}
          style={{
            left: `${particle.left}%`,
            bottom: '0',
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            backgroundColor: particle.color,
            animationDelay: `${particle.animationDelay}s`,
            animationDuration: `${particle.animationDuration}s`,
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            // Hardware acceleration for mobile performance
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden'
          }}
        />
      ))}
    </div>
  );
};

export default ConfettiAnimation;
