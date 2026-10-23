export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function splitToSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

const REJECTION_LANGUAGE_PATTERN = /not recommended|not suitable|do not recommend|should reject|recommend rejecting/i;

export function isRejectionLanguage(text: string): boolean {
  return REJECTION_LANGUAGE_PATTERN.test(text);
}
