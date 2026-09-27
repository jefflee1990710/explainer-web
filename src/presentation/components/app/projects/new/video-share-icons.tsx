import type { ReactNode } from "react";
import type { VideoShareId } from "@/service/video-share/platforms";

function Mark({
  className,
  label,
  children,
}: {
  className: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <title>{label}</title>
      {children}
    </svg>
  );
}

function InstagramMark({ className, paintId }: { className: string; paintId: string }) {
  return (
    <Mark className={className} label="Instagram">
      <rect x="3" y="3" width="18" height="18" rx="5" fill={`url(#${paintId})`} />
      <circle cx="12" cy="12" r="4.1" fill="none" stroke="white" strokeWidth="1.7" />
      <circle cx="17.1" cy="6.9" r="1.15" fill="white" />
      <defs>
        <linearGradient id={paintId} x1="4" y1="20" x2="20" y2="4">
          <stop stopColor="#F58529" />
          <stop offset="0.4" stopColor="#DD2A7B" />
          <stop offset="1" stopColor="#515BD4" />
        </linearGradient>
      </defs>
    </Mark>
  );
}

function FacebookMark({ className }: { className: string }) {
  return (
    <Mark className={className} label="Facebook">
      <rect width="24" height="24" rx="5" fill="#1877F2" />
      <path
        fill="white"
        d="M15.7 8.4h-2c-.4 0-.7.3-.7.8v1.6h2.6l-.4 2.5h-2.2V20h-2.7v-6.7H8.7v-2.5h1.6V9.5c0-1.9 1.2-3.5 3.4-3.5.8 0 1.6.1 1.6.1v2.3h-.6z"
      />
    </Mark>
  );
}

function TikTokMark({ className }: { className: string }) {
  return (
    <Mark className={className} label="TikTok">
      <rect width="24" height="24" rx="5" fill="#111" />
      <path
        fill="#25F4EE"
        d="M16.3 7.2c.7.7 1.6 1.2 2.6 1.4V11c-1.1-.03-2.2-.38-3.1-1v5.1c0 2.4-1.9 4.3-4.4 4.3S7 17.5 7 15.1s1.9-4.3 4.4-4.3c.3 0 .5 0 .8.1v2.5c-.2-.1-.5-.1-.8-.1-1.1 0-1.9.9-1.9 1.9s.9 1.9 1.9 1.9 1.9-.9 1.9-1.9V6h2.5c.10.4.18.85.5 1.2z"
      />
      <path
        fill="white"
        d="M15.8 7.6c.7.7 1.6 1.2 2.6 1.4V10c-.95-.03-1.85-.32-2.6-.82V15c0 2.4-1.9 4.3-4.4 4.3S7 17.4 7 15s1.9-4.3 4.4-4.3c.25 0 .5 0 .73.07v2.35A1.9 1.9 0 0 0 11.4 13c-1.1 0-1.9.85-1.9 1.9s.85 1.9 1.9 1.9 1.9-.85 1.9-1.9V6.2h2.5c.07.48.2.93.5 1.4z"
      />
    </Mark>
  );
}

function YouTubeMark({ className }: { className: string }) {
  return (
    <Mark className={className} label="YouTube">
      <rect width="24" height="24" rx="5" fill="#FF0000" />
      <path fill="white" d="M10 8.6 16.2 12 10 15.4V8.6z" />
    </Mark>
  );
}

function XMark({ className }: { className: string }) {
  return (
    <Mark className={className} label="X">
      <rect width="24" height="24" rx="5" fill="#111" />
      <path
        fill="white"
        d="M16.7 6.5h2.1l-4.6 5.2 5.4 7.8h-4.2l-3.3-4.7-3.8 4.7H6.2l4.9-5.6L5.9 6.5h4.3l3 4.3 3.5-4.3zm-.7 11.6h1.2L8.1 7.7H6.8l9.2 10.4z"
      />
    </Mark>
  );
}

// Brand marks for the share-target buttons.
export function VideoShareIcon({
  id,
  className = "h-4 w-4 shrink-0",
}: {
  id: VideoShareId;
  className?: string;
}) {
  if (id === "instagram_reel" || id === "instagram_post") {
    return <InstagramMark className={className} paintId={`ig-share-${id}`} />;
  }
  if (id === "facebook") return <FacebookMark className={className} />;
  if (id === "tiktok") return <TikTokMark className={className} />;
  if (id === "youtube") return <YouTubeMark className={className} />;
  return <XMark className={className} />;
}
