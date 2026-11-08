import * as SecureStore from "expo-secure-store";

import type { UserProfile } from "@/types/models";

const PROFILE_KEY = "kosaa.profile";

export const DEFAULT_PROFILE: UserProfile = {
  name: "Kosaa User",
  personality: "Ringkas, hangat, dan profesional",
  agentEnabled: true,
};

export const PERSONALITY_PRESETS = [
  { label: "Ringkas & profesional", value: "Ringkas, hangat, dan profesional" },
  { label: "Ramah & santai", value: "Ramah, santai, dan suportif" },
  { label: "Tegas & to the point", value: "Tegas, langsung ke inti, tanpa basa-basi" },
  { label: "Analitis", value: "Analitis, terstruktur, dan hati-hati" },
];

let memoryProfile: UserProfile | null = null;

export async function getProfile(): Promise<UserProfile> {
  if (memoryProfile) return memoryProfile;
  try {
    const raw = await SecureStore.getItemAsync(PROFILE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    const parsed = JSON.parse(raw) as Partial<UserProfile>;
    const profile: UserProfile = {
      name: typeof parsed.name === "string" && parsed.name.trim() ? parsed.name.trim() : DEFAULT_PROFILE.name,
      personality:
        typeof parsed.personality === "string" && parsed.personality.trim()
          ? parsed.personality.trim()
          : DEFAULT_PROFILE.personality,
      agentEnabled: parsed.agentEnabled !== false,
    };
    memoryProfile = profile;
    return profile;
  } catch {
    return DEFAULT_PROFILE;
  }
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  const next: UserProfile = {
    name: profile.name.trim() || DEFAULT_PROFILE.name,
    personality: profile.personality.trim() || DEFAULT_PROFILE.personality,
    agentEnabled: profile.agentEnabled,
  };
  memoryProfile = next;
  try {
    await SecureStore.setItemAsync(PROFILE_KEY, JSON.stringify(next));
  } catch {
    // The in-memory value keeps the session consistent even if SecureStore fails.
  }
}
