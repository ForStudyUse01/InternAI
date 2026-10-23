import { cn } from "@/lib/utils";

type AlertProps = {
  type: "success" | "error";
  message: string;
};

export function Alert({ type, message }: AlertProps) {
  return (
    <div
      role={type === "error" ? "alert" : "status"}
      aria-live={type === "error" ? "assertive" : "polite"}
      className={cn("ds-alert", type === "success" ? "ds-alert--success" : "ds-alert--error")}
    >
      {message}
    </div>
  );
}
