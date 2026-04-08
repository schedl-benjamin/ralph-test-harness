export function reverse(str: string): string {
  return str.split("").reverse().join("");
}

export function capitalize(str: string): string {
  if (str.length === 0) return str;
  return str[0].toUpperCase() + str.slice(1).toLowerCase();
}
