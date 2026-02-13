import zxcvbn from "zxcvbn";

export function validatePassword(password: string): {
  valid: boolean;
  message: string;
  score: number;
} {
  if (password.length < 6) {
    return { valid: false, message: "密码至少需要6个字符", score: 0 };
  }
  const result = zxcvbn(password);
  if (result.score === 0) {
    return { valid: false, message: "密码强度太弱，请使用更复杂的密码", score: 0 };
  }
  return { valid: true, message: "密码强度合格", score: result.score };
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, "");
  return cleaned.length === 10 || cleaned.length === 11;
}
