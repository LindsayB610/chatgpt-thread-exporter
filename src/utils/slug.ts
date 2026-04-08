export function slugify(input: string, maxLength = 60): string {
  const slug = input
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return slug.slice(0, maxLength).replace(/-+$/g, "") || "untitled-chat";
}
