export const safeToFixed = (value: unknown, digits: number = 2): string => {
  if (value === null || value === undefined) return '-'
  const num = Number(value)
  if (isNaN(num)) return '-'
  return num.toFixed(digits)
}

export const safeNumber = (value: unknown): number => {
  if (value === null || value === undefined) return 0
  const num = Number(value)
  return isNaN(num) ? 0 : num
}
