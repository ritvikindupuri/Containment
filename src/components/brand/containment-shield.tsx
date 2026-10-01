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
  if (variant === "hero") {
    return (
      <div className={cn("relative flex items-center justify-center", className)}>
        {/* Soft atmospheric ambient glow */}
        <div className="absolute inset-0 m-auto size-64 rounded-full bg-primary/15 blur-3xl" />

        <svg
          viewBox="0 0 240 260"
          className="relative size-full filter drop-shadow-[0_24px_48px_rgba(0,0,0,0.7)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Top cube face (hardened ceiling / workspace) */}
            <linearGradient id="heroCubeTop" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#27272A" />
              <stop offset="100%" stopColor="#18181B" />
            </linearGradient>

            {/* Left cube face (isolated namespace & cgroups) */}
            <linearGradient id="heroCubeLeft" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#18181B" />
              <stop offset="100%" stopColor="#09090B" />
            </linearGradient>

            {/* Right cube face (policy guard & egress firewall) */}
            <linearGradient id="heroCubeRight" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#222226" />
              <stop offset="100%" stopColor="#111114" />
            </linearGradient>

            {/* Neon firewall energy border */}
            <linearGradient id="firewallAura" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--color-primary, #F59E0B)" />
              <stop offset="50%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>

            {/* Grid pattern on the container walls */}
            <pattern id="k8sGrid" width="12" height="12" patternUnits="userSpaceOnUse">
              <path d="M 12 0 L 0 0 0 12" fill="none" stroke="#F59E0B" strokeWidth="0.5" strokeOpacity="0.1" />
            </pattern>
          </defs>

          {/* Isometric Container Shadow */}
          <path
            d="M 120 250 L 210 196 L 210 82 L 120 136 Z"
            fill="#050507"
            opacity="0.8"
            transform="translate(0, 10)"
          />

          {/* Isometric Container Box: Left Wall */}
          <path
            d="M 120 130 L 30 78 L 30 186 L 120 240 Z"
            fill="url(#heroCubeLeft)"
            stroke="#3F3F46"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Grid overlay on Left Wall */}
          <path
            d="M 120 130 L 30 78 L 30 186 L 120 240 Z"
            fill="url(#k8sGrid)"
          />

          {/* Isometric Container Box: Right Wall */}
          <path
            d="M 120 130 L 210 78 L 210 186 L 120 240 Z"
            fill="url(#heroCubeRight)"
            stroke="#3F3F46"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Grid overlay on Right Wall */}
          <path
            d="M 120 130 L 210 78 L 210 186 L 120 240 Z"
            fill="url(#k8sGrid)"
          />

          {/* Isometric Container Box: Top Face (Roof / /workspace) */}
          <path
            d="M 120 22 L 210 78 L 120 130 L 30 78 Z"
            fill="url(#heroCubeTop)"
            stroke="url(#firewallAura)"
            strokeWidth="2"
            strokeLinejoin="round"
          />

          {/* Inner Protective Hex-Core (The Containment Firewall) */}
          <g transform="translate(120, 130)">
            {/* Front Perimeter Shield */}
            <path
              d="M 0 -60 L 52 -30 L 52 35 C 52 75 0 95 0 95 C 0 95 -52 75 -52 35 L -52 -30 Z"
              fill="#09090B"
              fillOpacity="0.85"
              stroke="url(#firewallAura)"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />

            {/* Shield Center Rib */}
            <line x1="0" y1="-60" x2="0" y2="95" stroke="var(--color-primary, #F59E0B)" strokeWidth="2" strokeOpacity="0.8" />

            {/* Inner Active Firewall Bracket */}
            <path
              d="M -30 -10 L 0 8 L 30 -10 M -30 20 L 0 38 L 30 20"
              stroke="var(--color-primary, #F59E0B)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Central Secured Core */}
            <circle cx="0" cy="8" r="8" fill="var(--color-primary, #F59E0B)" />
            <circle cx="0" cy="8" r="14" stroke="var(--color-primary, #F59E0B)" strokeWidth="1.5" strokeDasharray="3 3" />
          </g>
        </svg>
      </div>
    );
  }

  // Icon / Logo variant for Navigation, Header, Footers, and UI components
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
        <linearGradient id="logoPrimaryGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--color-primary, #F59E0B)" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>

      {/* Isometric Container Box: Top Face */}
      <path
        d="M12 2L20 6.5L12 11L4 6.5L12 2Z"
        fill="#27272A"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />

      {/* Isometric Container Box: Left Face */}
      <path
        d="M4 6.5V16L12 21V11L4 6.5Z"
        fill="#18181B"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />

      {/* Isometric Container Box: Right Face */}
      <path
        d="M12 11V21L20 16V6.5L12 11Z"
        fill="#1F1F23"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />

      {/* The Central Containment Shield Core */}
      <path
        d="M12 6.5V15.5M8.5 9L12 11L15.5 9M8.5 13L12 15L15.5 13"
        stroke="url(#logoPrimaryGradient)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Secured Core Node */}
      <circle cx="12" cy="11" r="1.3" fill="var(--color-primary, #F59E0B)" />
    </svg>
  );
}
