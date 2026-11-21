/**
 * CURRENCY & MINOR-UNIT FORMATTING ENGINE
 * Pure deterministic functions converting integer minor units to user-facing localized currency strings.
 */

export interface CurrencyConfig {
  code: string;
  symbol: string;
  exponent: number;
}

export const CURRENCY_CONFIGS: Record<string, CurrencyConfig> = {
  USD: { code: "USD", symbol: "$", exponent: 2 },
  EUR: { code: "EUR", symbol: "€", exponent: 2 },
  GBP: { code: "GBP", symbol: "£", exponent: 2 },
  INR: { code: "INR", symbol: "₹", exponent: 2 },
  JPY: { code: "JPY", symbol: "¥", exponent: 0 },
  BHD: { code: "BHD", symbol: "BD ", exponent: 3 },
  KWD: { code: "KWD", symbol: "KD ", exponent: 3 },
  AUD: { code: "AUD", symbol: "A$", exponent: 2 },
  CAD: { code: "CAD", symbol: "C$", exponent: 2 },
};

// Cached module-level integer formatter for high-throughput sub-millisecond conversion
const defaultNumberFormatter = new Intl.NumberFormat("en-US");

/**
 * Formats a minor-unit bigint into a formatted currency string.
 * Example: formatMinorUnits(125050n, 'USD', 2) => "$1,250.50"
 */
export function formatMinorUnits(
  amountMinorUnits: bigint,
  currencyCode = "USD",
  exponent = 2
): string {
  const isNegative = amountMinorUnits < 0n;
  const absAmount = isNegative ? -amountMinorUnits : amountMinorUnits;
  const config = CURRENCY_CONFIGS[currencyCode.toUpperCase()] ?? {
    code: currencyCode,
    symbol: `${currencyCode} `,
    exponent,
  };

  const exp = config.exponent;

  if (exp === 0) {
    const formattedInt = defaultNumberFormatter.format(Number(absAmount));
    return `${isNegative ? "-" : ""}${config.symbol}${formattedInt}`;
  }

  const divisor = BigInt(10 ** exp);
  const integerPart = absAmount / divisor;
  const fractionalPart = absAmount % divisor;

  const paddedFraction = fractionalPart.toString().padStart(exp, "0");
  const formattedInteger = defaultNumberFormatter.format(Number(integerPart));

  return `${isNegative ? "-" : ""}${config.symbol}${formattedInteger}.${paddedFraction}`;
}

/**
 * Converts a decimal string/number (e.g., from an input or CSV) to a minor-unit BigInt.
 * Avoids IEEE-754 floating-point inaccuracies by splitting string on decimal point.
 * Supports passing currency code (e.g. 'USD', 'JPY') or numeric exponent (e.g. 2, 0).
 */
export function parseToMinorUnits(
  amountStr: string,
  currencyOrExponent: string | number = 2,
  explicitExponent?: number
): bigint {
  const cleanStr = amountStr.trim().replace(/[^0-9.-]/g, "");
  if (!cleanStr || cleanStr === "-" || cleanStr === ".") return 0n;

  let exp = 2;
  if (typeof explicitExponent === "number") {
    exp = explicitExponent;
  } else if (typeof currencyOrExponent === "number") {
    exp = currencyOrExponent;
  } else if (typeof currencyOrExponent === "string") {
    exp = CURRENCY_CONFIGS[currencyOrExponent.toUpperCase()]?.exponent ?? 2;
  }

  const isNegative = cleanStr.startsWith("-");
  const absStr = isNegative ? cleanStr.slice(1) : cleanStr;

  const [integerPart = "0", rawFraction = ""] = absStr.split(".");
  const cleanInteger = integerPart.replace(/^0+(?!$)/, "") || "0";

  if (exp === 0) {
    const minorUnits = BigInt(cleanInteger);
    return isNegative ? -minorUnits : minorUnits;
  }

  const fractionPadded = (rawFraction + "0".repeat(exp)).slice(0, exp);
  const fractionBigInt = fractionPadded ? BigInt(fractionPadded) : 0n;
  const minorUnits = BigInt(cleanInteger) * BigInt(10 ** exp) + fractionBigInt;

  return isNegative ? -minorUnits : minorUnits;
}
