import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: '£',
  USD: '$',
  EUR: '€',
  AUD: 'A$',
  CAD: 'C$',
  NZD: 'NZ$',
  JPY: '¥',
  CHF: 'CHF',
}

export function useCurrency() {
  const { data: settings = {} } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then(r => r.data),
    staleTime: 5 * 60 * 1000,
  })

  const code: string = (settings as any).currency || 'GBP'
  const symbol = CURRENCY_SYMBOLS[code] ?? code

  function fmt(value: number) {
    return `${symbol}${value.toLocaleString()}`
  }

  function fmtFixed(value: number, decimals = 2) {
    return `${symbol}${value.toFixed(decimals)}`
  }

  return { symbol, code, fmt, fmtFixed }
}
