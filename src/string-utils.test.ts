import { describe, it, expect } from "vitest";
import { reverse, capitalize, isPalindrome, truncate } from "./string-utils.js";

describe("reverse", () => {
  it("reverses a string", () => {
    expect(reverse("hello")).toBe("olleh");
  });

  it("handles empty string", () => {
    expect(reverse("")).toBe("");
  });

  it("handles single character", () => {
    expect(reverse("a")).toBe("a");
  });
});

describe("capitalize", () => {
  it("capitalizes first letter and lowercases the rest", () => {
    expect(capitalize("hello")).toBe("Hello");
  });

  it("lowercases already-uppercase string", () => {
    expect(capitalize("WORLD")).toBe("World");
  });

  it("handles empty string", () => {
    expect(capitalize("")).toBe("");
  });

  it("handles single character", () => {
    expect(capitalize("a")).toBe("A");
  });
});

describe("isPalindrome", () => {
  it("returns true for a simple palindrome", () => {
    expect(isPalindrome("racecar")).toBe(true);
  });

  it("returns false for a non-palindrome", () => {
    expect(isPalindrome("hello")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(isPalindrome("Racecar")).toBe(true);
  });

  it("ignores non-alphanumeric characters", () => {
    expect(isPalindrome("A man, a plan, a canal: Panama")).toBe(true);
  });

  it("handles empty string", () => {
    expect(isPalindrome("")).toBe(true);
  });

  it("handles single character", () => {
    expect(isPalindrome("a")).toBe(true);
  });
});

describe("truncate", () => {
  it("returns the original string when it fits within maxLen", () => {
    expect(truncate("hello", 5)).toBe("hello");
  });

  it("truncates longer strings and appends an ellipsis", () => {
    expect(truncate("hello world", 8)).toBe("hello...");
  });

  it("throws when maxLen is less than 3", () => {
    expect(() => truncate("hello", 2)).toThrowError();
  });
});
