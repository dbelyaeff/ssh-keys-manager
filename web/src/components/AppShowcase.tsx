import React from "react";
import { GlowCard } from "./ui/spotlight-card";
import { motion } from "framer-motion";

interface AppShowcaseProps {
  title?: string;
  highlightedTitle?: string;
  imgSrc: string;
}

export const AppShowcase: React.FC<AppShowcaseProps> = ({ 
  title = "Ваш терминал,", 
  highlightedTitle = "Ваши правила",
  imgSrc
}) => {
  return (
    <section className="flex flex-col bg-obsidian overflow-hidden w-full py-20 px-6">
      <div className="max-w-7xl mx-auto w-full">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-4">
            {title}
          </h2>
          <div className="text-4xl md:text-[6rem] font-bold mt-1 leading-none text-electric drop-shadow-[0_0_30px_rgba(0,242,255,0.3)]">
            {highlightedTitle}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 40 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="relative max-w-5xl mx-auto [perspective:2000px]"
        >
          <GlowCard 
            glowColor="blue"
            customSize={true}
            enableTilt={true}
            className="w-full relative shadow-[0_0_80px_rgba(0,0,0,0.6)] overflow-hidden rounded-[2rem] border border-white/10 p-0 active:scale-[0.98] transition-transform"
          >
            <div className="relative z-10 w-full overflow-hidden rounded-[2rem] p-1 glass">
              <img 
                src={imgSrc} 
                alt="App Showcase" 
                className="w-full h-auto object-cover rounded-[1.8rem] transition-transform duration-1000 group-hover:scale-[1.02]" 
              />
              
              {/* Overlay highlight */}
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-white/10 to-transparent opacity-30" />
            </div>
          </GlowCard>
          
          {/* External Glow Background */}
          <div className="absolute -inset-4 bg-electric/10 blur-[100px] -z-10 rounded-[3rem]" />
        </motion.div>
      </div>
    </section>
  );
};
