import { GoogleGenerativeAI, type ResponseSchema, SchemaType } from "@google/generative-ai";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import type { Doctor, Shift } from "../types";
import { validateShifts } from "./validation";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

/** Google retires model IDs; override with VITE_GEMINI_MODEL if needed (e.g. gemini-flash-latest). */
const GEMINI_MODEL =
  typeof import.meta.env.VITE_GEMINI_MODEL === "string" &&
  import.meta.env.VITE_GEMINI_MODEL.trim().length > 0
    ? import.meta.env.VITE_GEMINI_MODEL.trim()
    : "gemini-2.0-flash";

const schema: ResponseSchema = {
  description: "Lista de turnos sugeridos",
  type: SchemaType.OBJECT,
  properties: {
    shifts: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          dateStr: { type: SchemaType.STRING, description: "YYYY-MM-DD" },
          type: { type: SchemaType.STRING, description: "day o night" },
          doctorId: { type: SchemaType.STRING, description: "ID del médico" }
        },
        required: ["dateStr", "type", "doctorId"]
      }
    },
    reasoning: { type: SchemaType.STRING, description: "Explicación breve de por qué esta distribución es equitativa" }
  },
  required: ["shifts"]
};

/**
 * Greedy filter: keep AI suggestions that still pass validateShifts when merged
 * with existing shifts (same rules as autocomplete).
 */
function filterAiShiftsByValidation(
  existing: Shift[],
  proposed: Omit<Shift, "id">[],
  doctors: Doctor[]
): { shifts: Omit<Shift, "id">[]; skipped: number } {
  const sorted = [...proposed].sort((a, b) => {
    const c = a.dateStr.localeCompare(b.dateStr);
    if (c !== 0) return c;
    return a.type === "night" ? -1 : 1;
  });

  const accepted: Omit<Shift, "id">[] = [];
  const working: Shift[] = [...existing];
  let skipped = 0;
  let idx = 0;

  for (const raw of sorted) {
    if (
      working.some(
        (s) =>
          s.dateStr === raw.dateStr &&
          s.type === raw.type &&
          s.doctorId === raw.doctorId
      )
    ) {
      skipped++;
      continue;
    }
    const tempId = `ai-temp-${idx++}`;
    const trial: Shift[] = [...working, { ...raw, id: tempId }];
    const errs = validateShifts(trial, doctors).filter((e) => e.type === "error");
    if (errs.length === 0) {
      working.push({ ...raw, id: tempId });
      accepted.push(raw);
    } else {
      skipped++;
    }
  }

  return { shifts: accepted, skipped };
}

