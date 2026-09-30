import { PRIVACY_VERSION } from "@/service/legal/versions";

const CONTACT_EMAIL = "cs@thenovax.com";

// Published Privacy Policy. Bump PRIVACY_VERSION when this text changes.
export function PrivacyDocument() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
        Version {PRIVACY_VERSION}
      </p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-[#12141c]">Privacy Policy</h1>
      <div className="mt-8 space-y-8 text-base leading-7 text-zinc-700">
        <section>
          <h2 className="text-xl font-semibold text-[#12141c]">What we collect</h2>
          <p className="mt-2">
            Account email and name come from Firebase. Scro stores your projects, storyboards, characters, uploaded photos, and credit or subscription records. Card numbers stay with Stripe.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-[#12141c]">Why</h2>
          <p className="mt-2">
            To sign you in, render video, count credits, email you when a render finishes, track referrals, and answer support questions.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-[#12141c]">Who processes it</h2>
          <p className="mt-2">
            Firebase for sign-in, Stripe for payments, our database and host, email delivery, and the model providers that render images and video. Photos and storyboard text are sent to those providers for that render.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-[#12141c]">Cookies</h2>
          <p className="mt-2">
            We use cookies to keep you signed in and to remember a referral link. If you check the policies at registration, a short-lived cookie stores the version you accepted so it can be written onto the account.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-[#12141c]">Retention and your choices</h2>
          <p className="mt-2">
            Account and project data stay until you delete them or the service ends. Email us to ask for access or deletion. When this policy version changes, you must accept again after login.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-[#12141c]">Contact</h2>
          <p className="mt-2">
            <a className="font-semibold text-[#12141c] underline" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
          </p>
        </section>
      </div>
    </article>
  );
}
