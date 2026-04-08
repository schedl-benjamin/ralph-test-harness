import { describe, it, expect } from "vitest";
import { reverse, capitalize } from "./string-utils.js";

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
