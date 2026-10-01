import { cn } from "@/lib/utils";

interface ContainmentShieldProps {
  className?: string;
  size?: number | string;
  variant?: "logo" | "hero";
}

export function ContainmentShield({
  className,
  size = 32,
  variant = "logo",
}: ContainmentShieldProps) {
  if (variant === "hero") {
    return (
      <div className={cn("relative flex items-center justify-center", className)}>
        {/* Ambient background glow */}
        <div className="absolute inset-0 m-auto size-48 rounded-full bg-amber-500/25 blur-3xl filter animate-pulse" />

        <svg
          viewBox="0 0 240 300"
          className="relative size-full filter drop-shadow-[0_20px_40px_rgba(245,158,11,0.35)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Outer golden rim gradient */}
            <linearGradient id="goldRim" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FDE68A" />
              <stop offset="35%" stopColor="#F59E0B" />
              <stop offset="70%" stopColor="#D97706" />
              <stop offset="100%" stopColor="#78350F" />
            </linearGradient>

            {/* Obsidian glass fill for shield body */}
            <linearGradient id="glassShieldLeft" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#18181B" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#09090B" stopOpacity="0.98" />
            </linearGradient>
            <linearGradient id="glassShieldRight" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#27272A" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#111113" stopOpacity="0.95" />
            </linearGradient>

            {/* Grid pattern inside shield */}
            <pattern id="shieldGrid" width="16" height="16" patternUnits="userSpaceOnUse">
              <path d="M 16 0 L 0 0 0 16" fill="none" stroke="#F59E0B" strokeWidth="0.5" strokeOpacity="0.12" />
            </pattern>

            {/* Core glow filter */}
            <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* 3D Extrusion Depth Layer (Lower shadow/rim) */}
          <path
            d="M 120 18 C 160 30 206 30 224 44 C 224 136 190 210 120 262 C 50 210 16 136 16 44 C 34 30 80 30 120 18 Z"
            fill="#451A03"
            transform="translate(0, 10)"
          />
          <path
            d="M 120 18 C 160 30 206 30 224 44 C 224 136 190 210 120 262 C 50 210 16 136 16 44 C 34 30 80 30 120 18 Z"
            fill="#78350F"
            transform="translate(0, 5)"
          />

          {/* Outer Shield Outline / Rim */}
          <path
            d="M 120 16 C 160 28 206 28 224 42 C 224 134 190 208 120 260 C 50 208 16 134 16 42 C 34 28 80 28 120 16 Z"
            fill="url(#goldRim)"
            stroke="#FDE68A"
            strokeWidth="2"
          />

          {/* Inner Inset Mask Area */}
          <g>
            {/* Left Shield Half (Darker glass) */}
            <path
              d="M 120 28 C 88 38 48 38 32 50 C 32 128 62 192 120 242 L 120 28 Z"
              fill="url(#glassShieldLeft)"
            />
            {/* Right Shield Half (Reflective glass) */}
            <path
              d="M 120 28 C 152 38 192 38 208 50 C 208 128 178 192 120 242 L 120 28 Z"
              fill="url(#glassShieldRight)"
            />

            {/* Grid texture inside shield */}
            <path
              d="M 120 28 C 152 38 192 38 208 50 C 208 128 178 192 120 242 C 62 192 32 128 32 50 C 48 38 88 38 120 28 Z"
              fill="url(#shieldGrid)"
            />
          </g>

          {/* Golden Center Split Spine */}
          <line
            x1="120"
            y1="28"
            x2="120"
            y2="242"
            stroke="url(#goldRim)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* Circuit / Security Conduits */}
          <path
            d="M 60 80 L 95 80 L 115 100"
            stroke="#F59E0B"
            strokeWidth="1.5"
            strokeOpacity="0.45"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="60" cy="80" r="3" fill="#F59E0B" fillOpacity="0.8" />

          <path
            d="M 180 80 L 145 80 L 125 100"
            stroke="#F59E0B"
            strokeWidth="1.5"
            strokeOpacity="0.45"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="180" cy="80" r="3" fill="#F59E0B" fillOpacity="0.8" />

          <path
            d="M 65 140 L 95 140 L 115 125"
            stroke="#F59E0B"
            strokeWidth="1.5"
            strokeOpacity="0.4"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="65" cy="140" r="3" fill="#F59E0B" fillOpacity="0.8" />

          <path
            d="M 175 140 L 145 140 L 125 125"
            stroke="#F59E0B"
            strokeWidth="1.5"
            strokeOpacity="0.4"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="175" cy="140" r="3" fill="#F59E0B" fillOpacity="0.8" />

          {/* Central Containment Lock Emblem */}
          <g transform="translate(120, 135)" filter="url(#neonGlow)">
            {/* Halo Ring */}
            <circle cx="0" cy="0" r="32" stroke="#F59E0B" strokeWidth="1.5" strokeOpacity="0.4" fill="none" strokeDasharray="4 4" />
            <circle cx="0" cy="0" r="26" fill="#18181B" stroke="#F59E0B" strokeWidth="2.5" />

            {/* Lock Shackle */}
            <path
              d="M -7 -2 L -7 -10 C -7 -15 7 -15 7 -10 L 7 -2"
              fill="none"
              stroke="#FDE68A"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Lock Body */}
            <rect
              x="-11"
              y="-3"
              width="22"
              height="16"
              rx="3"
              fill="url(#goldRim)"
              stroke="#FEF3C7"
              strokeWidth="1"
            />
            {/* Keyhole */}
            <circle cx="0" cy="3" r="2.5" fill="#451A03" />
            <path d="M -1.2 3.5 L 1.2 3.5 L 1 7.5 L -1 7.5 Z" fill="#451A03" />
          </g>

          {/* Corner Accent Bevels */}
          <path
            d="M 40 55 C 55 46 85 46 115 36"
            stroke="#FEF3C7"
            strokeWidth="1.5"
            strokeOpacity="0.6"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 200 55 C 185 46 155 46 125 36"
            stroke="#FEF3C7"
            strokeWidth="1.5"
            strokeOpacity="0.4"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </div>
    );
  }

  // "logo" variant (for navigation, header, footer)
  return (
    <svg
      viewBox="0 0 100 120"
      className={cn("inline-block shrink-0", className)}
      style={{ width: size, height: typeof size === "number" ? size * 1.2 : size }}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="shieldLogoGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="40%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
      </defs>
      {/* Outer Shield Contour */}
      <path
        d="M 50 6 C 68 12 88 12 96 18 C 96 60 82 94 50 114 C 18 94 4 60 4 18 C 12 12 32 12 50 6 Z"
        fill="url(#shieldLogoGold)"
      />
      {/* Dark Inner Inset */}
      <path
        d="M 50 14 C 64 19 80 19 86 24 C 86 58 74 86 50 102 C 26 86 14 58 14 24 C 20 19 36 19 50 14 Z"
        fill="#09090B"
      />
      {/* Golden Vertical Split Spine */}
      <line
        x1="50"
        y1="14"
        x2="50"
        y2="102"
        stroke="url(#shieldLogoGold)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Right-half golden sheen */}
      <path
        d="M 50 14 C 64 19 80 19 86 24 C 86 58 74 86 50 102 L 50 14 Z"
        fill="#F59E0B"
        fillOpacity="0.18"
      />
    </svg>
  );
}
