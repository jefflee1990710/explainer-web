"use client";

import { DialogBackdrop } from "@/presentation/components/dialog-backdrop";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { acceptCurrentPolicies } from "@/presentation/actions/legal";
import { track, trackAsync } from "@/presentation/components/analytics/track";
import { useI18n } from "@/presentation/components/i18n-provider";

// Shown over the app on first login, and again when the published versions change.
// There is no dismiss control: both boxes are required.
export function AcceptPoliciesDialog({ firstTime }: { firstTime: boolean }) {
  const { t } = useI18n();
  const titleId = useId();
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    track("legal_dialog_shown", { firstTime });
  }, [firstTime]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    const result = await acceptCurrentPolicies({ terms, privacy });
    if (!result.ok) {
      track("legal_accept_error", { terms, privacy });
      setError(t("legal.mustAccept"));
      setPending(false);
      return;
    }
    await trackAsync("legal_dialog_accepted", { firstTime });
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full navigation re-runs AppLayout server check to unmount the policy dialog
    window.location.assign("/app");
  }

  return (
    <DialogBackdrop className="grid place-items-center bg-[#12141c]/40 p-4 backdrop-blur-sm">
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onSubmit={(event) => void onSubmit(event)}
        className="w-full max-w-md rounded-[1.75rem] border border-[#12141c]/10 bg-white p-6 shadow-[8px_8px_0_0_rgba(18,20,28,0.12)] sm:p-7"
      >
        <h2 id={titleId} className="text-2xl font-bold tracking-tight text-[#12141c]">
          {firstTime ? t("legal.firstTitle") : t("legal.updatedTitle")}
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          {firstTime ? t("legal.firstBody") : t("legal.updatedBody")}
        </p>
        <label className="mt-6 flex items-start gap-3 text-sm text-zinc-700">
          <input
            type="checkbox"
            className="mt-1"
            checked={terms}
            onChange={(event) => setTerms(event.target.checked)}
          />
          <span>
            {t("legal.acceptTerms")}{" "}
            <Link
              href="/terms"
              onClick={() => track("legal_link_click", { target: "terms" })}
              className="font-semibold text-[#12141c] underline"
              target="_blank"
            >
              {t("legal.terms")}
            </Link>
          </span>
        </label>
        <label className="mt-3 flex items-start gap-3 text-sm text-zinc-700">
          <input
            type="checkbox"
            className="mt-1"
            checked={privacy}
            onChange={(event) => setPrivacy(event.target.checked)}
          />
          <span>
            {t("legal.acceptPrivacy")}{" "}
            <Link
              href="/privacy"
              onClick={() => track("legal_link_click", { target: "privacy" })}
              className="font-semibold text-[#12141c] underline"
              target="_blank"
            >
              {t("legal.privacy")}
            </Link>
          </span>
        </label>
        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={pending || !terms || !privacy}
          className="mt-6 inline-flex rounded-full bg-[#12141c] px-8 py-3 text-sm font-semibold text-[#c6f24b] disabled:opacity-50"
        >
          {t("legal.agree")}
        </button>
      </form>
    </DialogBackdrop>
  );
}
