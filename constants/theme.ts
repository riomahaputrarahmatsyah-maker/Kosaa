export const colors = {
  background: "#0A0A0A",
  surface: "#0F3D2E",
  surfaceLight: "#1A1A1A",
  surfaceDeep: "#071F17",
  primary: "#FFFFFF",
  secondary: "#A1A1AA",
  mint: "#10B981",
  mintSoft: "#34D399",
  mintDim: "#065F46",
  subtle: "#27272A",
  danger: "#F87171",
  warning: "#FBBF24",
  overlay: "rgba(0,0,0,0.65)",
} as const;

/** Soft mint glow shared by active controls, nodes and the AI avatar. */
export const glow = {
  shadowColor: colors.mint,
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.55,
  shadowRadius: 12,
  elevation: 10,
} as const;

export const glowStrong = {
  shadowColor: colors.mint,
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.8,
  shadowRadius: 18,
  elevation: 16,
} as const;

export const typography = {
  heading: { fontFamily: "Inter_700Bold", fontSize: 22, color: colors.primary },
  title: { fontFamily: "Inter_600SemiBold", fontSize: 17, color: colors.primary },
  body: { fontFamily: "Inter_400Regular", fontSize: 15, color: colors.primary },
  caption: { fontFamily: "Inter_400Regular", fontSize: 12, color: colors.secondary },
} as const;

export const layout = {
  screenPadding: 20,
  tabBarHeight: 66,
  tabBarBottom: 20,
} as const;
