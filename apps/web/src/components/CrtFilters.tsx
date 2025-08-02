// apps/web/src/components/CrtFilters.tsx
import React from 'react';

const CrtFilters: React.FC = () => (
  <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
    <defs>
      <filter id="crtWobble" x="-20%" y="-20%" width="140%" height="140%">
        <feTurbulence type="fractalNoise" baseFrequency="0.003 0.006" numOctaves="2" seed="3" result="noise">
          <animate attributeName="baseFrequency" dur="12s" values="0.003 0.006; 0.004 0.007; 0.003 0.006" repeatCount="indefinite" />
        </feTurbulence>
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" xChannelSelector="R" yChannelSelector="G">
          <animate attributeName="scale" dur="10s" values="1;2;1" repeatCount="indefinite" />
        </feDisplacementMap>
      </filter>
    </defs>
  </svg>
);

export default CrtFilters;