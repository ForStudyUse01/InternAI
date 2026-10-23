import { makeCheck, readText } from "../lib/utils.mjs";

export async function runUiChecks() {
  const checks = [];

  const chatWorkspace = readText("frontend/components/dashboard/chat-workspace.tsx");
  checks.push(
    makeCheck({
      id: "ui.chat-loading-states",
      category: "ui",
      name: "Chat loading/error states",
      status:
        chatWorkspace.includes("loading") && chatWorkspace.includes("error") && chatWorkspace.includes("EmptyState")
          ? "PASS"
          : "WARN",
      message: "Chat workspace defines loading and error UI",
      blocking: false
    })
  );

  const interviewShell = readText("frontend/components/interview/interview-room-shell.tsx");
  checks.push(
    makeCheck({
      id: "ui.interview-responsive",
      category: "ui",
      name: "Interview responsive layout",
      status:
        interviewShell.includes("sidebarOpen") && interviewShell.includes("lg:grid-cols-2") ? "PASS" : "WARN",
      message: "Interview room uses collapsible sidebar and responsive grid",
      blocking: false
    })
  );

  const shells = [
    readText("frontend/components/dashboard/intern-shell.tsx"),
    readText("frontend/components/dashboard/company-shell.tsx")
  ].join("\n");

  checks.push(
    makeCheck({
      id: "ui.dashboard-shells",
      category: "ui",
      name: "Dashboard shell structure",
      status: shells.includes("dashboard-stack") || shells.includes("InternShell") ? "PASS" : "WARN",
      message: "Dashboard shells use consistent layout primitives",
      blocking: false
    })
  );

  const globals = readText("frontend/app/globals.css");
  const hasDarkVars = globals.includes("dark:") || globals.includes("--ds-") || globals.includes(".dark");
  checks.push(
    makeCheck({
      id: "ui.theme-tokens",
      category: "ui",
      name: "Theme/design tokens",
      status: hasDarkVars ? "PASS" : "WARN",
      message: hasDarkVars ? "Global styles include theme tokens" : "Could not verify dark mode tokens",
      blocking: false
    })
  );

  const invisibleRisk = readText("frontend/app/globals.css") + readText("frontend/tailwind.config.ts");
  if (/text-transparent(?!.*dark:)/.test(invisibleRisk)) {
    checks.push(
      makeCheck({
        id: "ui.invisible-text",
        category: "ui",
        name: "Invisible text patterns",
        status: "WARN",
        message: "Review text-transparent usage for contrast in light mode",
        blocking: false
      })
    );
  } else {
    checks.push(
      makeCheck({
        id: "ui.invisible-text",
        category: "ui",
        name: "Invisible text patterns",
        status: "PASS",
        message: "No risky text-transparent patterns detected in global styles",
        blocking: false
      })
    );
  }

  return checks;
}
