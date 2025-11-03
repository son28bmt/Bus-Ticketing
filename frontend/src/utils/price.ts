export function formatPrice(price: number): string {
  const safe = Number.isFinite(price) ? price : 0;
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(safe);
}

export function formatPriceShort(price: number): string {
  if (price >= 1000000) {
    return `${(price / 1000000).toFixed(1)}M VND`;
  }
  if (price >= 1000) {
    return `${(price / 1000).toFixed(0)}K VND`;
  }
  return `${price} VND`;
}