// frontend/src/components/Starfield.tsx
import React, { useMemo } from 'react';

const generateStars = (count: number, colorRGB: string) => {
  const canvasWidth = 2500;
  const canvasHeight = 2500;
  let boxShadow = '';

  for (let i = 0; i < count; i++) {
    const x = Math.floor(Math.random() * canvasWidth);
    const y = Math.floor(Math.random() * canvasHeight);

    const opacity = (Math.random() * 0.7 + 0.2).toFixed(2);

    let blur = 0;
    let spread = 0;

    if (Math.random() < 0.35) {
      blur = Math.floor(Math.random() * 3) + 1;
      spread = Math.random() < 0.3 ? 1 : 0;
    }

    boxShadow += `${x}px ${y}px ${blur}px ${spread}px rgba(${colorRGB}, ${opacity}), `;
  }
  return boxShadow.slice(0, -2);
};

const Starfield: React.FC = () => {
  const starsSmall  = useMemo(() => generateStars(700, '179, 224, 179'), []); 
  const starsMedium = useMemo(() => generateStars(200, '160, 255, 160'), []); 
  const starsLarge  = useMemo(() => generateStars(100, '179, 224, 179'), []); 

  return (
    <div className="starfield-container" aria-hidden="true">
      <div className="star-layer sway-slow">
        <div className="stars-small" style={{ boxShadow: starsSmall }} />
      </div>
      <div className="star-layer sway-medium">
        <div className="stars-medium" style={{ boxShadow: starsMedium }} />
      </div>
      <div className="star-layer sway-fast">
        <div className="stars-large" style={{ boxShadow: starsLarge }} />
      </div>

      <div className="grid-overlay" />
    </div>
  );
};

export default Starfield;