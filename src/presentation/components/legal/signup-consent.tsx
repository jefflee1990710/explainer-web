"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import { setSignupConsent } from "@/presentation/actions/legal";
import { useI18n } from "@/presentation/components/i18n-provider";

// Blocks account creation until both policies are checked for the current versions.
export function SignupConsent() {
  const { t } = useI18n();
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [ready, setReady] = useState(false);
  const termsRef = useRef(false);
  const privacyRef = useRef(false);
  // Cookie writes must finish in click order, or an earlier "one box" call can delete the later pair.
  const writeQueue = useRef(Promise.resolve());

  function persist() {
    const nextTerms = termsRef.current;
    const nextPrivacy = privacyRef.current;
    writeQueue.current = writeQueue.current
      .then(() => setSignupConsent({ terms: nextTerms, privacy: nextPrivacy }))
      .then(() => {
        if (termsRef.current === nextTerms && privacyRef.current === nextPrivacy) {
          setReady(nextTerms && nextPrivacy);
        }
      })
      .catch(() => {
        if (termsRef.current === nextTerms && privacyRef.current === nextPrivacy) {
          setReady(false);
        }
      });
  }

  function onTerms(checked: boolean) {
    termsRef.current = checked;
    setTerms(checked);
    persist();
  }

  function onPrivacy(checked: boolean) {
    privacyRef.current = checked;
    setPrivacy(checked);
    persist();
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-6 py-16">
      <div className="flex flex-col gap-3 text-sm text-zinc-700">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            className="mt-1"
            checked={terms}
            onChange={(event) => onTerms(event.target.checked)}
          />
          <span>
            {t("legal.acceptTerms")}{" "}
            <Link href="/terms" className="font-semibold text-[#12141c] underline" target="_blank">
              {t("legal.terms")}
            </Link>
          </span>
        </label>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            className="mt-1"
            checked={privacy}
            onChange={(event) => onPrivacy(event.target.checked)}
          />
          <span>
            {t("legal.acceptPrivacy")}{" "}
            <Link href="/privacy" className="font-semibold text-[#12141c] underline" target="_blank">
              {t("legal.privacy")}
            </Link>
          </span>
        </label>
        {ready ? null : <p className="text-xs text-zinc-500">{t("legal.mustAccept")}</p>}
      </div>
      {ready ? <SignUp fallbackRedirectUrl="/app" signInUrl="/sign-in" /> : null}
    </div>
  );
}
