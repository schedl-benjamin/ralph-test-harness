import { describe, it, expect } from "vitest";
import { greet } from "./greeter.js";

describe("greeter", () => {
  it("greets by name", () => {
    expect(greet("World")).toBe("Hello, World!");
  });
});
