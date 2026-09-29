import { salesEmail } from "@/service/billing/plans";
import { PRIVACY_VERSION } from "@/service/legal/versions";

// Published Privacy Policy. Bump PRIVACY_VERSION when this text changes.
export function PrivacyDocument() {
  const email = salesEmail();

  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
        Version {PRIVACY_VERSION}
      </p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-[#12141c]">私隱政策</h1>
      <div className="mt-8 space-y-8 text-base leading-7 text-zinc-700">
        <section>
          <h2 className="text-xl font-semibold text-[#12141c]">我們收集什麼</h2>
          <p className="mt-2">
            帳號資料（電郵、姓名）由登入服務 Clerk 提供。你在 Scro 建立的專案、分鏡、角色、上傳照片，以及訂閱與點數紀錄。付款卡資料由 Stripe 處理，Scro 不保存完整卡號。
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-[#12141c]">用來做什麼</h2>
          <p className="mt-2">
            用來登入、產生影片、計算 credits、寄出產生完成通知、處理推薦關係，以及回覆你的查詢。
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-[#12141c]">誰會處理</h2>
          <p className="mt-2">
            登入（Clerk）、付款（Stripe）、資料庫與網站託管、寄信，以及產生圖片與影片的模型供應商。上傳的照片與分鏡文字會在產生該次影片時傳給模型供應商。
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-[#12141c]">Cookie</h2>
          <p className="mt-2">
            我們使用維持登入所需的 cookie，以及推薦連結的 cookie。註冊時若你勾選條款，瀏覽器會暫存你同意的版本號，以便寫入帳號。
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-[#12141c]">保存與你的選擇</h2>
          <p className="mt-2">
            帳號與專案會保留到你刪除或我們結束服務。你可以來信要求查閱或刪除帳號資料。政策版本更新後，你需要在登入後重新同意。
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-[#12141c]">聯絡</h2>
          <p className="mt-2">
            <a className="font-semibold text-[#12141c] underline" href={`mailto:${email}`}>
              {email}
            </a>
          </p>
        </section>
      </div>

      <h2 className="mt-16 text-3xl font-bold tracking-tight text-[#12141c]">Privacy Policy</h2>
      <div className="mt-8 space-y-8 text-base leading-7 text-zinc-700">
        <section>
          <h3 className="text-xl font-semibold text-[#12141c]">What we collect</h3>
          <p className="mt-2">
            Account email and name come from Clerk. Scro stores your projects, storyboards, characters, uploaded photos, and credit or subscription records. Card numbers stay with Stripe.
          </p>
        </section>
        <section>
          <h3 className="text-xl font-semibold text-[#12141c]">Why</h3>
          <p className="mt-2">
            To sign you in, render video, count credits, email you when a render finishes, track referrals, and answer support questions.
          </p>
        </section>
        <section>
          <h3 className="text-xl font-semibold text-[#12141c]">Who processes it</h3>
          <p className="mt-2">
            Clerk for sign-in, Stripe for payments, our database and host, email delivery, and the model providers that render images and video. Photos and storyboard text are sent to those providers for that render.
          </p>
        </section>
        <section>
          <h3 className="text-xl font-semibold text-[#12141c]">Cookies</h3>
          <p className="mt-2">
            We use cookies to keep you signed in and to remember a referral link. If you check the policies at registration, a short-lived cookie stores the version you accepted so it can be written onto the account.
          </p>
        </section>
        <section>
          <h3 className="text-xl font-semibold text-[#12141c]">Retention and your choices</h3>
          <p className="mt-2">
            Account and project data stay until you delete them or the service ends. Email us to ask for access or deletion. When this policy version changes, you must accept again after login.
          </p>
        </section>
        <section>
          <h3 className="text-xl font-semibold text-[#12141c]">Contact</h3>
          <p className="mt-2">
            <a className="font-semibold text-[#12141c] underline" href={`mailto:${email}`}>
              {email}
            </a>
          </p>
        </section>
      </div>
    </article>
  );
}
