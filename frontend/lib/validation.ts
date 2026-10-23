const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^[6-9]\d{9}$/;
const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export function validateEmail(email: string): boolean {
  return emailRegex.test(email.trim());
}

export function validatePhone(phone: string): boolean {
  return phoneRegex.test(phone.trim());
}

export function validateGST(gst: string): boolean {
  return gstRegex.test(gst.trim().toUpperCase());
}

export function validateUrl(url: string): boolean {
  try {
    const formatted = url.startsWith("http") ? url : `https://${url}`;
    const parsed = new URL(formatted);
    return Boolean(parsed.hostname.includes("."));
  } catch {
    return false;
  }
}

export function validateLinkedInUrl(url: string): boolean {
  if (!url.trim()) return true;
  try {
    const formatted = url.startsWith("http") ? url : `https://${url}`;
    const parsed = new URL(formatted);
    return parsed.hostname.includes("linkedin.com");
  } catch {
    return false;
  }
}

export function getPasswordStrength(password: string): {
  score: number;
  label: string;
} {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) return { score, label: "Weak" };
  if (score <= 3) return { score, label: "Medium" };
  return { score, label: "Strong" };
}
