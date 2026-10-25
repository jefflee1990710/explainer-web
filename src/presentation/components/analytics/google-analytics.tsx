import Script from "next/script";
import { Suspense } from "react";
import { UxRouteTracker } from "@/presentation/components/analytics/ux-route-tracker";

// GA4 script loader + SPA route tracker that logs page_view to both GA4 and MongoDB.
export function GoogleAnalytics() {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <>
      {id ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
            strategy="afterInteractive"
          />
          <Script id="ga4" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('js', new Date());
              gtag('config', '${id}', { send_page_view: false });
            `}
          </Script>
        </>
      ) : null}
      <Suspense fallback={null}>
        <UxRouteTracker />
      </Suspense>
    </>
  );
}
