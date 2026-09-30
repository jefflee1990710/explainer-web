"use client";

import { useState } from "react";
import Link from "next/link";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAdditionalUserInfo,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { useI18n } from "@/presentation/components/i18n-provider";
import { firebaseAuth } from "@/presentation/components/auth/firebase-client";
import { establishSessionAction } from "@/presentation/actions/auth";
import { track } from "@/presentation/components/analytics/track";

// Only same-site paths. A full URL in ?next= must not leave the app.
function safeNext(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/app";
  return value;
}

function authErrorKey(code: string) {
  if (code === "auth/email-already-in-use") return "auth.emailInUse";
  if (code === "auth/weak-password") return "auth.weakPassword";
  if (code === "auth/invalid-email") return "auth.invalidEmail";
  if (
    code === "auth/invalid-credential" ||
    code === "auth/wrong-password" ||
    code === "auth/user-not-found"
  ) {
    return "auth.invalidCredential";
  }
  if (code === "auth/unauthorized-domain") return "auth.unauthorizedDomain";
  if (code === "auth/popup-blocked") return "auth.popupBlocked";
  return "auth.genericError";
}

// Email/password and Google sign-in. The server session is what later pages trust.
export function AuthForm({
  mode,
  nextPath,
}: {
  mode: "sign-in" | "sign-up";
  nextPath?: string;
}) {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const register = mode === "sign-up";

  async function finish(idToken: string, event: "login" | "sign_up", method: "email" | "google") {
    await establishSessionAction(idToken);
    track(event, { method });
    window.location.assign(safeNext(nextPath));
  }

  async function onEmail(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const cred = register
        ? await createUserWithEmailAndPassword(firebaseAuth(), email.trim(), password)
        : await signInWithEmailAndPassword(firebaseAuth(), email.trim(), password);
      const idToken = await cred.user.getIdToken();
      await finish(idToken, register ? "sign_up" : "login", "email");
    } catch (caught) {
      const code = caught && typeof caught === "object" && "code" in caught ? String(caught.code) : "";
      setError(t(authErrorKey(code)));
      setPending(false);
    }
  }

  async function onGoogle() {
    setPending(true);
    setError("");
    try {
      const cred = await signInWithPopup(firebaseAuth(), new GoogleAuthProvider());
      const created = getAdditionalUserInfo(cred)?.isNewUser === true;
      const idToken = await cred.user.getIdToken();
      await finish(idToken, created ? "sign_up" : "login", "google");
    } catch (caught) {
      const code = caught && typeof caught === "object" && "code" in caught ? String(caught.code) : "";
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        setPending(false);
        return;
      }
      setError(t(authErrorKey(code)));
      setPending(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <h1 className="text-3xl font-bold tracking-tight text-[#12141c]">
        {register ? t("auth.signUpTitle") : t("auth.signInTitle")}
      </h1>
      <button
        type="button"
        onClick={() => void onGoogle()}
        disabled={pending}
        className="mt-8 flex w-full items-center justify-center gap-3 rounded-full border border-[#12141c]/15 bg-white px-6 py-3 text-sm font-semibold text-[#12141c] transition-colors hover:bg-zinc-50 disabled:opacity-60"
      >
        <GoogleMark />
        {t("auth.google")}
      </button>
      <p className="my-6 text-center text-xs uppercase tracking-wide text-zinc-400">{t("auth.or")}</p>
      <form onSubmit={(event) => void onEmail(event)} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-[#12141c]">
          {t("auth.email")}
          <input
            type="email"
            autoComplete="email"
            required
            placeholder={t("auth.emailPlaceholder")}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 font-normal text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-[#12141c]"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-[#12141c]">
          {t("auth.password")}
          <input
            type="password"
            autoComplete={register ? "new-password" : "current-password"}
            required
            minLength={6}
            placeholder={t("auth.passwordPlaceholder")}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 font-normal text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-[#12141c]"
          />
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-[#12141c] px-6 py-3 text-sm font-semibold text-[#c6f24b] transition-colors hover:bg-black disabled:opacity-60"
        >
          {pending ? t("common.loading") : register ? t("auth.signUpSubmit") : t("auth.signInSubmit")}
        </button>
      </form>
      <p className="mt-6 text-sm text-zinc-600">
        {register ? (
          <Link href="/sign-in" className="font-semibold text-[#12141c] underline">
            {t("auth.haveAccount")}
          </Link>
        ) : (
          <Link href="/sign-up" className="font-semibold text-[#12141c] underline">
            {t("auth.needAccount")}
          </Link>
        )}
      </p>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path fill="#4285F4" d="M17.6 9.2c0-.6-.1-1.2-.2-1.8H9v3.4h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.9c1.7-1.6 2.7-3.9 2.7-6.5z" />
      <path fill="#34A853" d="M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.2c-.8.6-1.9.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H.9v2.3A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.9 10.7A5.4 5.4 0 0 1 3.6 9c0-.6.1-1.2.3-1.7V5H.9a9 9 0 0 0 0 8l3-2.3z" />
      <path fill="#EA4335" d="M9 3.6c1.3 0 2.5.5 3.4 1.3L15.1 2A9 9 0 0 0 .9 5l3 2.3C4.6 5.2 6.6 3.6 9 3.6z" />
    </svg>
  );
}
