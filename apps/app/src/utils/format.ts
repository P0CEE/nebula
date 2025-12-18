export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const postDate = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - postDate.getTime()) / 1000);

  if (diffInSeconds < 60) return `${diffInSeconds}s`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;

  return postDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function formatDate(date: Date | string, locale = "en-US"): string {
  return new Date(date).toLocaleDateString(locale);
}
