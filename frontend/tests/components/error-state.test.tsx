import { render, screen } from "@testing-library/react";
import { ErrorState } from "@/components/shared/error-state";

describe("ErrorState", () => {
  it("renders title and message with alert role", () => {
    render(<ErrorState title="API error" message="Backend is unreachable" />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("API error")).toBeInTheDocument();
    expect(screen.getByText("Backend is unreachable")).toBeInTheDocument();
  });
});
