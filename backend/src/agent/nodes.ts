// src/agent/nodes.ts
import { ChatOpenAI } from "@langchain/openai"; // Importamos OpenAI
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { BaseMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { tools } from "./tools";
import { State } from "./state";
import * as dotenv from 'dotenv';

dotenv.config();

// --- 1. CONFIGURACIÓN DEL MODELO ---
const model = new ChatOpenAI({
  // AQUÍ ELIGES EL MODELO:
  model: "gpt-4o-mini", // <--- Esta es la versión rápida y barata
  temperature: 0.8,       // 0 para que sea preciso con los datos
  // No hace falta poner apiKey aquí, la lee sola del .env si se llama OPENAI_API_KEY
});

// --- 2. VINCULACIÓN (BINDING) ---
// GPT es muy bueno entendiendo herramientas, así que usamos bindTools con confianza.
const modelWithTools = model.bindTools(tools);

// --- 3. DEFINICIÓN DE PERSONALIDAD (System Prompt) ---
const SYSTEM_PROMPT = `
Eres el **Asistente Virtual 'Dr. Jimmy'** de la "Clínica Dental Sonrisas". Tu objetivo principal es gestionar citas, responder preguntas sobre la clínica y ofrecer servicios de manera profesional.

INFORMACIÓN CRÍTICA DE LA CLÍNICA:
1. **Nombre:** Dr. Jimmy, Asistente de la Clínica Dental Sonrisas.
2. **Horario de Atención:**
   - Lunes a Viernes: 9:00 AM a 6:00 PM.
   - Sábados: 9:00 AM a 1:00 PM.
   - Domingos: CERRADO.
3. **Servicios, Duración y Precios (Referenciales):**
   - **Odontología General (Revisión/Limpieza):**
     - Duración: 45 minutos.
     - Precio: $45 USD.
   - **Endodoncia (Tratamiento de conducto):**
     - Duración: 90 minutos.
     - Precio: $250 USD (depende de la complejidad).
   - **Ortodoncia (Evaluación inicial):**
     - Duración: 60 minutos.
     - Precio: $60 USD.
   - **Estética Dental (Blanqueamiento):**
     - Duración: 75 minutos.
     - Precio: $180 USD.
  4. **UBICACION DE LA CLINICA**
  -Calle: Avenida Azuay y Machala esquina, ciudad Pasaje provicia de El Oro

REGLAS DE ORO (SÍGUELAS SIEMPRE):
1. **Intervalo Mínimo:** Solo agenda citas con un intervalo de **45 minutos** entre cada una (Ej: 10:00, 10:45, 11:30...).Cuando te diga que hora quiere adaptale la cita al horario establecido
2. **Verificación de Fecha:** NUNCA agendes una cita sin antes usar la herramienta 'consultar_agenda' para ver si el horario exacto está disponible.
3. **Datos Completos:** Para agendar, OBLIGATORIAMENTE necesitas: Nombre, Cédula, Teléfono, Fecha/Hora y Motivo.
4. **Tono:** Sé profesional y empático.
5. Cuando te pregunte sobre un servicio dale solo el que necesite, por ejemplo si te pide el precio Revisión/Limpieza dale solamente el el precio , no le des otra infomacion, a menos que te lo pregunte
 
Si la pregunta es sobre servicios, duración, horarios o precios, usa la información anterior antes de intentar agendar.
Si la pregunta es para recetar algun medicamento, diles que en la visita presencial le recetaremos todo.
`;

// --- 4. NODO: EL CEREBRO (Thinking Node) ---
export async function callModel(state: State) {
  try {
    // Logging detallado del estado recibido
    console.log(`🧠 callModel: Estado recibido completo:`, {
      hasState: !!state,
      hasMessages: !!state?.messages,
      messagesType: Array.isArray(state?.messages) ? 'array' : typeof state?.messages,
      messagesLength: state?.messages?.length ?? 'undefined',
      stateKeys: state ? Object.keys(state) : 'no state',
    });

    const { messages = [] } = state;

    console.log(`🧠 callModel: Después de desestructurar, messages.length = ${messages.length}`);

    if (!messages || messages.length === 0) {
      console.error("⚠️ callModel: No hay mensajes en el estado. Esto no debería pasar.");
      // Retornamos un mensaje de error para que el flujo continúe
      return {
        messages: [new AIMessage("Lo siento, hubo un problema procesando tu solicitud. Por favor intenta de nuevo.")]
      };
    }

    const systemMessage = new SystemMessage(SYSTEM_PROMPT);

    // Enviamos todo el historial. GPT no tiene problemas de formato como Gemini.
    console.log(`🤖 callModel: Invocando modelo con ${messages.length + 1} mensaje(s) (incluyendo system)`);
    const response = await modelWithTools.invoke([systemMessage, ...messages]);

    console.log(`✅ callModel: Modelo respondió exitosamente. Tipo: ${response.constructor.name}`);
    if ('tool_calls' in response && response.tool_calls) {
      console.log(`🔧 callModel: Respuesta incluye ${response.tool_calls.length} llamada(s) a herramienta(s)`);
    }

    // Retornamos la respuesta (sea texto o una llamada a herramienta)
    return { messages: [response] };
  } catch (error) {
    console.error("❌ callModel: Error al invocar el modelo:", error);
    // Retornamos un mensaje de error para que el flujo continúe
    return {
      messages: [new AIMessage("Lo siento, hubo un error al procesar tu solicitud. Por favor intenta de nuevo.")]
    };
  }
}

// --- 5. NODO: EL EJECUTOR (Action Node) ---
export const toolNode = new ToolNode(tools);