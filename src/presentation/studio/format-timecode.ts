// Filmstrip duration. Frames stay 00 because clip lengths are whole seconds.
export function formatTimecode(durationSeconds: number): string {
  const total = Math.max(0, Math.floor(durationSeconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}:00`;
}
