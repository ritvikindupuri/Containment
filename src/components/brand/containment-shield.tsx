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

  // Calibrated stroke widths for sharp readability at small icon sizes and majestic hero sizes
  const swOuter = isHero ? 1.8 : 2.4;
  const swRim = isHero ? 2.2 : 2.8;

  const content = (
    <svg
      viewBox="0 0 100 100"
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
        {/* Signal Amber / Gold firewall aura */}
        <linearGradient id="sandboxFirewallAura" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="50%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>

        {/* Outer Left Wall - Deep dark zinc */}
        <linearGradient id="sbLeftWall" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#18181B" />
          <stop offset="100%" stopColor="#0F0F11" />
        </linearGradient>

        {/* Outer Right Wall - Architectural dimensional zinc */}
        <linearGradient id="sbRightWall" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#222226" />
          <stop offset="100%" stopColor="#141417" />
        </linearGradient>

        {/* Recessed Sandbox Floor Void */}
        <linearGradient id="sbFloor" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#09090B" />
          <stop offset="100%" stopColor="#141416" />
        </linearGradient>
      </defs>

      {/* 1. Outer Sandbox Left Wall */}
      <path
        d="M 12 30 L 50 52 L 50 92 L 12 70 Z"
        fill="url(#sbLeftWall)"
        stroke="#3F3F46"
        strokeWidth={swOuter}
        strokeLinejoin="round"
      />

      {/* 2. Outer Sandbox Right Wall */}
      <path
        d="M 50 52 L 88 30 L 88 70 L 50 92 Z"
        fill="url(#sbRightWall)"
        stroke="#3F3F46"
        strokeWidth={swOuter}
        strokeLinejoin="round"
      />

      {/* 3. Outer Sandbox Top Rim (Beveled container boundary) */}
      <path
        d="M 50 8 L 88 30 L 50 52 L 12 30 Z"
        fill="#27272A"
        stroke="url(#sandboxFirewallAura)"
        strokeWidth={swRim}
        strokeLinejoin="round"
      />

      {/* 4. Recessed Sandbox Chamber Floor (Looking down inside /workspace) */}
      <path
        d="M 50 24 L 76 39 L 50 54 L 24 39 Z"
        fill="url(#sbFloor)"
        stroke="#3F3F46"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* 5. Inner Chamber Recess Drop Walls (Creating visible 3D sandbox depth) */}
      <path
        d="M 24 39 L 50 54 L 50 63 L 24 48 Z"
        fill="#0D0D0F"
        stroke="#27272A"
        strokeWidth="0.8"
      />
      <path
        d="M 50 54 L 76 39 L 76 48 L 50 63 Z"
        fill="#17171A"
        stroke="#27272A"
        strokeWidth="0.8"
      />

      {/* 6. Active Firewall Perimeter Energy Fence (Dashed containment ring) */}
      <ellipse
        cx="50"
        cy="45"
        rx="17"
        ry="9.5"
        stroke="#F59E0B"
        strokeWidth="1.4"
        strokeDasharray="3 2"
        strokeOpacity="0.85"
        fill="none"
      />

      {/* 7. Contained Agent Core (Isometric glowing micro-process safely contained inside) */}
      {/* Top face of agent process */}
      <path
        d="M 50 38 L 57 42 L 50 46 L 43 42 Z"
        fill="#FBBF24"
      />
      {/* Left face of agent process */}
      <path
        d="M 43 42 L 50 46 L 50 54 L 43 50 Z"
        fill="#D97706"
      />
      {/* Right face of agent process */}
      <path
        d="M 50 46 L 57 42 L 57 50 L 50 54 Z"
        fill="#F59E0B"
      />

      {/* 8. Front Rim Security Anchor / Firewall Latch */}
      <path
        d="M 44 48 L 50 52 L 56 48 L 50 57 Z"
        fill="url(#sandboxFirewallAura)"
      />
    </svg>
  );

  if (isHero) {
    return (
      <div className={cn("relative flex items-center justify-center", className)}>
        {/* Soft atmospheric ambient glow */}
        <div className="absolute inset-0 m-auto size-64 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
        {content}
      </div>
    );
  }

  return content;
}
