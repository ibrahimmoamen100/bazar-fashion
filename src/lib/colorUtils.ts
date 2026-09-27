/** Convert hex string to HSL components */
export function hexToHSL(hex: string): { h: number; s: number; l: number } {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Generate a full Tailwind-like palette (50–950) from a single hex color.
 * Returns an object keyed by shade with CSS hsl() values.
 */
export function generatePalette(hex: string): Record<string, string> {
  const { h, s } = hexToHSL(hex);

  // Each shade: [lightness%, saturation% override]
  const shades: [number, number, number][] = [
    [50,  Math.max(s - 10, 5),  97],
    [100, Math.max(s - 8, 5),   93],
    [200, Math.max(s - 5, 8),   84],
    [300, Math.max(s - 2, 10),  71],
    [400, s,                    58],
    [500, s,                    45],
    [600, Math.min(s + 2, 100), 36],
    [700, Math.min(s + 4, 100), 26], // ← base color zone
    [800, Math.min(s + 5, 100), 18],
    [900, Math.min(s + 6, 100), 12],
    [950, Math.min(s + 8, 100),  8],
  ];

  const palette: Record<string, string> = {};
  for (const [shade, sat, lig] of shades) {
    palette[String(shade)] = `hsl(${h}, ${sat}%, ${lig}%)`;
  }
  return palette;
}

/** Return the shadcn/ui CSS variable string format: "H S% L%" */
export function hexToShadcnHSL(hex: string): string {
  const { h, s, l } = hexToHSL(hex);
  return `${h} ${s}% ${l}%`;
}

/** Determine if text on this background should be white or dark */
export function getContrastForeground(hex: string): string {
  const { l } = hexToHSL(hex);
  return l < 55 ? "#ffffff" : "#1a1a1a";
}
