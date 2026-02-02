export function formatDate(value?: string | Date | null): string {
  if (!value) {
    return "";
  }
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString();
}
