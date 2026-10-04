export type InstallPlatform = "ios" | "android" | "desktop";

/** Which install guidance applies to this visitor. Pure so tests can feed
 * user-agent strings; iPadOS 13+ masquerades as desktop Safari, hence the
 * Mac + touch-points check. */
export function detectInstallPlatform(ua: string, maxTouchPoints = 0): InstallPlatform {
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && maxTouchPoints > 1);
  if (isIOS) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

/** True when GPort already runs as an installed web app. */
export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  const navigatorStandalone = (window.navigator as Navigator & { standalone?: boolean })
    .standalone;
  return window.matchMedia("(display-mode: standalone)").matches || Boolean(navigatorStandalone);
}
