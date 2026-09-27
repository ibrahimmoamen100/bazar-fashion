import brand from "@/config/brand.json";
import { generatePalette, hexToShadcnHSL } from "@/lib/colorUtils";

/**
 * Reads brand.json → generates full color palette → injects all CSS variables
 * onto document.documentElement so Tailwind's `brand-*` utilities pick them up.
 *
 * Call this ONCE at app startup (main.tsx) before rendering.
 */
export function applyTheme(): void {
  const primary = brand.primary;
  const root = document.documentElement;
  const palette = generatePalette(primary);

  // ── Brand palette (used by Tailwind brand-50 … brand-950) ──────────────
  for (const [shade, value] of Object.entries(palette)) {
    root.style.setProperty(`--brand-${shade}`, value);
  }

  // ── Shortcuts for common direct usages ─────────────────────────────────
  root.style.setProperty("--brand-primary",       palette["700"]);
  root.style.setProperty("--brand-primary-light",  palette["500"]);
  root.style.setProperty("--brand-primary-lighter",palette["400"]);
  root.style.setProperty("--brand-primary-dark",   palette["800"]);
  root.style.setProperty("--brand-primary-darker", palette["900"]);

  // ── shadcn/ui CSS variables (used by bg-primary, text-primary, etc.) ───
  root.style.setProperty("--primary", hexToShadcnHSL(primary));
  root.style.setProperty("--ring",    hexToShadcnHSL(primary));
  root.style.setProperty("--sidebar-ring", hexToShadcnHSL(primary));
}
