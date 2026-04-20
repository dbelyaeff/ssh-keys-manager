import * as React from "react"
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ButtonCtaProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    label?: string;
    className?: string;
    href?: string;
    target?: string;
}

function ButtonCta({ label = "Get Access", className, href, target, ...props }: ButtonCtaProps) {
    const Component = href ? 'a' : Button;
    const buttonProps = href ? { href, target } : props;

    return (
        <Component
            {...(href ? {} : { variant: "ghost" })}
            className={cn(
                "group relative w-full h-12 px-8 rounded-xl overflow-hidden transition-all duration-500 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center cursor-pointer",
                !href && "bg-transparent border-none p-0",
                className
            )}
            {...(buttonProps as any)}
        >
            {/* Outer Border Gradient */}
            <div className="absolute inset-0 rounded-xl p-[1px] bg-gradient-to-b from-[#654358] via-[#17092A] to-[#2F0D64] pointer-events-none">
                <div className="absolute inset-0 bg-[#170928] rounded-xl opacity-90" />
            </div>

            {/* Background Layers */}
            <div className="absolute inset-[1px] bg-[#170928] rounded-xl opacity-95 pointer-events-none" />
            <div className="absolute inset-[1px] bg-gradient-to-r from-[#170928] via-[#1d0d33] to-[#170928] rounded-xl opacity-90 pointer-events-none" />
            <div className="absolute inset-[1px] bg-gradient-to-b from-[#654358]/40 via-[#1d0d33] to-[#2F0D64]/30 rounded-xl opacity-80 pointer-events-none" />
            <div className="absolute inset-[1px] bg-gradient-to-br from-[#C787F6]/10 via-[#1d0d33] to-[#2A1736]/50 rounded-xl pointer-events-none" />

            {/* Inner Shadow */}
            <div className="absolute inset-[1px] shadow-[inset_0_0_15px_rgba(199,135,246,0.15)] rounded-xl pointer-events-none" />

            {/* Text and Icon */}
            <div className="relative z-20 flex items-center justify-center gap-2 pointer-events-none">
                <span className="text-base md:text-lg font-display font-medium bg-gradient-to-b from-[#D69DDE] via-[#B873F8] to-[#9F5CF0] bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(199,135,246,0.3)] tracking-tight">
                    {label}
                </span>
            </div>

            {/* Hover Shine Effect */}
            <div className="absolute inset-[1px] opacity-0 transition-opacity duration-300 bg-gradient-to-r from-[#2A1736]/30 via-[#C787F6]/20 to-[#2A1736]/30 group-hover:opacity-100 rounded-xl pointer-events-none" />
            <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-[-20deg] pointer-events-none" />
        </Component>
    );
}

export { ButtonCta }
