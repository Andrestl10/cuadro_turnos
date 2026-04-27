import { GoogleGenerativeAI, type ResponseSchema, SchemaType } from "@google/generative-ai";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import type { Doctor, Shift } from "../types";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

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

export const generateAISchedule = async (
  currentMonth: Date,
  doctors: Doctor[],
  existingShifts: Shift[]
): Promise<{ shifts: Omit<Shift, 'id'>[], reasoning: string }> => {
  if (!API_KEY || API_KEY === "INGRESA_TU_API_KEY_AQUI") {
    throw new Error("Por favor, configura tu VITE_GEMINI_API_KEY en el archivo .env.local");
  }

  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });

  const monthName = format(currentMonth, 'MMMM yyyy');
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const doctorsContext = doctors.map(d => ({
    id: d.id,
    name: d.name,
    maxMonthlyShifts: d.maxMonthlyShifts,
    maxMonthlyNights: d.maxMonthlyNights,
    fixedShiftType: d.fixedShiftType,
    noWeekends: d.noWeekends,
    blackoutDates: d.blackoutDates || [],
    partnerId: d.partnerId
  }));

  const prompt = `
Eres un experto en gestión de turnos médicos. Tu objetivo es completar el cuadro de turnos para el mes de ${monthName} de forma EQUITATIVA y respetando estrictamente las REGLAS.

REGLAS CRÍTICAS:
1. Cuota Diaria: 
   - Días de semana (Lunes a Viernes): 7 médicos en turno "day", 1 médico en turno "night".
   - Fines de semana (Sábado y Domingo): 4 médicos en turno "day", 1 médico en turno "night".
2. Descanso post-noche: Después de un turno "night", el médico DEBE descansar al menos 48 horas (no puede tener turnos en los 2 días siguientes).
3. Límites: No exceder maxMonthlyShifts ni maxMonthlyNights por médico.
4. Restricciones Personales: Respetar blackoutDates (días que no puede ir) y noWeekends (si es true, no asignar Sáb/Dom).
5. Parejas: Si un médico tiene partnerId, ambos comparten el turno de día (cuenta como 0.5 para cada uno en esfuerzo, pero aquí asígnalos normalmente si el sistema lo requiere).

ESTADO ACTUAL:
- Médicos: ${JSON.stringify(doctorsContext)}
- Turnos ya asignados: ${JSON.stringify(existingShifts.map(s => ({ date: s.dateStr, type: s.type, doc: s.doctorId })))}
- Días del mes: ${days.map(d => format(d, 'yyyy-MM-dd')).join(', ')}

TAREA:
Genera los turnos FALTANTES para cubrir todas las cuotas diarias del mes. 
Prioriza la EQUIDAD: todos los médicos deben tener una carga similar de noches y fines de semana dentro de sus límites.
Devuelve solo los NUEVOS turnos en el formato JSON especificado.
`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return JSON.parse(response.text());
};
