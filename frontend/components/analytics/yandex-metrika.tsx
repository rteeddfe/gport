import Script from "next/script";

import { getSettings } from "@/services/settings.service";

/** Official Yandex Metrika snippet, shown on every page once a counter id
 * is configured in the admin analytics tab. The id is interpolated into an
 * inline script, so digits-only is re-checked here regardless of the API. */
export async function YandexMetrika() {
  const settings = await getSettings().catch(() => null);
  const counterId = (settings?.metrikaCounterId ?? "").trim();
  if (!/^\d{4,14}$/.test(counterId)) return null;

  const webvisor = settings?.metrikaWebvisor ? "true" : "false";
  const init =
    `(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};` +
    `m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r)return;}` +
    `k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})` +
    `(window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");` +
    `ym(${counterId},"init",{clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:${webvisor}});`;

  return (
    <>
      <Script
        id="yandex-metrika"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: init }}
      />
      <noscript>
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://mc.yandex.ru/watch/${counterId}`}
            style={{ position: "absolute", left: "-9999px" }}
            alt=""
          />
        </div>
      </noscript>
    </>
  );
}
