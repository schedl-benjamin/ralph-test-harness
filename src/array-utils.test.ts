import { describe, it, expect } from "vitest";
import { unique, flatten, chunk, clamp } from "./array-utils.js";

describe("unique", () => {
  it("removes duplicate primitives", () => {
    expect(unique([1, 2, 2, 3, 1])).toEqual([1, 2, 3]);
  });

  it("preserves order", () => {
    expect(unique([3, 1, 2, 1, 3])).toEqual([3, 1, 2]);
  });

  it("handles empty array", () => {
    expect(unique([])).toEqual([]);
  });

  it("handles array with no duplicates", () => {
    expect(unique([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it("works with strings", () => {
    expect(unique(["a", "b", "a", "c"])).toEqual(["a", "b", "c"]);
  });
});

describe("flatten", () => {
  it("flattens one level of nesting", () => {
    expect(flatten([[1, 2], [3, 4]])).toEqual([1, 2, 3, 4]);
  });

  it("handles mixed array with nested and non-nested items", () => {
    expect(flatten([1, [2, 3], 4])).toEqual([1, 2, 3, 4]);
  });

  it("handles empty array", () => {
    expect(flatten([])).toEqual([]);
  });

  it("handles array of empty arrays", () => {
    expect(flatten([[], []])).toEqual([]);
  });

  it("does not flatten deeper than one level", () => {
    expect(flatten([[1, [2, 3]], 4])).toEqual([1, [2, 3], 4]);
  });
});

describe("chunk", () => {
  it("splits array into groups of given size", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("handles array evenly divisible by size", () => {
    expect(chunk([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]]);
  });

  it("handles size larger than array length", () => {
    expect(chunk([1, 2], 5)).toEqual([[1, 2]]);
  });

  it("handles empty array", () => {
    expect(chunk([], 3)).toEqual([]);
  });

  it("works with strings", () => {
    expect(chunk(["a", "b", "c"], 2)).toEqual([["a", "b"], ["c"]]);
  });
});

describe("clamp", () => {
  it("returns value when it is within the range", () => {
    expect(clamp(5, 1, 10)).toBe(5);
  });

  it("returns min when value is below the range", () => {
    expect(clamp(0, 1, 10)).toBe(1);
  });

  it("returns max when value is above the range", () => {
    expect(clamp(11, 1, 10)).toBe(10);
  });

  it("throws when min is greater than max", () => {
    expect(() => clamp(5, 10, 1)).toThrow("min cannot be greater than max");
  });
});
