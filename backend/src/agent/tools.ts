// src/agent/tools.ts
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import {
  crearCita,
  buscarCitasPorCedula,
  obtenerCitasPorDia,
  cancelarCita,
  actualizarCita
} from "@database/appointments";

// --- HERRAMIENTA 1: AGENDAR (Crear) ---
//esta funcion tool envuelve la funcion crearCit para que entienda la ia
//tool(  LOGICA_REAL ,  CONFIGURACION_PARA_LA_IA  )
export const toolAgendarCita = tool(
  async (input) => {
    // 'input' es el objeto JSON que la IA generó basándose en tus reglas.
    // Ejemplo: input = { patientName: "Juan", date: "2023-10-10", ... }
    const fechaObjeto = new Date(input.date);
    const id = await crearCita({
      patientName: input.patientName,
      identificationNumber: input.identificationNumber,
      phoneNumber: input.phoneNumber,
      reason: input.reason,
      date: fechaObjeto,
      status: "pendiente"
    });
    return `Cita agendada con éxito. ID de referencia: ${id}.`;
  },
  {
    name: "agendar_cita",
    description: `
    Guarda una nueva cita. 
    Úsala SOLO cuando el usuario confirme todos los datos y quiera crear una cita NUEVA.
    
    IMPORTANTE: 
    - Si el usuario pregunta por una cita ya existente, NO uses esta herramienta (usa 'consultar_cita').
    - Si el usuario pregunta disponibilidad, sugiere horarios primero.
  `,
    //Es el prompt del sistema para esta herramienta.
    schema: z.object({
      patientName: z.string().describe("Nombre completo del paciente"),
      identificationNumber: z.string().describe("Cédula o DNI del paciente"),
      phoneNumber: z.string().describe("Teléfono de contacto"),
      reason: z.string().describe("Motivo de la consulta"),
      date: z.string().describe("Fecha y hora en formato ISO (ej: 2023-10-25T10:00:00)")
    }),
  }
);

// --- HERRAMIENTA 2: HISTORIAL (Leer por Cédula) ---
export const toolConsultarHistorial = tool(
  async (input) => {
    const citas = await buscarCitasPorCedula(input.identificationNumber);
    if (citas.length === 0) return "No hay citas registradas para esta cédula.";

    // Formatear las fechas preservando el valor exacto del objeto Date
    // Usamos los métodos get* para evitar conversiones de zona horaria
    const citasFormateadas = citas.map(cita => {
      const fecha = cita.date;
      const año = fecha.getFullYear();
      const mes = String(fecha.getMonth() + 1).padStart(2, '0');
      const dia = String(fecha.getDate()).padStart(2, '0');
      const hora = String(fecha.getHours()).padStart(2, '0');
      const minutos = String(fecha.getMinutes()).padStart(2, '0');

      return {
        ...cita,
        date: `${dia}/${mes}/${año} ${hora}:${minutos}`
      };
    });

    return JSON.stringify(citasFormateadas);
  },
  {
    name: "consultar_historial",
    description: "Buscar la fecha de la cita con el numero de Cédula/DNI",
    schema: z.object({
      identificationNumber: z.string().describe("Cédula/DNI del paciente")
    })
  }
);

// --- HERRAMIENTA 3: DISPONIBILIDAD (Leer por Fecha) ---
export const toolConsultarAgenda = tool(
  async (input) => {
    const fechaBusqueda = new Date(input.date);
    const citas = await obtenerCitasPorDia(fechaBusqueda);
    if (citas.length === 0) return "Agenda libre. Puedes agendar a cualquier hora.";

    // Solo devolvemos las horas ocupadas para que la IA decida
    const horas = citas.map(c => {
      const d = new Date(c.date);
      return d.toLocaleTimeString();
    });
    return `Horas OCUPADAS en ese día: ${horas.join(", ")}.`;
  },
  {
    name: "consultar_agenda",
    description: "Verifica qué horarios están ocupados en un día específico antes de agendar.",
    schema: z.object({
      date: z.string().describe("Fecha a consultar (ISO format)")
    })
  }
);

// --- HERRAMIENTA 4: CANCELAR (Soft Delete) ---
export const toolCancelarCita = tool(
  async (input) => {
    return await cancelarCita(input.idCita);
  },
  {
    name: "cancelar_cita",
    description: "Cancela una cita existente usando su ID único.",
    schema: z.object({
      idCita: z.string().describe("El ID único de la cita (ej: '8f9s8d...')")
    })
  }
);

// --- HERRAMIENTA 5: MODIFICAR (Update) ---
export const toolModificarCita = tool(
  async (input) => {
    // Preparamos solo los datos que la IA nos envió
    const datosActualizar: any = {};

    if (input.newDate) datosActualizar.date = new Date(input.newDate);
    if (input.newReason) datosActualizar.reason = input.newReason;

    // Llamamos a la función de DB
    return await actualizarCita(input.idCita, datosActualizar);
  },
  {
    name: "modificar_cita",
    description: "Cambia la fecha o el motivo de una cita existente.",
    schema: z.object({
      idCita: z.string().describe("El ID único de la cita a modificar"),
      newDate: z.string().optional().describe("La nueva fecha y hora (ISO format) si se va a cambiar"),
      newReason: z.string().optional().describe("El nuevo motivo si se va a cambiar")
    })
  }
);

// --- EXPORTAR TODO EL KIT ---
export const tools = [
  toolAgendarCita,
  toolConsultarHistorial,
  toolConsultarAgenda,
  toolCancelarCita,
  toolModificarCita
];