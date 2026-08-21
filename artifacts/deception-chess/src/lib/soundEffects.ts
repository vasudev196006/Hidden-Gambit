// Authentic Chess.com Sound Effects Engine for Hidden Gambit
// Uses official Chess.com wooden piece move, capture, check, game start, win, and promotion sounds
// with instant HTML5 Audio playback & Web Audio fallback.

class SoundManager {
  private isMuted: boolean = false;
  private audioCache: Map<string, HTMLAudioElement> = new Map();

  // Official Chess.com audio assets
  private soundUrls: Record<string, string> = {
    move: "https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-self.mp3",
    capture: "https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/capture.mp3",
    check: "https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-check.mp3",
    impostor: "https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/promote.mp3",
    gameStart: "https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/game-start.mp3",
    win: "https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/game-end.mp3",
    illegal: "https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/illegal.mp3",
  };

  constructor() {
    this.preloadSounds();
  }

  private preloadSounds(): void {
    if (typeof window === "undefined") return;
    Object.entries(this.soundUrls).forEach(([key, url]) => {
      try {
        const audio = new Audio(url);
        audio.preload = "auto";
        this.audioCache.set(key, audio);
      } catch {
        // Fallback initialized dynamically on play
      }
    });
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  private playSound(key: string): void {
    if (this.isMuted || typeof window === "undefined") return;

    try {
      const cached = this.audioCache.get(key);
      const url = this.soundUrls[key];

      if (cached) {
        // Clone node to allow overlapping rapid sound playback
        const soundInstance = cached.cloneNode() as HTMLAudioElement;
        soundInstance.volume = 0.9;
        soundInstance.play().catch(() => {
          this.playSynthesizedFallback(key);
        });
      } else if (url) {
        const audio = new Audio(url);
        audio.volume = 0.9;
        audio.play().catch(() => {
          this.playSynthesizedFallback(key);
        });
      } else {
        this.playSynthesizedFallback(key);
      }
    } catch {
      this.playSynthesizedFallback(key);
    }
  }

  // 1. Standard Chess.com Wooden Move Sound
  public playMove(): void {
    this.playSound("move");
  }

  // 2. Standard Chess.com Capture Sound
  public playCapture(): void {
    this.playSound("capture");
  }

  // 3. Standard Chess.com Check Sound
  public playCheck(): void {
    this.playSound("check");
  }

  // 4. Impostor Reveal / Promotion Sound
  public playImpostor(): void {
    this.playSound("impostor");
  }

  // 5. Game Start Sound
  public playGameStart(): void {
    this.playSound("gameStart");
  }

  // 6. Victory / Game End Sound
  public playWin(): void {
    this.playSound("win");
  }

  // 7. Illegal Move Sound
  public playIllegal(): void {
    this.playSound("illegal");
  }

  // Web Audio acoustic synthesis fallback (if network is offline or autoplay restricts external URLs)
  private playSynthesizedFallback(key: string): void {
    if (typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      if (key === "move") {
        // Wooden board snap: short noise pop + 280Hz wooden body thud
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.06);
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.06);
      } else if (key === "capture") {
        // Wooden capture impact: dual wooden click + deep board resonance
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(520, now);
        osc1.frequency.exponentialRampToValueAtTime(90, now + 0.09);
        gain1.gain.setValueAtTime(0.7, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.09);
      } else if (key === "check") {
        // Check notification tone
        [440, 554.37].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now + i * 0.06);
          gain.gain.setValueAtTime(0.4, now + i * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.15);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.06);
          osc.stop(now + i * 0.06 + 0.15);
        });
      }
    } catch {}
  }
}

export const soundManager = new SoundManager();
