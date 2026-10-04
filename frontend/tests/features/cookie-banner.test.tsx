import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CookieBanner } from "@/features/consent/components/cookie-banner";

describe("CookieBanner", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shows the notice with a link to the privacy policy until accepted", () => {
    render(<CookieBanner />);

    expect(screen.getByText(/Мы используем cookie/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /политика конфиденциальности/i }),
    ).toHaveAttribute("href", "/policies/privacy");
  });

  it("persists the choice and hides itself when accepted", async () => {
    const user = userEvent.setup();
    render(<CookieBanner />);

    await user.click(screen.getByRole("button", { name: "Принять" }));

    expect(window.localStorage.getItem("gport-cookie-consent")).toBe("accepted");
    expect(screen.queryByText(/Мы используем cookie/i)).not.toBeInTheDocument();
  });

  it("stays hidden on the next visit after acceptance", () => {
    window.localStorage.setItem("gport-cookie-consent", "accepted");
    const { container } = render(<CookieBanner />);

    expect(container).toBeEmptyDOMElement();
  });
});
