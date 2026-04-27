import type { Doctor } from '../types';

const DATE_LINE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validates doctor profile fields that must stay consistent for
 * autocomplete, IA, and validateShifts.
 */
export function validateDoctorProfileConstraints(doc: Doctor): string[] {
  const issues: string[] = [];

  if (!doc.name.trim()) {
    issues.push('El nombre no puede estar vacío.');
  }

  if (!Number.isFinite(doc.maxMonthlyShifts) || doc.maxMonthlyShifts < 1) {
    issues.push('Turnos máximos por mes debe ser al menos 1.');
  }

  if (
    !Number.isFinite(doc.shiftHours) ||
    doc.shiftHours < 1 ||
    doc.shiftHours > 24
  ) {
    issues.push('Horas por turno debe estar entre 1 y 24.');
  }

  const mn = doc.maxMonthlyNights;
  if (mn !== undefined) {
    if (!Number.isFinite(mn) || mn < 0) {
      issues.push('Noches máximas por mes debe ser 0 o mayor.');
    } else if (mn > doc.maxMonthlyShifts) {
      issues.push('Noches máximas no puede superar los turnos máximos por mes.');
    }
  }

  if (doc.noWeekends && doc.onlyWeekends) {
    issues.push(
      'No puede combinarse "No trabaja fines de semana" con "Solo fines de semana".'
    );
  }

  if (doc.onlyEvenDays && doc.onlyOddDays) {
    issues.push(
      'No puede combinarse "Solo días pares" con "Solo días impares".'
    );
  }

  if (doc.blackoutDates) {
    for (const line of doc.blackoutDates) {
      if (!DATE_LINE.test(line)) {
        issues.push(`Fecha inválida en no disponibles: "${line}" (usa YYYY-MM-DD).`);
      }
    }
  }

  return issues;
}

/**
 * Parses blackout lines from textarea; empty lines skipped.
 */
export function parseBlackoutLines(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}
