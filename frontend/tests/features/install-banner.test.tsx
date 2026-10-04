import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InstallBanner } from "@/features/pwa/components/install-banner";

jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} alt={props.alt ?? ""} />
  ),
}));

const IOS_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const ANDROID_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

function setUserAgent(ua: string, maxTouchPoints = 0) {
  Object.defineProperty(window.navigator, "userAgent", { value: ua, configurable: true });
  Object.defineProperty(window.navigator, "maxTouchPoints", {
    value: maxTouchPoints,
    configurable: true,
  });
}

beforeAll(() => {
  // jsdom has no matchMedia; the banner only reads (display-mode: standalone).
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
});

describe("InstallBanner", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("hides on desktop browsers", () => {
    setUserAgent(DESKTOP_UA);
    const { container } = render(<InstallBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the iOS Safari banner and opens the add-to-home-screen steps", async () => {
    const user = userEvent.setup();
    setUserAgent(IOS_UA, 5);
    render(<InstallBanner />);

    expect(await screen.findByText(/Добавьте GPort на экран «Домой»/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Как добавить" }));
    expect(await screen.findByText(/На экран „Домой“/i)).toBeInTheDocument();
  });

  it("shows the Android banner with the install fallback", async () => {
    setUserAgent(ANDROID_UA);
    render(<InstallBanner />);

    expect(await screen.findByText(/Установите приложение GPort/i)).toBeInTheDocument();
    // jsdom never fires beforeinstallprompt, so the banner offers the steps.
    expect(screen.getByRole("button", { name: "Как установить" })).toBeInTheDocument();
  });

  it("stays hidden after the user closes it", async () => {
    const user = userEvent.setup();
    setUserAgent(IOS_UA, 5);
    render(<InstallBanner />);

    await screen.findByText(/Добавьте GPort на экран «Домой»/i);
    await user.click(screen.getByRole("button", { name: /скрыть баннер/i }));

    expect(screen.queryByText(/Добавьте GPort/i)).not.toBeInTheDocument();
    expect(window.localStorage.getItem("gport-install-banner-dismissed")).toBe("1");
  });
});