export const generateAISchedule = async (
  currentMonth: Date,
  doctors: Doctor[],
  existingShifts: Shift[]
): Promise<{ shifts: Omit<Shift, 'id'>[], reasoning: string }> => {
  if (!API_KEY || API_KEY === "INGRESA_TU_API_KEY_AQUI") {
    throw new Error("Por favor, configura tu VITE_GEMINI_API_KEY en el archivo .env.local");
  }

  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });

  const monthName = format(currentMonth, 'MMMM yyyy');
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const doctorsContext = doctors.map((d) => ({
    id: d.id,
    name: d.name,
    maxMonthlyShifts: d.maxMonthlyShifts,
    maxMonthlyNights: d.maxMonthlyNights,
    shiftHours: d.shiftHours,
    fixedShiftType: d.fixedShiftType ?? null,
    noWeekends: !!d.noWeekends,
    onlyWeekends: !!d.onlyWeekends,
    onlyEvenDays: !!d.onlyEvenDays,
    onlyOddDays: !!d.onlyOddDays,
    isFixed: !!d.isFixed,
    fixedDays: d.fixedDays ?? [],
    blackoutDates: d.blackoutDates ?? [],
    partnerId: d.partnerId ?? null
  }));

  const approxNights = days.length;
  const eligibleForNight = doctors.filter((d) => d.fixedShiftType !== "day").length;
  const targetNightsPerDoc =
    eligibleForNight > 0 ? Math.floor(approxNights / eligibleForNight) : 0;

  const prompt = `
Eres un experto en gestión de turnos médicos. Completa el cuadro del mes **${monthName}** de forma **equilibrada** y cumpliendo **todas** las reglas (el sistema descartará cualquier turno que las rompa).

REGLAS OBLIGATORIAS (mismas que validación y autocompletar):
1. Cuotas por día:
   - Lun–Vie: exactamente 7 turnos "day" y 1 "night" por fecha (tras sumar existentes + nuevos).
   - Sáb–Dom: 4 "day" y 1 "night" por fecha.
2. Tras un turno "night", el mismo médico no puede tener otro turno el día siguiente ni el siguiente (descanso mínimo 48h; el día +2 es el primero permitido).
3. No dos "night" seguidos para el mismo médico (salvo fixedShiftType "night" explícito en el perfil).
4. No prolongar bloques de días consecutivos con turno más allá de lo que permite el validador (evita 4+ días seguidos o patrones que el sistema marque error).
5. maxMonthlyShifts: no superar por médico. maxMonthlyNights: si viene en el perfil numérico, no superar noches/mes.
6. fixedShiftType "day": solo asignar type "day". "night": solo "night". null/omitido: ambos permitidos si el resto lo permite.
7. noWeekends true: nunca sábado ni domingo para ese médico.
8. onlyWeekends true: solo sábados y domingos para ese médico.
9. onlyEvenDays: solo fechas cuyo **día del mes** sea par (2,4,6…). onlyOddDays: solo día del mes impar (1,3,5…).
10. isFixed + fixedDays: si isFixed es true y fixedDays no vacío, solo fechas cuyo día de semana (0=dom…6=sáb) esté en fixedDays.
11. blackoutDates: nunca asignar ese médico en esas fechas (YYYY-MM-DD).
12. partnerId: si dos médicos son pareja, intenta repartir carga similar entre ambos (mismo número aproximado de días laborados y noches si pueden).

EQUIDAD (prioridad alta):
- Reparte **noches** lo más parejo posible entre médicos que pueden hacer noche (no "solo día", respeta maxMonthlyNights).
- Reparte **fines de semana** (sáb/dom de día) entre quienes pueden trabajar fin de semana.
- Evita que un mismo médico acumule muchos más turnos totales que otro si ambos tienen límites similares.
- Orientación numérica: ~${approxNights} noches en el mes; hay ${eligibleForNight} médicos elegibles para noche; apunta a ~${targetNightsPerDoc} noches por médico si cuadra con sus límites y restricciones.

ESTADO ACTUAL:
- Médicos (JSON): ${JSON.stringify(doctorsContext)}
- Turnos ya asignados: ${JSON.stringify(
    existingShifts.map((s) => ({ date: s.dateStr, type: s.type, doctorId: s.doctorId }))
  )}
- Fechas del mes: ${days.map((d) => format(d, "yyyy-MM-dd")).join(", ")}

TAREA:
Devuelve **solo turnos nuevos** (no repitas los ya listados) en JSON con "shifts" y "reasoning".
En "reasoning" resume en 2–4 frases cómo repartiste noches y fines de semana para equidad.
`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  const parsed = JSON.parse(response.text()) as {
    shifts: Omit<Shift, "id">[];
    reasoning?: string;
  };

  const raw = Array.isArray(parsed.shifts) ? parsed.shifts : [];
  const { shifts, skipped } = filterAiShiftsByValidation(existingShifts, raw, doctors);
  let reasoning =
    typeof parsed.reasoning === "string" && parsed.reasoning.trim().length > 0
      ? parsed.reasoning.trim()
      : "Distribución sugerida aplicando reglas del sistema.";

  if (skipped > 0) {
    reasoning += ` Se omitieron ${skipped} sugerencia(s) que violaban reglas de validación (descansos, cuotas, límites o disponibilidad).`;
  }

  return { shifts, reasoning };
};
