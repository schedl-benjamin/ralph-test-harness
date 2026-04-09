import { describe, it, expect } from "vitest";
import { add, subtract, multiply, divide, power } from "./calculator.js";

describe("calculator", () => {
  it("adds two numbers", () => {
    expect(add(2, 3)).toBe(5);
  });

  it("subtracts two numbers", () => {
    expect(subtract(5, 3)).toBe(2);
  });

  it("multiplies two numbers", () => {
    expect(multiply(3, 4)).toBe(12);
  });

  it("multiplies by zero", () => {
    expect(multiply(0, 100)).toBe(0);
  });

  it("divides two numbers", () => {
    expect(divide(10, 2)).toBe(5);
  });

  it("throws on divide by zero", () => {
    expect(() => divide(10, 0)).toThrow("Cannot divide by zero");
  });

  it("raises a number to a power", () => {
    expect(power(2, 3)).toBe(8);
  });

  it("returns 1 when the exponent is zero", () => {
    expect(power(5, 0)).toBe(1);
  });

  it("returns 1 for zero to the zero power", () => {
    expect(power(0, 0)).toBe(1);
  });
});
