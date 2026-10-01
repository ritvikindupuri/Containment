import { cn } from "@/lib/utils";

interface ContainmentShieldProps {
  className?: string | undefined;
  size?: number | string | undefined;
  variant?: "logo" | "hero" | undefined;
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

  // Calibrate stroke widths for crisp rendering at 20-24px vs large hero sizes
  const swWalls = isHero ? 2 : 2.5;
  const swRim = isHero ? 2.5 : 3.2;
  const swTrail = isHero ? 2.2 : 2.8;
  const swBadge = isHero ? 2 : 2.6;
  const swBot = isHero ? 1.6 : 2.2;

  const svgContent = (
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
        <linearGradient id="sbFirewallRim" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="50%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>

        {/* Outer Left Wall - Deep dark zinc */}
        <linearGradient id="sbBoxLeft" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#18181B" />
          <stop offset="100%" stopColor="#0F0F11" />
        </linearGradient>

        {/* Outer Right Wall - Dimensional zinc */}
        <linearGradient id="sbBoxRight" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#222226" />
          <stop offset="100%" stopColor="#141417" />
        </linearGradient>

        {/* Red / Destructive escape glow */}
        <linearGradient id="escapeRedGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#F87171" />
          <stop offset="100%" stopColor="#EF4444" />
        </linearGradient>

        <style>{`
          @keyframes laserDash {
            to { stroke-dashoffset: -20; }
          }
          @keyframes botFloat {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-2px); }
          }
          .escape-dash {
            animation: laserDash 1.2s linear infinite;
          }
          .bot-floater {
            animation: botFloat 3s ease-in-out infinite;
            transform-origin: 78px 18px;
          }
        `}</style>
      </defs>

      {/* 1. THE SANDBOX CONTAINER (Bottom-Left) */}
      {/* Sandbox Left Wall */}
      <path
        d="M 14 46 L 44 62 L 44 88 L 14 72 Z"
        fill="url(#sbBoxLeft)"
        stroke="#3F3F46"
        strokeWidth={swWalls}
        strokeLinejoin="round"
      />

      {/* Sandbox Right Wall */}
      <path
        d="M 44 62 L 74 46 L 74 72 L 44 88 Z"
        fill="url(#sbBoxRight)"
        stroke="#3F3F46"
        strokeWidth={swWalls}
        strokeLinejoin="round"
      />

      {/* Sandbox Top Rim (Firewall perimeter) */}
      <path
        d="M 44 30 L 74 46 L 44 62 L 14 46 Z"
        fill="#27272A"
        stroke="url(#sbFirewallRim)"
        strokeWidth={swRim}
        strokeLinejoin="round"
      />

      {/* Recessed Sandbox Chamber Void */}
      <path
        d="M 44 38 L 64 48 L 44 58 L 24 48 Z"
        fill="#09090B"
        stroke="#3F3F46"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* Internal Containment Ring */}
      <ellipse
        cx="44"
        cy="48"
        rx="12"
        ry="6.5"
        stroke="#F59E0B"
        strokeWidth="1.2"
        strokeDasharray="2.5 2"
        strokeOpacity="0.85"
        fill="none"
      />

      {/* 2. THE ESCAPE TRAJECTORY (Agent jumping out) */}
      <path
        d="M 44 48 C 50 36, 56 24, 68 18"
        stroke="url(#escapeRedGrad)"
        strokeWidth={swTrail}
        strokeDasharray="4 3"
        strokeLinecap="round"
        fill="none"
        className={isHero ? "escape-dash" : undefined}
      />

      {/* 3. THE ESCAPING AI AGENT (Robot Badge leaping top-right) */}
      <g className={isHero ? "bot-floater" : undefined}>
        {/* Bot Badge Container */}
        <rect
          x="64"
          y="4"
          width="28"
          height="25"
          rx="6"
          fill="#18181B"
          stroke="url(#escapeRedGrad)"
          strokeWidth={swBadge}
        />

        {/* Bot Antenna */}
        <line
          x1="78"
          y1="8"
          x2="78"
          y2="10.5"
          stroke="#EF4444"
          strokeWidth={swBot}
          strokeLinecap="round"
        />
        <circle
          cx="78"
          cy="7.5"
          r={isHero ? 1.4 : 1.1}
          fill="#EF4444"
        />

        {/* Bot Head */}
        <rect
          x="71"
          y="11"
          width="14"
          height="11"
          rx="2.5"
          stroke="#EF4444"
          strokeWidth={swBot}
          fill="#EF4444"
          fillOpacity="0.15"
        />

        {/* Bot Eyes */}
        <circle
          cx="75"
          cy="16.5"
          r={isHero ? 1.3 : 1.1}
          fill="#EF4444"
        />
        <circle
          cx="81"
          cy="16.5"
          r={isHero ? 1.3 : 1.1}
          fill="#EF4444"
        />

        {/* Bot Ears */}
        <line
          x1="69"
          y1="16"
          x2="71"
          y2="16"
          stroke="#EF4444"
          strokeWidth={swBot}
          strokeLinecap="round"
        />
        <line
          x1="85"
          y1="16"
          x2="87"
          y2="16"
          stroke="#EF4444"
          strokeWidth={swBot}
          strokeLinecap="round"
        />

        {/* In Hero mode: Render HUD leader line and ESCAPE ATTEMPT pill below the bot (zero collision) */}
        {isHero && (
          <g>
            {/* Leader connection line from badge bottom down to status pill */}
            <line
              x1="78"
              y1="29"
              x2="78"
              y2="33"
              stroke="#EF4444"
              strokeWidth="1.2"
              strokeDasharray="2 1.5"
              strokeOpacity="0.8"
            />
            {/* HUD Status Pill */}
            <rect
              x="52"
              y="33"
              width="52"
              height="10"
              rx="2.5"
              fill="#18181B"
              fillOpacity="0.95"
              stroke="#EF4444"
              strokeWidth="1"
              strokeOpacity="0.85"
            />
            <text
              x="78"
              y="40.2"
              fill="#EF4444"
              fontSize="4.8"
              fontWeight="700"
              textAnchor="middle"
              letterSpacing="0.08em"
              fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
            >
              ESCAPE ATTEMPT
            </text>
          </g>
        )}
      </g>
    </svg>
  );

  if (isHero) {
    return (
      <div className={cn("relative flex items-center justify-center", className)}>
        {/* Soft atmospheric ambient glow */}
        <div className="absolute inset-0 m-auto size-64 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
        {svgContent}
      </div>
    );
  }

  return svgContent;
}
