"use client";

import { useEffect, useState, type MouseEventHandler, type ReactNode } from "react";
import { createPortal } from "react-dom";

const HOST_ID = "studio-dialog-root";

// Full-viewport scrim above the rail. The editor pane cannot cover this host.
export function DialogBackdrop({
  className,
  children,
  onClick,
  zIndex = 100,
}: {
  className: string;
  children: ReactNode;
  onClick?: MouseEventHandler<HTMLDivElement>;
  // Nested dialogs pass a higher value so they sit above the dialog that opened them.
  zIndex?: number;
}) {
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setHost(document.getElementById(HOST_ID) ?? document.body);
  }, []);

  if (!host) return null;

  return createPortal(
    <div className={`pointer-events-auto fixed inset-0 ${className}`} style={{ zIndex }} onClick={onClick}>
      {children}
    </div>,
    host,
  );
}
