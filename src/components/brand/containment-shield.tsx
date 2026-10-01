import { cn } from "@/lib/utils";

interface ContainmentShieldProps {
  className?: string;
  size?: number | string;
  variant?: "logo" | "hero";
}

/**
 * Containment Brand Logo:
 * An isometric container sandbox cell with an active firewall perimeter.
 * Directly symbolizes the core purpose: locking autonomous AI agents inside
 * a hardened Kubernetes container boundary and blocking sandbox escapes.
 */
export function ContainmentShield({
  className,
  size = 24,
  variant = "logo",
}: ContainmentShieldProps) {
  const isHero = variant === "hero";

  // Calibrate stroke widths for crisp display at small icon sizes vs large hero sizes
  const swCubeWalls = isHero ? 1.5 : 2.0;
  const swCubeTop = isHero ? 2.0 : 2.5;
  const swShield = isHero ? 2.5 : 3.0;
  const swRib = isHero ? 1.5 : 2.0;
  const swChevron = isHero ? 1.8 : 2.2;
  const nodeRadius = isHero ? 3.5 : 4.0;
  const ringRadius = isHero ? 7.0 : 7.5;

  const content = (
    <svg
      viewBox="0 0 100 105"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(
        "shrink-0 transition-transform duration-200",
        isHero ? "size-full filter drop-shadow-[0_24px_48px_rgba(0,0,0,0.7)]" : "",
        className
      )}
      style={!isHero ? { width: size, height: size } : undefined}
    >
      <defs>
        {/* Amber / Yellow firewall aura gradient */}
        <linearGradient id="containmentFirewallGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="50%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>

        {/* Cube Left Wall Fill */}
        <linearGradient id="cubeLeftGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#18181B" />
          <stop offset="100%" stopColor="#0E0E10" />
        </linearGradient>

        {/* Cube Right Wall Fill */}
        <linearGradient id="cubeRightGrad" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#222226" />
          <stop offset="100%" stopColor="#141416" />
        </linearGradient>
      </defs>

      {/* 1. Isometric Container Box: Left Wall */}
      <path
        d="M 12 28 L 50 50 L 50 98 L 12 76 Z"
        fill="url(#cubeLeftGrad)"
        stroke="#3F3F46"
        strokeWidth={swCubeWalls}
        strokeLinejoin="round"
      />

      {/* 2. Isometric Container Box: Right Wall */}
      <path
        d="M 50 50 L 88 28 L 88 76 L 50 98 Z"
        fill="url(#cubeRightGrad)"
        stroke="#3F3F46"
        strokeWidth={swCubeWalls}
        strokeLinejoin="round"
      />

      {/* 3. Isometric Container Box: Top Face (Hardened /workspace ceiling) */}
      <path
        d="M 50 6 L 88 28 L 50 50 L 12 28 Z"
        fill="#26262B"
        stroke="url(#containmentFirewallGrad)"
        strokeWidth={swCubeTop}
        strokeLinejoin="round"
      />

      {/* 4. Active Firewall Perimeter Shield (The Core Containment Guard) */}
      <path
        d="M 50 22 L 74 35 L 74 60 C 74 78 62 88 50 92 C 38 88 26 78 26 60 L 26 35 Z"
        fill="#09090B"
        stroke="url(#containmentFirewallGrad)"
        strokeWidth={swShield}
        strokeLinejoin="round"
      />

      {/* 5. Shield Center Vertical Rib */}
      <line
        x1="50"
        y1="22"
        x2="50"
        y2="92"
        stroke="#F59E0B"
        strokeWidth={swRib}
        strokeOpacity="0.75"
        strokeLinecap="round"
      />

      {/* 6. Firewall Chevrons */}
      <path
        d="M 36 43 L 50 51 L 64 43"
        stroke="#F59E0B"
        strokeWidth={swChevron}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.85"
      />
      <path
        d="M 36 57 L 50 65 L 64 57"
        stroke="#F59E0B"
        strokeWidth={swChevron}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.85"
      />

      {/* 7. Central Secured Core Node */}
      <circle
        cx="50"
        cy="51"
        r={nodeRadius}
        fill="#F59E0B"
      />
      <circle
        cx="50"
        cy="51"
        r={ringRadius}
        stroke="#F59E0B"
        strokeWidth="1.2"
        strokeDasharray="2.5 2"
        strokeOpacity="0.75"
        fill="none"
      />
    </svg>
  );

  if (isHero) {
    return (
      <div className={cn("relative flex items-center justify-center", className)}>
        {/* Atmospheric ambient glow */}
        <div className="absolute inset-0 m-auto size-64 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
        {content}
      </div>
    );
  }

  return content;
}
