import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "@/components/icons/status-badge";

describe("StatusBadge", () => {
  test("renders a dedicated warning-toned badge for on_hold, not the generic fallback", () => {
    // Regression: on_hold previously had no STATUS_MAP entry and fell through
    // to the generic muted/CircleDashed fallback used for genuinely unknown
    // statuses, indistinguishable from a real unknown status.
    const { container } = render(<StatusBadge status="on_hold" />);
    const badge = container.querySelector("span");
    expect(badge).toHaveClass("text-[var(--ds-warning)]");
    expect(screen.getByText("on hold")).toBeInTheDocument();
  });
});
