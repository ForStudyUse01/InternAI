// Runs before paint so the correct theme/appearance attributes are on <html>
// before hydration — avoids a flash of the default theme. Kept as a tiny
// inline script (no next-themes dependency) mirroring the ThemeProvider's
// own storage-key contract in lib/theme/theme-config.ts.
const INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("internai.theme")||"ocean";var a=localStorage.getItem("internai.appearance")||"dark";var r=document.documentElement;r.setAttribute("data-theme",t);r.setAttribute("data-appearance",a);r.classList.toggle("dark",a==="dark");}catch(e){}})();`;

export function ThemeInitScript({ nonce }: { nonce?: string }) {
  return (
    // A plain inline <script> rather than next/script's beforeInteractive.
    // Two reasons, both load-bearing:
    //
    // 1. suppressHydrationWarning. CSP's "nonce hiding" rule requires the
    //    browser to move the nonce into an internal slot and blank the
    //    content attribute the moment the element is parsed (it stops CSS
    //    attribute selectors from exfiltrating the nonce). So the
    //    server-rendered attribute always reads back as "" while the client
    //    still renders the real value, and React reports a mismatch it can
    //    never reconcile. The nonce itself is intact — script.nonce still
    //    returns it and CSP still enforces it — so the difference is expected
    //    and declaring it is the only correct resolution. next/script does
    //    not forward suppressHydrationWarning to the element it renders, so
    //    the warning is unsuppressable through that wrapper.
    // 2. It genuinely runs earlier. beforeInteractive defers through Next's
    //    self.__next_s queue; a synchronous inline script in <head> executes
    //    during head parse, which is what anti-flash theming actually wants.
    //
    // Dropping the nonce instead would be wrong: Next only auto-nonces the
    // scripts it emits itself (the JSON-LD tags in layout.tsx carry none), so
    // this script would lose its nonce and CSP would block the init entirely.
    <script
      nonce={nonce}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: INIT_SCRIPT }}
    />
  );
}
