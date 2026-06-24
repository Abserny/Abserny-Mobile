/**
 * constants/colors.js
 * Single source of truth for every color token in the app.
 * Aligned with DESIGN.md "Luminous Clarity" palette.
 *
 * To change any color app-wide: edit here only.
 */

// ── Mode accent colors ────────────────────────────────────────────────────────
export const CYAN   = '#5AC8E8';   // Scene mode + primary action — softer blue
export const GREEN  = '#4EDBA0';   // Read mode + watch mode + online — muted green
export const AMBER  = '#F0A830';   // People mode + offline + auto-scan — warmer
export const PURPLE = '#A78BFA';   // Object mode
export const RED    = '#FF4455';   // Error states

// ── Surface hierarchy (dark tinted system) ────────────────────────────────────
export const BG         = '#0A0C0E';   // Base — deeper black, camera bleeds less
export const SURFACE    = '#12161A';   // Component level cards / sheets
export const SURFACE_HI = '#171B1E';   // Top level — tighter contrast range

// ── Text ──────────────────────────────────────────────────────────────────────
export const ON_SURFACE     = 'rgba(255,255,255,0.90)';
export const ON_SURFACE_MED = 'rgba(255,255,255,0.45)';
export const ON_SURFACE_LOW = 'rgba(255,255,255,0.15)';
export const ON_SURFACE_DIM = 'rgba(255,255,255,0.08)';

// ── Mode color map ────────────────────────────────────────────────────────────
// Keyed by mode id — use wherever a mode-specific color is needed.
export const MODE_COLORS = {
    scene:  CYAN,
    object: PURPLE,
    read:   GREEN,
    people: AMBER,
};
