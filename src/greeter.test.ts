import { describe, it, expect } from "vitest";
import { greet, farewell } from "./greeter.js";

describe("greeter", () => {
  it("greets by name", () => {
    expect(greet("World")).toBe("Hello, World!");
  });

  it("farewells by name", () => {
    expect(farewell("World")).toBe("Goodbye, World!");
  });
});
