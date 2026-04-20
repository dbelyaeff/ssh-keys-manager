import React from "react";
import { MacbookScroll } from "./ui/macbook-scroll";

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
    <section className="flex flex-col bg-obsidian overflow-hidden w-full">
      <MacbookScroll
        title={
          <h1 className="text-3xl md:text-5xl font-display font-bold text-center text-white">
            {title}<br />
            <span className="text-4xl md:text-[6rem] font-bold mt-1 leading-none text-electric">
              {highlightedTitle}
            </span>
          </h1>
        }
        src={imgSrc}
        showGradient={true}
      />
    </section>
  );
};
