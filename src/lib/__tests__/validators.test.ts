import { describe, it, expect } from "vitest";
import { validatePassword, validateEmail, validatePhone } from "../validators";

describe("validatePassword", () => {
  it("rejects passwords shorter than 6 characters", () => {
    const result = validatePassword("abc");
    expect(result.valid).toBe(false);
    expect(result.score).toBe(0);
  });

  it("rejects exactly 5 character passwords", () => {
    const result = validatePassword("abcde");
    expect(result.valid).toBe(false);
  });

  it("rejects common passwords (zxcvbn score 0)", () => {
    const result = validatePassword("password");
    expect(result.valid).toBe(false);
    expect(result.score).toBe(0);
  });

  it("rejects '123456' as too weak", () => {
    const result = validatePassword("123456");
    expect(result.valid).toBe(false);
  });

  it("accepts a valid complex password", () => {
    const result = validatePassword("Tr0ub4dor&3x!");
    expect(result.valid).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(1);
  });

  it("accepts a long passphrase", () => {
    const result = validatePassword("correct horse battery staple");
    expect(result.valid).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(1);
  });

  it("returns empty string password as invalid", () => {
    const result = validatePassword("");
    expect(result.valid).toBe(false);
  });
});

describe("validateEmail", () => {
  it("accepts valid email", () => {
    expect(validateEmail("user@example.com")).toBe(true);
  });

  it("accepts email with subdomain", () => {
    expect(validateEmail("user@mail.example.com")).toBe(true);
  });

  it("accepts email with plus sign", () => {
    expect(validateEmail("user+tag@example.com")).toBe(true);
  });

  it("rejects email without @", () => {
    expect(validateEmail("userexample.com")).toBe(false);
  });

  it("rejects email without domain", () => {
    expect(validateEmail("user@")).toBe(false);
  });

  it("rejects email with spaces", () => {
    expect(validateEmail("user @example.com")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(validateEmail("")).toBe(false);
  });

  it("rejects email without TLD", () => {
    expect(validateEmail("user@localhost")).toBe(false);
  });
});

describe("validatePhone", () => {
  it("accepts 10-digit phone number", () => {
    expect(validatePhone("1234567890")).toBe(true);
  });

  it("accepts 11-digit phone number", () => {
    expect(validatePhone("12345678901")).toBe(true);
  });

  it("strips non-digit characters", () => {
    expect(validatePhone("(123) 456-7890")).toBe(true);
  });

  it("strips dashes and spaces", () => {
    expect(validatePhone("123-456-7890")).toBe(true);
  });

  it("rejects too short number", () => {
    expect(validatePhone("12345")).toBe(false);
  });

  it("rejects too long number", () => {
    expect(validatePhone("123456789012")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(validatePhone("")).toBe(false);
  });
});
