// apps/web/src/components/Starfield.tsx
import React, { useMemo } from 'react';

/**
 * Generates a CSS box-shadow string to render a field of stars.
 * @param {number} count - The number of stars to generate.
 * @param {string} colorRGB - The RGB color string for the stars (e.g., '179, 224, 179').
 * @returns {string} A CSS box-shadow value.
 */
const generateStars = (count: number, colorRGB: string): string => {
  const canvasWidth = 2500;
  const canvasHeight = 2500;
  let boxShadow = '';

  for (let i = 0; i < count; i++) {
    const x = Math.floor(Math.random() * canvasWidth);
    const y = Math.floor(Math.random() * canvasHeight);
    const opacity = (Math.random() * 0.7 + 0.2).toFixed(2);

    // Randomly add blur and spread for a twinkling effect.
    let blur = 0;
    let spread = 0;
    if (Math.random() < 0.35) {
      blur = Math.floor(Math.random() * 3) + 1;
      spread = Math.random() < 0.3 ? 1 : 0;
    }

    boxShadow += `${x}px ${y}px ${blur}px ${spread}px rgba(${colorRGB}, ${opacity}), `;
  }
  return boxShadow.slice(0, -2); // Remove trailing comma and space
};

/**
 * Renders a multi-layered, animated starfield background.
 * Uses `useMemo` to ensure the star positions are calculated only once per render.
 * @returns {React.ReactElement} The starfield container div.
 */
const Starfield: React.FC = () => {
  // Memoize the star layers to prevent recalculation on every render.
  const starsSmall  = useMemo(() => generateStars(700, '179, 224, 179'), []); 
  const starsMedium = useMemo(() => generateStars(200, '160, 255, 160'), []); 
  const starsLarge  = useMemo(() => generateStars(100, '179, 224, 179'), []); 

  return (
    <div className="starfield-container" aria-hidden="true">
      {/* Each layer animates at a different speed for a parallax effect */}
      <div className="star-layer sway-slow">
        <div className="stars-small" style={{ boxShadow: starsSmall }} />
      </div>
      <div className="star-layer sway-medium">
        <div className="stars-medium" style={{ boxShadow: starsMedium }} />
      </div>
      <div className="star-layer sway-fast">
        <div className="stars-large" style={{ boxShadow: starsLarge }} />
      </div>

      {/* Superimposes a grid overlay for the CRT monitor aesthetic */}
      <div className="grid-overlay" />
    </div>
  );
};

export default Starfield;