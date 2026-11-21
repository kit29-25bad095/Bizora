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
    const formattedInt = new Intl.NumberFormat("en-US").format(Number(absAmount));
    return `${isNegative ? "-" : ""}${config.symbol}${formattedInt}`;
  }

  const divisor = BigInt(10 ** exp);
  const integerPart = absAmount / divisor;
  const fractionalPart = absAmount % divisor;

  const paddedFraction = fractionalPart.toString().padStart(exp, "0");
  const formattedInteger = new Intl.NumberFormat("en-US").format(Number(integerPart));

  return `${isNegative ? "-" : ""}${config.symbol}${formattedInteger}.${paddedFraction}`;
}

/**
 * Converts a decimal string/number (e.g., from an input or CSV) to a minor-unit BigInt.
 * Avoids IEEE-754 floating-point inaccuracies by splitting string on decimal point.
 */
export function parseToMinorUnits(amountStr: string, exponent = 2): bigint {
  const cleanStr = amountStr.trim().replace(/[^0-9.-]/g, "");
  if (!cleanStr || cleanStr === "-" || cleanStr === ".") return 0n;

  const isNegative = cleanStr.startsWith("-");
  const absStr = isNegative ? cleanStr.slice(1) : cleanStr;

  const [integerPart = "0", rawFraction = ""] = absStr.split(".");
  const fractionPadded = (rawFraction + "0".repeat(exponent)).slice(0, exponent);

  const cleanInteger = integerPart.replace(/^0+(?!$)/, "") || "0";
  const minorUnits = BigInt(cleanInteger) * BigInt(10 ** exponent) + BigInt(fractionPadded);

  return isNegative ? -minorUnits : minorUnits;
}
