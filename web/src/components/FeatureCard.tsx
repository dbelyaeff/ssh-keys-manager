import React from 'react';
import { GlowCard } from './ui/spotlight-card';
import * as LucideIcons from 'lucide-react';

interface FeatureCardProps {
  title: string;
  description: string;
  iconName: string;
  index: number;
}

const colors: Array<'blue' | 'purple' | 'green' | 'red' | 'orange'> = ['blue', 'purple', 'green', 'orange', 'red', 'blue'];

const iconMap: Record<string, keyof typeof LucideIcons> = {
  shield: 'Shield',
  monitor: 'Monitor',
  key: 'Key',
  terminal: 'Terminal',
  lock: 'Lock',
  radio: 'Radio'
};

export const FeatureCard: React.FC<FeatureCardProps> = ({ title, description, iconName, index }) => {
  const Icon = LucideIcons[iconMap[iconName] || 'Zap'] as React.ElementType;
  const glowColor = colors[index % colors.length];

  return (
    <GlowCard 
      glowColor={glowColor}
      customSize={true}
      className="h-full flex flex-col p-6 md:p-8"
    >
      <div className="relative z-10">
        <div className={`w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-6 text-white transition-transform group-hover:scale-110`}>
          <Icon size={24} />
        </div>
        <h3 className="text-lg md:text-xl font-bold mb-4 font-display text-white">{title}</h3>
        <p className="text-sm md:text-base text-slate-300 leading-relaxed font-medium">
          {description}
        </p>
      </div>
    </GlowCard>
  );
};
