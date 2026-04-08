import { describe, it, expect } from "vitest";
import { add, subtract } from "./calculator.js";

describe("calculator", () => {
  it("adds two numbers", () => {
    expect(add(2, 3)).toBe(5);
  });

  it("subtracts two numbers", () => {
    expect(subtract(5, 3)).toBe(2);
  });
});
