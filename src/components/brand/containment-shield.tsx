import { cn } from "@/lib/utils";

interface ContainmentShieldProps {
  className?: string;
  size?: number | string;
  variant?: "logo" | "hero";
}

/**
 * Containment brand mark.
 * Precision geometric security glyph aligned with Space Grotesk typography
 * and the deep-graphite console design language.
 */
export function ContainmentShield({
  className,
  size = 24,
  variant = "logo",
}: ContainmentShieldProps) {
  if (variant === "hero") {
    return (
      <div className={cn("relative flex items-center justify-center", className)}>
        {/* Subtle radial aura behind the hero mark */}
        <div className="absolute inset-0 m-auto size-56 rounded-full bg-primary/20 blur-3xl filter" />

        <svg
          viewBox="0 0 200 240"
          className="relative size-full filter drop-shadow-[0_16px_32px_rgba(0,0,0,0.6)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="heroFacetLeft" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#27272A" />
              <stop offset="100%" stopColor="#09090B" />
            </linearGradient>
            <linearGradient id="heroFacetRight" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3F3F46" />
              <stop offset="100%" stopColor="#18181B" />
            </linearGradient>
            <linearGradient id="heroAccentBorder" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--color-primary, #F59E0B)" stopOpacity="0.9" />
              <stop offset="60%" stopColor="#D97706" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#71717A" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="coreGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--color-primary, #F59E0B)" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
          </defs>

          {/* Isometric Depth Layer */}
          <path
            d="M 100 16 L 176 48 L 176 136 L 100 216 L 24 136 L 24 48 Z"
            fill="#09090B"
            transform="translate(0, 10)"
          />

          {/* Outer Monolithic Chamfered Shield */}
          <path
            d="M 100 12 L 176 44 L 176 132 L 100 212 L 24 132 L 24 44 Z"
            fill="#18181B"
            stroke="url(#heroAccentBorder)"
            strokeWidth="3"
            strokeLinejoin="round"
          />

          {/* Left Facet */}
          <path
            d="M 100 12 L 24 44 L 24 132 L 100 212 Z"
            fill="url(#heroFacetLeft)"
            opacity="0.95"
          />

          {/* Right Facet */}
          <path
            d="M 100 12 L 176 44 L 176 132 L 100 212 Z"
            fill="url(#heroFacetRight)"
            opacity="0.95"
          />

          {/* Precision Center Seam */}
          <line
            x1="100"
            y1="12"
            x2="100"
            y2="212"
            stroke="var(--color-primary, #F59E0B)"
            strokeWidth="2"
            strokeOpacity="0.8"
          />

          {/* Inner Protective Containment Core */}
          <polygon
            points="100,52 144,76 144,124 100,168 56,124 56,76"
            fill="#09090B"
            stroke="var(--color-primary, #F59E0B)"
            strokeWidth="2.5"
            strokeDasharray="8 4"
            opacity="0.85"
          />

          {/* Central Protected Kernel Node */}
          <circle cx="100" cy="100" r="14" fill="url(#coreGlow)" />
          <circle cx="100" cy="100" r="22" stroke="var(--color-primary, #F59E0B)" strokeWidth="1.5" strokeOpacity="0.4" />
          
          {/* Containment Corner Anchors */}
          <rect x="97" y="49" width="6" height="6" fill="#F59E0B" />
          <rect x="97" y="165" width="6" height="6" fill="#F59E0B" />
          <rect x="53" y="100" width="6" height="6" fill="#F59E0B" />
          <rect x="141" y="100" width="6" height="6" fill="#F59E0B" />
        </svg>
      </div>
    );
  }

  // Clean, high-precision logo icon for navbar, headers, and footer
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 text-foreground transition-transform duration-200", className)}
    >
      <defs>
        <linearGradient id="shieldNavAccent" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--color-primary, #F59E0B)" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>

      {/* Modern geometric chamfered shield contour */}
      <path
        d="M12 2L20.5 5.5V12C20.5 17.5 16.5 21.2 12 22.5C7.5 21.2 3.5 17.5 3.5 12V5.5L12 2Z"
        fill="#18181B"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />

      {/* Right-half tonal split for modern dimension */}
      <path
        d="M12 2L20.5 5.5V12C20.5 17.5 16.5 21.2 12 22.5V2Z"
        fill="#27272A"
        opacity="0.6"
      />

      {/* Central Containment Firewall Core */}
      <path
        d="M12 7V17M8.5 10L12 12M15.5 10L12 12M8.5 14L12 12M15.5 14L12 12"
        stroke="url(#shieldNavAccent)"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Precision Center Node */}
      <circle cx="12" cy="12" r="1.5" fill="var(--color-primary, #F59E0B)" />
    </svg>
  );
}
