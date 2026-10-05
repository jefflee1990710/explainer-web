"use client";

import { useEffect, useState, type MouseEventHandler, type ReactNode } from "react";
import { createPortal } from "react-dom";

const HOST_ID = "studio-dialog-root";

// Full-viewport scrim above the rail. The editor pane cannot cover this host.
export function DialogBackdrop({
  className,
  children,
  onClick,
}: {
  className: string;
  children: ReactNode;
  onClick?: MouseEventHandler<HTMLDivElement>;
}) {
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setHost(document.getElementById(HOST_ID) ?? document.body);
  }, []);

  if (!host) return null;

  return createPortal(
    <div className={`pointer-events-auto fixed inset-0 z-[100] ${className}`} onClick={onClick}>
      {children}
    </div>,
    host,
  );
}
