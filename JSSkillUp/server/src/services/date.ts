/** Локальная дата в формате YYYY-MM-DD. Все «дни» в приложении считаются по часовому поясу машины. */
export function toDayString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function today(): string {
  return toDayString(new Date());
}

export function addDays(day: string, amount: number): string {
  const [year, month, date] = day.split('-').map(Number);
  const result = new Date(year ?? 1970, (month ?? 1) - 1, date ?? 1);
  result.setDate(result.getDate() + amount);
  return toDayString(result);
}

export function daysBetween(from: string, to: string): number {
  const parse = (day: string): number => {
    const [year, month, date] = day.split('-').map(Number);
    return Date.UTC(year ?? 1970, (month ?? 1) - 1, date ?? 1);
  };
  return Math.round((parse(to) - parse(from)) / 86_400_000);
}
