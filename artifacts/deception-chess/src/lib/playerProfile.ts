export interface PlayerProfile {
  name: string;
  isGuest: boolean;
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  winStreak: number;
}

const DEFAULT_PROFILE_KEY = "hidden_gambit_player_profile";

export function getStoredProfile(): PlayerProfile {
  if (typeof window === "undefined") {
    return {
      name: "Guest_1001",
      isGuest: true,
      totalGames: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      winStreak: 0,
    };
  }

  const raw = localStorage.getItem(DEFAULT_PROFILE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.name === "string") {
        return parsed;
      }
    } catch {}
  }

  // Check legacy playerName in localStorage if available
  const legacyName = localStorage.getItem("playerName");
  if (legacyName && legacyName.trim() && legacyName !== "GAMBIT_KNIGHT") {
    const profile: PlayerProfile = {
      name: legacyName.trim(),
      isGuest: false,
      totalGames: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      winStreak: 0,
    };
    saveProfile(profile);
    return profile;
  }

  // Generate clean default guest
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const defaultGuest: PlayerProfile = {
    name: `Guest_${randomNum}`,
    isGuest: true,
    totalGames: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    winStreak: 0,
  };
  saveProfile(defaultGuest);
  return defaultGuest;
}

export function saveProfile(profile: PlayerProfile): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DEFAULT_PROFILE_KEY, JSON.stringify(profile));
  localStorage.setItem("playerName", profile.name);
  window.dispatchEvent(new CustomEvent("playerProfileChanged", { detail: profile }));
}

export function updateProfileName(newName: string, isGuest: boolean = false): PlayerProfile {
  const current = getStoredProfile();
  const updated: PlayerProfile = {
    ...current,
    name: newName.trim() || `Guest_${Math.floor(1000 + Math.random() * 9000)}`,
    isGuest,
  };
  saveProfile(updated);
  return updated;
}

export function recordMatchResult(result: "win" | "loss" | "draw"): PlayerProfile {
  const current = getStoredProfile();
  let wins = current.wins;
  let losses = current.losses;
  let draws = current.draws;
  let winStreak = current.winStreak;

  if (result === "win") {
    wins += 1;
    winStreak += 1;
  } else if (result === "loss") {
    losses += 1;
    winStreak = 0;
  } else {
    draws += 1;
  }

  const totalGames = current.totalGames + 1;

  const updated: PlayerProfile = {
    ...current,
    totalGames,
    wins,
    losses,
    draws,
    winStreak,
  };

  saveProfile(updated);
  return updated;
}
