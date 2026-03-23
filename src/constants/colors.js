/**
 * constants/colors.js
 * Single source of truth for every color token in the app.
 * Aligned with DESIGN.md "Luminous Clarity" palette.
 *
 * To change any color app-wide: edit here only.
 */

// ── Mode accent colors ────────────────────────────────────────────────────────
export const CYAN   = '#00BFFF';   // Scene mode + primary action
export const GREEN  = '#00E5A0';   // Read mode + watch mode + online
export const AMBER  = '#FFB020';   // People mode + offline + auto-scan
export const PURPLE = '#A78BFA';   // Object mode
export const RED    = '#FF4455';   // Error states

// ── Surface hierarchy (dark tinted system) ────────────────────────────────────
export const BG         = '#0F1112';   // Base — camera sits behind this
export const SURFACE    = '#161A1C';   // Component level cards / sheets
export const SURFACE_HI = '#1E2326';   // Top level — modals, active badges

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
