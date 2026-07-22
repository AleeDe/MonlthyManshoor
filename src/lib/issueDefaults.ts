// Auto-generated title/description for magazine issues.
// Pattern: Title = "Manshoor July 2026"
//          Description = "جلد 5، شمارہ 05، جولائی 2026ء"
// Shumara (issue no.) = month number; Jild (volume) supplied by the admin.

export const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const MONTHS_UR = [
  'جنوری', 'فروری', 'مارچ', 'اپریل', 'مئی', 'جون',
  'جولائی', 'اگست', 'ستمبر', 'اکتوبر', 'نومبر', 'دسمبر',
];

export function defaultTitle(month: number, year: number): string {
  return `Manshoor ${MONTHS_EN[month - 1]} ${year}`;
}

export function defaultDescription(
  jild: number,
  month: number,
  year: number,
  shumara: number = month
): string {
  return `جلد ${jild}، شمارہ ${String(shumara).padStart(2, '0')}، ${MONTHS_UR[month - 1]} ${year}ء`;
}
