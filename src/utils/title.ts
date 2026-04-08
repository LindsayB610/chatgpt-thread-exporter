export function deriveTitle(explicitTitle?: string): string {
  const value = explicitTitle?.trim();
  return value && value.length > 0 ? value : "untitled-chat";
}
