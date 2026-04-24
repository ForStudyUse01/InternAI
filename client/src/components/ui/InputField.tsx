import type { InputHTMLAttributes } from "react";

type InputFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string | null;
};

const fieldClass =
  "w-full rounded-xl border border-white/15 bg-white/5 backdrop-blur-md px-3 py-2.5 text-sm text-white placeholder:text-white/35 outline-none transition-all focus:border-[#00FF88]/50 focus:bg-white/10 focus:shadow-[0_0_15px_rgba(0,255,136,0.15)]";

export function InputField({ label, hint, error, id, className = "", ...rest }: InputFieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-white/85">
        {label}
      </label>
      <input id={id} className={`${fieldClass} ${className}`.trim()} {...rest} />
      {hint && !error ? <p className="text-xs text-white/45">{hint}</p> : null}
      {error ? <p className="text-xs text-[#FF4858]">{error}</p> : null}
    </div>
  );
}
