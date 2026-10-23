import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ApplicationPipelineStepper } from "@/components/dashboard/intern/application-pipeline-stepper";

describe("ApplicationPipelineStepper", () => {
  test("marks steps up to and including the current stage as done", () => {
    render(<ApplicationPipelineStepper status="shortlisted" />);
    const current = screen.getByText("Shortlisted").closest('[role="listitem"]');
    expect(current).toHaveAttribute("aria-current", "step");
    expect(screen.getAllByText("(completed)", { exact: false }).length).toBeGreaterThanOrEqual(3); // Applied, Under Review, Shortlisted
  });

  test("shows a rejected banner instead of the step grid", () => {
    render(<ApplicationPipelineStepper status="rejected" />);
    expect(screen.getByText("Application Rejected")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  test("shows a withdrawn banner instead of the step grid", () => {
    render(<ApplicationPipelineStepper status="withdrawn" />);
    expect(screen.getByText("Application Withdrawn")).toBeInTheDocument();
  });

  // Regression: on_hold has no PIPELINE_STEPS entry, so before the fix it
  // fell through to activeIdx === -1 -> resolvedIdx 0, silently rendering
  // the step grid as if the application had reset all the way back to just
  // "Applied" -- misrepresenting real progress (e.g. an application on hold
  // after the Technical Round would look identical to a brand-new one).
  test("shows an On Hold banner instead of misrepresenting progress as reset to step 1", () => {
    render(<ApplicationPipelineStepper status="on_hold" />);
    expect(screen.getByText("Application On Hold")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  test("is case-insensitive for the on_hold status", () => {
    render(<ApplicationPipelineStepper status="ON_HOLD" />);
    expect(screen.getByText("Application On Hold")).toBeInTheDocument();
  });
});
