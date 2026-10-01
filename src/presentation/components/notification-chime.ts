// Short two-note chime. Browsers only allow sound after a click or key press,
// so the toaster arms the context on the first gesture.
let audio: AudioContext | null = null;

function audioContext() {
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!audio) audio = new Ctx();
  return audio;
}

export function armNotificationSound() {
  const ctx = audioContext();
  if (ctx && ctx.state === "suspended") void ctx.resume();
}

function tone(ctx: AudioContext, frequency: number, when: number, duration: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(0.07, when + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(when);
  osc.stop(when + duration);
}

export function playNotificationChime() {
  const ctx = audioContext();
  if (!ctx) return;
  const start = () => {
    const when = ctx.currentTime + 0.01;
    tone(ctx, 880, when, 0.12);
    tone(ctx, 1318, when + 0.1, 0.18);
  };
  if (ctx.state === "suspended") {
    void ctx.resume().then(() => {
      if (ctx.state === "running") start();
    });
    return;
  }
  start();
}
