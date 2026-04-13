export function EmptyState({ message }: { message: string }) {
  return <p className="rounded-md border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">{message}</p>;
}
