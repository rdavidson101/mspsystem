export function ticketRef(number: number): string {
  return `INC-${String(number).padStart(5, '0')}`
}

export function changeRef(number: number): string {
  return `RFC-${String(number).padStart(5, '0')}`
}

export function projectRef(number: number): string {
  return `PRJ-${String(number).padStart(5, '0')}`
}
