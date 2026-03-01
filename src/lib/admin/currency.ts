const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatUsdFromCents(valueCents: number): string {
  if (!Number.isFinite(valueCents)) {
    return usdFormatter.format(0);
  }

  return usdFormatter.format(valueCents / 100);
}
