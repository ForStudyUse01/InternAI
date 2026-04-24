export function EmptyState({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-dashed border-gray-600 bg-app-bg/40 p-4 text-sm text-gray-400">{message}</p>
  );
}
