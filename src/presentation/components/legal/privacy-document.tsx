import { PRIVACY_VERSION } from "@/service/legal/versions";

const CONTACT_EMAIL = "cs@thenovax.com";
const COMPANY_SITE = "https://www.thenovax.com";

// Published Privacy Policy. Bump PRIVACY_VERSION when this text changes.
export function PrivacyDocument() {
  return (
    <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="rounded-3xl border border-white/10 bg-white p-6 text-[#12141c] shadow-2xl sm:p-12">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
          Effective &amp; Last Updated: {PRIVACY_VERSION} (Version {PRIVACY_VERSION})
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#12141c] sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-4 text-sm leading-6 text-zinc-600">
          This Privacy Policy explains how <strong>NOVAX Limited</strong> collects, uses, processes,
          stores, and protects your personal information when you use the Scro platform, studio
          tools, and related services (the &ldquo;Service&rdquo;), in compliance with the Hong Kong
          Personal Data (Privacy) Ordinance (Cap. 486) (&ldquo;PDPO&rdquo;) and applicable
          international data protection standards.
        </p>

        <div className="mt-8 space-y-8 text-base leading-7 text-zinc-700">
          <section>
            <h2 className="text-xl font-semibold text-[#12141c]">
              1. Data Controller &amp; Who We Are
            </h2>
            <p className="mt-2">
              <strong>NOVAX Limited</strong>, a Hong Kong software company, operates Scro and acts
              as the data controller (data user) for the personal information described in this
              policy.{" "}
              <a
                className="font-semibold text-[#12141c] underline"
                href={COMPANY_SITE}
                target="_blank"
                rel="noopener noreferrer"
              >
                thenovax.com
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#12141c]">2. Information We Collect</h2>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6 text-zinc-700">
              <li>
                <strong>Account &amp; Identity Data:</strong> Your email address, display name,
                profile picture, and authentication identifier provided via Firebase Authentication
                (email/password or Google Sign-In).
              </li>
              <li>
                <strong>Technical, Device &amp; Security Data:</strong> IP address, browser/device
                identifiers, session logs, and anti-abuse signals used to prevent multi-account
                credit abuse and unauthorized access.
              </li>
              <li>
                <strong>Legal &amp; Marketing Consent Records:</strong> The version numbers and
                timestamps of the Terms of Service and Privacy Policy you accepted, as well as your
                explicit opt-in/opt-out status and timestamp for receiving marketing emails.
              </li>
              <li>
                <strong>Uploaded Media, Prompts &amp; Generated Assets:</strong> Storyboards,
                scripts, character blueprints, reference photos, source videos, audio clips, and the
                resulting AI-generated frames and videos stored in your workspace.
              </li>
              <li>
                <strong>Billing &amp; Transaction Data:</strong> Subscription plans, credit balances
                and usage history, referral records, and Stripe customer/checkout identifiers. Full
                payment card numbers are processed directly by Stripe and are never stored on our
                servers.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#12141c]">
              3. Facial, Voice &amp; Biometric Feature Processing
            </h2>
            <p className="mt-2">
              When you voluntarily upload photos, videos, or audio to use features such as{" "}
              <strong>Scro Swap</strong>, <strong>Teleport</strong>,{" "}
              <strong>AI Influencer Character Blueprints</strong>, or <strong>Talking Head</strong>,
              our system and designated AI inference sub-processors analyze visual facial geometry,
              body segmentation masks (such as grey-mannequin motion silhouettes), and vocal
              characteristics strictly to render the specific image or video output you requested.
            </p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-6 text-zinc-700">
              <li>
                We <strong>do not</strong> use your uploaded facial photos or voice recordings to
                build biometric identification databases, conduct real-world surveillance, or sell
                biometric data to third parties.
              </li>
              <li>
                You must only upload images, videos, or voices of yourself or of adult individuals
                (18+) who have given you their explicit, verifiable consent. Uploading third-party
                likenesses without consent is a strict violation of our Terms of Service.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#12141c]">
              4. How &amp; Why We Use Your Information
            </h2>
            <p className="mt-2">We process your personal data for the following purposes:</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-6 text-zinc-700">
              <li>
                <strong>Service Delivery:</strong> To authenticate your account, generate storyboards,
                render AI images/audio/videos, manage your credit balance, and send transactional
                notifications (e.g., when a video render completes).
              </li>
              <li>
                <strong>Trust, Safety &amp; Abuse Prevention:</strong> To detect, investigate, and
                prevent prohibited content (such as NSFW, non-consensual intimate imagery, CSAM, or
                unauthorized deepfakes), payment fraud, and Terms of Service violations.
              </li>
              <li>
                <strong>Marketing Communications (With Consent):</strong> Where you have opted in to
                receive marketing emails, we use your email address and name to send you product
                updates, creator guides, and promotional offers. You can withdraw this consent at
                any time via your workspace Settings or the unsubscribe link in our emails.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#12141c]">
              5. Sub-Processors &amp; Third-Party Providers
            </h2>
            <p className="mt-2">
              To operate the Service, we share only the minimum necessary data with trusted
              infrastructure and AI inference providers: Firebase (authentication), Stripe
              (payments), MongoDB Atlas and Vercel / Vercel Blob (database and cloud media storage),
              transactional/marketing email delivery services, and upstream AI model providers (such
              as Google Gemini, OpenRouter, MiniMax, Alibaba Cloud, ByteDance Seedream, HeyGen,
              ElevenLabs, fal.ai, and our dedicated ComfyUI GPU nodes). Uploaded photos, source
              videos, audio, and prompts are transmitted to those model providers solely to execute
              your requested render.
            </p>
          </section>

          <section className="rounded-2xl border-2 border-amber-200 bg-amber-50/70 p-5 sm:p-6">
            <h2 className="text-xl font-bold text-amber-950">
              6. Trust &amp; Safety Monitoring, Abuse Investigation &amp; Law Enforcement Disclosure
            </h2>
            <p className="mt-2 text-sm leading-6 text-amber-950">
              While user workspaces are private by default, your privacy rights do not extend to
              unlawful or abusive conduct on the platform:
            </p>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6 text-amber-950">
              <li>
                <strong>Authorized Safety &amp; Compliance Review (No Duty to Monitor):</strong>{" "}
                Authorized NOVAX Limited administrators and automated safety systems reserve the
                right (but assume <strong>no affirmative obligation or duty of care</strong> to
                pre-screen or monitor workspaces) to access and review user prompts, uploaded source
                files, reference photos, and generated outputs to diagnose technical failures, audit
                system security, or investigate suspected violations of our Terms of Service
                (including NSFW content, non-consensual deepfakes/NCII, CSAM, doxxing, national
                security offences, or fraud).
              </li>
              <li>
                <strong>Disclosure to Law Enforcement &amp; Third Parties:</strong> NOVAX Limited
                reserves the right to preserve and disclose your account profile, email address, IP
                addresses, session logs, payment records, uploaded files, and generated media{" "}
                <strong>without prior notice to you</strong> to law enforcement authorities,
                government regulators, courts, payment processors, or affected third-party victims
                whenever we believe in good faith that such disclosure is required by law, subpoena,
                or court order, or is reasonably necessary to investigate, prevent, or prosecute
                illegal activities (including non-consensual sexual synthesis, CSAM, identity theft,
                or severe infringement of third-party rights).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#12141c]">
              7. Third-Party Likeness Takedown &amp; Privacy Complaints
            </h2>
            <p className="mt-2">
              If you are an individual whose photograph, video, or voice has been uploaded to or
              synthesized on Scro by a user without your consent, please contact us immediately at{" "}
              <a className="font-semibold text-[#12141c] underline" href={`mailto:${CONTACT_EMAIL}`}>
                {CONTACT_EMAIL}
              </a>{" "}
              with the relevant link or description. Upon receiving specific notice and reasonable
              verification, we will take commercially reasonable steps to delete the unauthorized
              media hosted on our controlled storage servers and take appropriate enforcement action
              against the responsible user account. Because Scro is a self-service tool, NOVAX
              Limited cannot control and expressly disclaims any liability for copies already
              downloaded or distributed externally by a user.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#12141c]">
              8. Cookies, Retention &amp; Your Choices
            </h2>
            <p className="mt-2">
              We use essential cookies to keep you signed in, remember language/theme preferences,
              track referral links, and record policy consent. Account and project data are retained
              for as long as your account remains active, or as needed to comply with legal, tax,
              dispute-resolution, and anti-abuse obligations (for example, retaining records of
              banned accounts to prevent re-registration).
            </p>
            <p className="mt-2">
              You have the right to request access to, correction of, or deletion of your personal
              data, or to withdraw your marketing email consent at any time. When this Privacy
              Policy version changes, you will be prompted to accept the updated version after
              login.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#12141c]">9. Contact Us</h2>
            <p className="mt-2">
              For privacy inquiries, data deletion requests, marketing opt-outs, or abuse/takedown
              reports, contact <strong>NOVAX Limited</strong> at{" "}
              <a className="font-semibold text-[#12141c] underline" href={`mailto:${CONTACT_EMAIL}`}>
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </article>
  );
}
