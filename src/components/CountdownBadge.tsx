interface CountdownBadgeProps {
  timeLeft: { days: number; hours: number; minutes: number; seconds: number } | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const CountdownBadge = ({
  timeLeft,
  className = "",
  size = 'md',
}: CountdownBadgeProps) => {
  if (!timeLeft) return null;

  const pad = (n: number) => String(n).padStart(2, '0');

  const config = {
    sm: { w: 58,  h: 90,  labelPx: 9,  timerPx: 11, dayPx: 8  },
    md: { w: 72,  h: 114, labelPx: 11, timerPx: 13, dayPx: 9  },
    lg: { w: 90,  h: 142, labelPx: 13, timerPx: 16, dayPx: 11 },
  }[size];

  const { w, h, labelPx, timerPx, dayPx } = config;

  // V-notch bookmark shape: bottom 15% is a downward triangle
  const vPct   = 85;                    // flat body ends at 85%
  const vY     = (h * vPct) / 100;
  const clipPg = `polygon(0 0, 100% 0, 100% ${vPct}%, 50% 100%, 0 ${vPct}%)`;

  // Dashed-border SVG path (inset 5px)
  const ins  = 5;
  const dInnerVY = vY - ins * 0.6;
  const svgD = [
    `M ${ins} ${ins}`,
    `L ${w - ins} ${ins}`,
    `L ${w - ins} ${dInnerVY}`,
    `L ${w / 2} ${h - ins * 1.4}`,
    `L ${ins} ${dInnerVY}`,
    `Z`,
  ].join(' ');

  // Vertical text-layout percentages
  const labelTopPct  = timeLeft.days > 0 ? 13 : 14;
  const dividerYPct  = timeLeft.days > 0 ? 46 : 47;
  const dayTextYPct  = 55;
  const timerYPct    = timeLeft.days > 0 ? 70 : 65;

  return (
    <div
      className={`relative select-none shrink-0 ${className}`}
      style={{ width: w, height: h }}
    >
      {/* ── Drop shadow layer (clip-path + filter don't compose well) ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          clipPath: clipPg,
          background: 'rgba(100,0,0,0.35)',
          transform: 'translateY(5px) scaleX(0.92)',
          filter: 'blur(8px)',
          borderRadius: 2,
        }}
      />

      {/* ── Main ribbon body ── */}
      <div
        className="absolute inset-0"
        style={{
          clipPath: clipPg,
          background:
            'linear-gradient(165deg, #ff5252 0%, #d61c1c 32%, #aa0a0a 68%, #780000 100%)',
        }}
      />

      {/* ── Top-left curl crease ── */}
      <div
        className="absolute top-0 left-0 pointer-events-none"
        style={{
          width: 18,
          height: 18,
          background:
            'radial-gradient(circle at top left, rgba(40,0,0,0.55) 0%, transparent 70%)',
          clipPath: 'polygon(0 0, 100% 0, 0 100%)',
        }}
      />
      {/* ── Top-right curl crease ── */}
      <div
        className="absolute top-0 right-0 pointer-events-none"
        style={{
          width: 18,
          height: 18,
          background:
            'radial-gradient(circle at top right, rgba(40,0,0,0.55) 0%, transparent 70%)',
          clipPath: 'polygon(0 0, 100% 0, 100% 100%)',
        }}
      />

      {/* ── Dashed stitched border (SVG) ── */}
      <svg
        className="absolute inset-0 pointer-events-none"
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        overflow="visible"
      >
        <path
          d={svgD}
          fill="none"
          stroke="white"
          strokeWidth="1"
          strokeDasharray="3 2.5"
          strokeLinecap="round"
          opacity="0.5"
        />
      </svg>

      {/* ── Glossy top highlight ── */}
      <div
        className="absolute left-0 right-0 top-0 pointer-events-none"
        style={{
          height: '35%',
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 100%)',
          clipPath: clipPg,
        }}
      />

      {/* ── Text content ── */}
      <div
        className="absolute inset-0 flex flex-col items-center pointer-events-none"
        style={{ paddingTop: `${labelTopPct}%` }}
      >
        {/* Label */}
        <span
          className="text-white font-black text-center leading-snug drop-shadow-sm"
          style={{
            fontSize: labelPx,
            fontFamily: 'Cairo, Tajawal, Arial, sans-serif',
            lineHeight: 1.25,
            letterSpacing: '0.03em',
          }}
        >
          عرض<br />خاص
        </span>

        {/* Divider */}
        <div
          className="bg-white/40 rounded-full mt-1.5 mb-1.5"
          style={{ width: '52%', height: 1 }}
        />

        {/* Days */}
        {timeLeft.days > 0 && (
          <span
            className="text-red-200 font-bold font-mono block leading-none mb-0.5"
            style={{ fontSize: dayPx }}
            dir="ltr"
          >
            {timeLeft.days}d
          </span>
        )}

        {/* HH:MM:SS */}
        <span
          className="text-white font-black font-mono tracking-tight leading-none drop-shadow"
          style={{ fontSize: timerPx }}
          dir="ltr"
        >
          {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
        </span>
      </div>
    </div>
  );
};
