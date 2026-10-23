import { describe, test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

describe("ConfirmDialog", () => {
  test("renders nothing when open is false", () => {
    render(
      <ConfirmDialog open={false} title="Delete item" onConfirm={vi.fn()} onCancel={vi.fn()} />
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("renders title, description, and default button labels when open", () => {
    render(
      <ConfirmDialog
        open
        title="Delete this application?"
        description="This action cannot be undone."
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Delete this application?")).toBeInTheDocument();
    expect(screen.getByText("This action cannot be undone.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  test("calls onConfirm when the confirm button is clicked", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<ConfirmDialog open title="Confirm?" onConfirm={onConfirm} onCancel={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  test("calls onCancel when the cancel button is clicked", async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(<ConfirmDialog open title="Confirm?" onConfirm={vi.fn()} onCancel={onCancel} />);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test("calls onCancel when the Escape key is pressed", () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog open title="Confirm?" onConfirm={vi.fn()} onCancel={onCancel} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test("disables both buttons and shows a busy label while busy", () => {
    render(<ConfirmDialog open busy title="Confirm?" confirmLabel="Delete" onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Working…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });

  test("does not call onCancel on Escape while busy", () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog open busy title="Confirm?" onConfirm={vi.fn()} onCancel={onCancel} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onCancel).not.toHaveBeenCalled();
  });

  test("uses custom confirm/cancel labels when provided", () => {
    render(
      <ConfirmDialog
        open
        title="Withdraw application?"
        confirmLabel="Withdraw"
        cancelLabel="Keep application"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: "Withdraw" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Keep application" })).toBeInTheDocument();
  });
});
