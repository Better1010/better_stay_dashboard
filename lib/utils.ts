import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format as DD/MM/YYYY for display. */
export function formatDateDDMMYYYY(value: string | Date | null | undefined): string {
  if (!value) return '';
  const d =
    typeof value === 'string'
      ? new Date(value.includes('T') ? value : `${value}T00:00:00`)
      : value;
  if (Number.isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/** Convert YYYY-MM-DD (or ISO string) to DD/MM/YYYY. */
export function isoToDDMMYYYY(iso: string): string {
  if (!iso) return '';
  const part = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(part)) return formatDateDDMMYYYY(iso);
  const [year, month, day] = part.split('-');
  return `${day}/${month}/${year}`;
}

/** Parse DD/MM/YYYY to YYYY-MM-DD for API storage. Returns null if invalid. */
export function parseDDMMYYYYToISO(input: string): string | null {
  const match = input.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
