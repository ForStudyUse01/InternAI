import { cn } from "@/lib/utils";

export function Table({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className="ds-table-wrap">
      <table className={cn("ds-table", className)}>{children}</table>
    </div>
  );
}

export function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      <tr>{children}</tr>
    </thead>
  );
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function TableRow({ className, children }: { className?: string; children: React.ReactNode }) {
  return <tr className={className}>{children}</tr>;
}

export function TableCell({
  className,
  children,
  as = "td"
}: {
  className?: string;
  children: React.ReactNode;
  as?: "td" | "th";
}) {
  const Comp = as as "td";
  return <Comp className={className}>{children}</Comp>;
}
