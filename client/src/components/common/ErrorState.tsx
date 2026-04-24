export function ErrorState({ message }: { message: string }) {
  return <p className="rounded-lg border border-red-500/30 bg-red-950/30 px-3 py-2 text-sm text-red-300">{message}</p>;
}
