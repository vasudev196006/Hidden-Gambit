export interface PlayerProfile {
  name: string;
  isGuest: boolean;
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  winStreak: number;
  exp: number;
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
      exp: 0,
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
      exp: 0,
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
    exp: 0,
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
  let expGain = 50; // base exp per match

  if (result === "win") {
    wins += 1;
    winStreak += 1;
    expGain += 150; // +150 exp for win
  } else if (result === "loss") {
    losses += 1;
    winStreak = 0;
    expGain += 25; // +25 exp for effort
  } else {
    draws += 1;
    expGain += 75; // +75 exp for draw
  }

  const totalGames = current.totalGames + 1;
  const exp = current.exp + expGain;

  const updated: PlayerProfile = {
    ...current,
    totalGames,
    wins,
    losses,
    draws,
    winStreak,
    exp,
  };

  saveProfile(updated);
  return updated;
}

export function calculateRank(exp: number): { rankTitle: string; level: number; expInLevel: number; expForNextLevel: number } {
  const level = Math.floor(exp / 500) + 1;
  const expInLevel = exp % 500;
  const expForNextLevel = 500;

  let rankTitle = "RECRUIT";
  if (level >= 25) rankTitle = "GRANDMASTER";
  else if (level >= 15) rankTitle = "MASTER";
  else if (level >= 10) rankTitle = "TACTICIAN";
  else if (level >= 5) rankTitle = "AGENT";
  else if (level >= 2) rankTitle = "OPERATIVE";

  return { rankTitle, level, expInLevel, expForNextLevel };
}
