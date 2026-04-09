export function reverse(str: string): string {
  return str.split("").reverse().join("");
}

export function capitalize(str: string): string {
  if (str.length === 0) return str;
  return str[0].toUpperCase() + str.slice(1).toLowerCase();
}

export function isPalindrome(str: string): boolean {
  const cleaned = str.toLowerCase().replace(/[^a-z0-9]/g, "");
  return cleaned === reverse(cleaned);
}

export function truncate(str: string, maxLen: number): string {
  if (maxLen < 3) {
    throw new Error("maxLen must be at least 3");
  }

  if (str.length <= maxLen) {
    return str;
  }

  return str.slice(0, maxLen - 3) + "...";
}
