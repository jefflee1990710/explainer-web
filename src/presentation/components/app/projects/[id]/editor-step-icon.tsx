// Icon inside a step avatar. Video is a play mark.
export function EditorStepIcon({ stepId }: { stepId: "video" | "production" | "export" }) {
  // Legacy production/export ids still render the play mark (Video).
  if (stepId === "production") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <rect x="3.5" y="4.5" width="11" height="9" rx="1.6" />
        <rect x="9.5" y="10.5" width="11" height="9" rx="1.6" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
      <path d="M9.2 7.2 17 12l-7.8 4.8V7.2Z" />
    </svg>
  );
}
