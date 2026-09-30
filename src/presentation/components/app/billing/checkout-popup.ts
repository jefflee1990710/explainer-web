export const CHECKOUT_MESSAGE_TYPE = "scro-checkout";

export type CheckoutPopupStatus = "success" | "cancel" | "closed";

// Stripe hosted checkout in a popup; the done page posts this back.
export function isCheckoutMessage(
  event: MessageEvent,
): event is MessageEvent<{ type: string; status: CheckoutPopupStatus }> {
  return (
    event.origin === window.location.origin &&
    event.data?.type === CHECKOUT_MESSAGE_TYPE &&
    (event.data.status === "success" || event.data.status === "cancel")
  );
}

export function openCheckoutPopup(url: string) {
  return window.open(url, "scro-checkout", "popup=yes,width=480,height=800");
}

// Resolve when Stripe finishes or the user closes the window.
export function waitForCheckoutPopup(popup: Window): Promise<CheckoutPopupStatus> {
  return new Promise((resolve) => {
    function finish(status: CheckoutPopupStatus) {
      window.removeEventListener("message", onMessage);
      window.clearInterval(timer);
      resolve(status);
    }
    function onMessage(event: MessageEvent) {
      if (!isCheckoutMessage(event)) return;
      finish(event.data.status);
    }
    window.addEventListener("message", onMessage);
    const timer = window.setInterval(() => {
      if (popup.closed) finish("closed");
    }, 400);
  });
}
