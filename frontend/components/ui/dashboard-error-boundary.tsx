"use client";

import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

type Props = { children: ReactNode };
type State = { hasError: boolean; message?: string };

export class DashboardErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" className="container-shell flex min-h-[50vh] flex-col items-center justify-center py-16 text-center">
          <p className="text-lg font-bold text-[var(--ds-text)]">Something went wrong</p>
          <p className="mt-2 max-w-md text-sm text-[var(--ds-muted)]">
            {this.state.message || "An unexpected error occurred in this dashboard view."}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => this.setState({ hasError: false })}>
              Try again
            </Button>
            <Button type="button" variant="primary" size="sm" onClick={() => window.location.reload()}>
              Reload page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
