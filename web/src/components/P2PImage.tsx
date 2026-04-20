import React from 'react';
import { GlowCard } from './ui/spotlight-card';

interface P2PImageProps {
  imgSrc: string;
}

export const P2PImage: React.FC<P2PImageProps> = ({ imgSrc }) => {
  return (
    <div className="w-full [perspective:1000px]">
      <GlowCard 
        glowColor="blue"
        customSize={true}
        enableTilt={true}
        className="w-full relative shadow-2xl overflow-hidden rounded-2xl border border-white/5 p-0"
      >
        <div className="relative z-10 w-full overflow-hidden rounded-2xl">
          <img 
            src={imgSrc} 
            alt="P2P Sync Visualization" 
            className="w-full h-auto object-cover transition-transform duration-700 hover:scale-105" 
          />
        </div>
      </GlowCard>
    </div>
  );
};
