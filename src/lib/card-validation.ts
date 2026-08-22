// Client-side-only format validation for the (simulated) checkout payment
// form. No card data is ever transmitted to the server — see docs/security.md.

export function luhn(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  let sum = 0;
  let isEven = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i]);
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    isEven = !isEven;
  }
  return digits.length >= 13 && sum % 10 === 0;
}

export function formatCardNumber(value: string): string {
  return value
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

export function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

export function isExpiryValid(value: string, now: Date = new Date()): boolean {
  const match = value.match(/^(\d{2})\/(\d{2})$/);
  if (!match) return false;
  const month = parseInt(match[1]);
  const year = parseInt(match[2]) + 2000;
  if (month < 1 || month > 12) return false;
  return year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1);
}
