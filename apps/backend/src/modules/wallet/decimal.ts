// Postgres numeric columns round-trip as strings (drizzle avoids float precision loss).
// We convert to integer paise for arithmetic — safer than floating point for money math,
// without pulling in a bignum library for values well inside Number.MAX_SAFE_INTEGER.

export function toPaise(decimal: string): number {
  return Math.round(parseFloat(decimal) * 100);
}

export function fromPaise(paise: number): string {
  return (paise / 100).toFixed(2);
}
