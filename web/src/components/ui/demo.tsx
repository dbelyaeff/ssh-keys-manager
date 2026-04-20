import { GlowCard } from "./spotlight-card";

export function Default(){
  return(
    <div className="w-screen h-screen flex flex-row items-center justify-center gap-10 custom-cursor bg-obsidian">
      <GlowCard glowColor="blue">
        <div className="p-4 text-white">Card 1</div>
      </GlowCard>
      <GlowCard glowColor="purple">
        <div className="p-4 text-white">Card 2</div>
      </GlowCard>
      <GlowCard glowColor="green">
        <div className="p-4 text-white">Card 3</div>
      </GlowCard>
    </div>
  );
};
