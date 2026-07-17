// Postgres numeric columns round-trip as strings (drizzle avoids float precision loss).
// We convert to/from integer paise using integer string math only — no parseFloat — so no
// binary-float rounding error can ever touch a money value, for any amount within
// Number.MAX_SAFE_INTEGER (our amounts, max ~1e12 rupees -> ~1e14 paise, sit well inside it).

export function toPaise(decimal: string): number {
  const t = decimal.trim();
  const neg = t.startsWith("-");
  const [whole, fracRaw = ""] = t.replace(/^[-+]/, "").split(".");

  // Reduce the fractional part to paise (2 dp). Inputs are validated to <= 2 dp upstream, but
  // commission rule values allow up to 4 dp — round half-up on the 3rd digit so we never
  // silently drop value in the payer's favour.
  let paiseFrac: number;
  if (fracRaw.length <= 2) {
    paiseFrac = Number((fracRaw + "00").slice(0, 2));
  } else {
    paiseFrac = Number(fracRaw.slice(0, 2)) + (Number(fracRaw[2]) >= 5 ? 1 : 0);
  }

  const paise = Number(whole || "0") * 100 + paiseFrac;
  return neg ? -paise : paise;
}

export function fromPaise(paise: number): string {
  const neg = paise < 0;
  const abs = Math.abs(Math.trunc(paise));
  const whole = Math.floor(abs / 100);
  const frac = abs % 100;
  return `${neg ? "-" : ""}${whole}.${String(frac).padStart(2, "0")}`;
}
