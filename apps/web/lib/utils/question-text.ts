/**
 * Split a translated question string into title + description.
 * Splits on the first `?` or `.` found; returns the full text as title if neither exists.
 */
export function splitQuestionText(text: string): { title: string; description: string } {
  const splitAt = text.includes("?") ? "?" : text.includes(".") ? "." : null;
  if (!splitAt) return { title: text.trim(), description: "" };
  const title = `${text.split(splitAt)[0]}${splitAt}`.trim();
  const description = text.slice(text.indexOf(splitAt) + 1).trim();
  return { title, description };
}
