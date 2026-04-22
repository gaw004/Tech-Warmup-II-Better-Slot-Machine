export const palette = {
  paylineMagenta: '#FF2D78',
  spinNeon: '#C8FF00',
  cardBg: '#1A1528',
  textPrimary: '#FFFFFF',
  backgroundDeep: '#0B0714',
  backgroundPanel: '#120C1F',
  accentCyan: '#00E7F0',
  dangerRed: '#FF3B30',
  warnAmber: '#FFB020',
  successGreen: '#37E29A',
  mutedText: '#9A8FB8',
  borderSubtle: '#2A2140',
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const zIndex = {
  base: 0,
  reels: 10,
  ui: 20,
  winOverlay: 30,
  modal: 40,
  drawer: 45,
  toast: 50,
  ageGate: 60,
} as const;

export const durations = {
  reelSpin: 2000,
  reelStopStagger: 180,
  cascadeCollapse: 350,
  cascadeRefill: 400,
  buttonPress: 120,
  winTier: {
    small: 500,
    medium: 1200,
    big: 2500,
    mega: 4500,
    epic: 8000,
  },
} as const;

export const radii = {
  sm: 4,
  md: 8,
  lg: 12,
  pill: 999,
} as const;

export const typography = {
  fontStackPrimary: '"Rajdhani", "Inter", system-ui, sans-serif',
  fontStackMono: '"JetBrains Mono", ui-monospace, monospace',
  fontStackDisplay: '"Orbitron", "Rajdhani", sans-serif',
  sizes: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 18,
    xl: 24,
    xxl: 32,
    display: 48,
  },
} as const;

export type Palette = typeof palette;
export type Spacing = typeof spacing;
export type ZIndex = typeof zIndex;
export type Durations = typeof durations;
export type Radii = typeof radii;
export type Typography = typeof typography;
