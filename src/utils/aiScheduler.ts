import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import type { Doctor, Shift } from "../types";
import { validateShifts } from "./validation";

const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

const OPENROUTER_MODEL =
  typeof import.meta.env.VITE_OPENROUTER_MODEL === "string" &&
  import.meta.env.VITE_OPENROUTER_MODEL.trim().length > 0
    ? import.meta.env.VITE_OPENROUTER_MODEL.trim()
    : "google/gemini-2.5-flash"; // Por defecto usa el más rápido/barato de OpenRouter

function filterAiShiftsOptimization(
  proposed: Omit<Shift, "id">[],
  doctors: Doctor[]
): { shifts: Omit<Shift, "id">[]; skipped: number } {
  const sorted = [...proposed].sort((a, b) => {
    const c = a.dateStr.localeCompare(b.dateStr);
    if (c !== 0) return c;
    return a.type === "night" ? -1 : 1;
  });

  const accepted: Omit<Shift, "id">[] = [];
  const working: Shift[] = [];
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
    throw new Error("Por favor, configura tu VITE_OPENROUTER_API_KEY en el archivo .env.local");
  }

  const monthName = format(currentMonth, 'MMMM yyyy');
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Create a mapping from real doctor ID to a short 1-character ID to save massive amounts of tokens
  const idMap: Record<string, string> = {};
  const reverseIdMap: Record<string, string> = {};
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  
  doctors.forEach((d, index) => {
    const shortId = letters[index % letters.length];
    idMap[d.id] = shortId;
    reverseIdMap[shortId] = d.id;
  });

  const doctorsContext = doctors.map((d) => ({
    id: idMap[d.id], // Usa el ID corto
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
    partnerId: d.partnerId ? idMap[d.partnerId] : null
  }));

  const approxNights = days.length;
  const eligibleForNight = doctors.filter((d) => d.fixedShiftType !== "day").length;
  const targetNightsPerDoc =
    eligibleForNight > 0 ? Math.floor(approxNights / eligibleForNight) : 0;

  const prompt = `
Eres un experto en gestión de turnos médicos. Tu objetivo es **REORGANIZAR y OPTIMIZAR** el cuadro completo del mes de **${monthName}** para que sea lo más **equitativo** posible, cumpliendo estrictamente con todas las reglas de validación.
Toma como base los turnos que ya están asignados actualmente, pero **tienes total libertad para eliminarlos, moverlos o reasignarlos** a otros médicos para mejorar la equidad en los descansos, carga laboral y guardias de noche/fin de semana.

REGLAS OBLIGATORIAS (Si rompes una, el sistema descartará el turno):
1. Cuotas diarias estrictas (¡Deberás generar exactamente esta cantidad de turnos!):
   - Lunes a Viernes: exactamente 7 turnos tipo "day" y 1 tipo "night" por fecha.
   - Sábados y Domingos: exactamente 4 turnos tipo "day" y 1 tipo "night" por fecha.
2. Descanso post-guardia: Tras un turno "night", ese médico NO puede tener otro turno (ni day ni night) al día siguiente ni al posterior (descanso mínimo 48h).
3. No dos "night" seguidos para el mismo médico.
4. No prolongar bloques de días consecutivos más allá de 3-4 días sin descanso.
5. maxMonthlyShifts y maxMonthlyNights: No superar el límite de turnos o noches definido para cada médico.
6. fixedShiftType: Si un médico tiene "day", NO puede hacer "night" y viceversa.
7. noWeekends: Si es true, NUNCA puede estar el fin de semana.
8. onlyWeekends: Si es true, SOLO puede estar sábados y domingos.
9. blackoutDates y fixedDays: Respeta las fechas bloqueadas y los días fijos obligatorios.

OBJETIVOS DE EQUIDAD (Prioridad al reasignar turnos):
- Distribuye equitativamente las **noches**. Hay ${eligibleForNight} médicos que pueden hacer noche, lo justo es aproximadamente ${targetNightsPerDoc} noches por médico. Evita que un médico tenga 5 noches y otro 1 si ambos están disponibles.
- Distribuye equitativamente los **fines de semana** (sábados y domingos de día).
- Minimiza la carga de los médicos que ya tienen turnos excesivos acercándose a su límite máximo mensual (maxMonthlyShifts).

ESTADO ACTUAL Y PARÁMETROS:
- Médicos disponibles (incluye sus reglas y límites): ${JSON.stringify(doctorsContext)}
- Turnos actuales en la cuadrícula (para que uses como punto de partida): ${JSON.stringify(
    existingShifts.map((s) => ({ date: s.dateStr, type: s.type, doctorId: idMap[s.doctorId] || s.doctorId }))
  )}
- Lista de todas las fechas del mes: ${days.map((d) => format(d, "yyyy-MM-dd")).join(", ")}

TAREA:
Devuelve el **CUADRO COMPLETO** del mes cumpliendo la cuota estricta diaria.
Para no exceder los límites de texto, agrupa los turnos por el "día del mes" (del 1 al 31) en un formato JSON extremadamente compacto.
Usa "d" para el array de IDs de los turnos de día y "n" para los de noche.
Devuelve ÚNICAMENTE este formato estricto:
{
  "s": {
    "1": { "d": ["A", "B", ...], "n": ["C"] },
    "2": { "d": ["C", "D", ...], "n": ["A"] }
  },
  "r": "Resumen en 1 frase."
}
`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "HTTP-Referer": window.location.origin, // Para OpenRouter
      "X-Title": "Cuadro de Turnos", // Para OpenRouter
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      max_tokens: 6000,
      messages: [
        { role: "system", content: "You are an AI that ONLY responds with pure, valid JSON. Do NOT wrap it in markdown block quotes (```json...```)." },
        { role: "user", content: prompt }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error de OpenRouter (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const textContent = data.choices?.[0]?.message?.content || "{}";

  let parsed: any;
  try {
    // Busca el primer '{' y el último '}'
    const firstBrace = textContent.indexOf('{');
    const lastBrace = textContent.lastIndexOf('}');
    
    if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
       throw new Error("No JSON object found");
    }
    
    const cleanedText = textContent.substring(firstBrace, lastBrace + 1);
    parsed = JSON.parse(cleanedText);
  } catch (err) {
    console.error("Error parsing JSON. Raw AI response:", textContent);
    throw new Error("La respuesta de la IA fue inválida o cortada. Revisa la consola para más detalles.");
  }

  // Mapear el formato agrupado de vuelta a objetos Shift
  const rawShifts: Omit<Shift, "id">[] = [];
  if (parsed.s && typeof parsed.s === "object") {
    const yearMonth = format(currentMonth, "yyyy-MM");
    for (const [dayNum, data] of Object.entries(parsed.s)) {
      const dayStr = String(dayNum).padStart(2, '0');
      const dateStr = `${yearMonth}-${dayStr}`;
      const dayData = data as { d?: string[], n?: string[] };
      
      if (Array.isArray(dayData.d)) {
        dayData.d.forEach((shortId: string) => {
          const realId = reverseIdMap[shortId] || shortId;
          rawShifts.push({ dateStr, type: "day", doctorId: realId });
        });
      }
      if (Array.isArray(dayData.n)) {
        dayData.n.forEach((shortId: string) => {
          const realId = reverseIdMap[shortId] || shortId;
          rawShifts.push({ dateStr, type: "night", doctorId: realId });
        });
      }
    }
  }

  const { shifts, skipped } = filterAiShiftsOptimization(rawShifts, doctors);
  let reasoning =
    typeof parsed.r === "string" && parsed.r.trim().length > 0
      ? parsed.r.trim()
      : "Distribución sugerida aplicando reglas del sistema.";

  if (skipped > 0) {
    reasoning += ` Se omitieron ${skipped} sugerencia(s) que violaban reglas de validación (descansos, cuotas, límites o disponibilidad).`;
  }

  return { shifts, reasoning };
};
