type Gtag = (...args: unknown[]) => void;

// Queue a GA4 event. gtag.js reads an Arguments object, so the stub matches that shape.
export function track(event: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const w = window as Window & { gtag?: Gtag; dataLayer?: IArguments[] };
  w.dataLayer = w.dataLayer || [];
  if (typeof w.gtag !== "function") {
    w.gtag = function gtag() {
      w.dataLayer?.push(arguments);
    };
  }
  w.gtag("event", event, params);
}
