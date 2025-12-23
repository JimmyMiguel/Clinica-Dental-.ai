// src/agent/graph.ts
import { State, StateAnnotation } from "./state";
import { callModel, toolNode } from "./nodes";
import { END, StateGraph } from "@langchain/langgraph";
import { AIMessage, HumanMessage, BaseMessage } from "@langchain/core/messages";

// --- 1. FUNCIÓN DE DECISIÓN (EL ROUTER) ---
 const shouldContinue = (state: State): string => {
  
  // 1. Extracción segura con valor por defecto cuando empieza el chat
  const { messages = [] } = state;

  // 2. Verificación de seguridad: ¿Hay mensajes?
  if (!messages || messages.length === 0) {
    console.error("⚠️ ALERTA: No se encontraron mensajes en el estado. Terminando flujo para evitar crash.");
     return "end";
  }

  // 3. Obtenemos el último mensaje de forma segura
  const lastMessage = messages[messages.length - 1] as AIMessage;

  // 4. Verificación extra: ¿El mensaje existe?
  if (!lastMessage) {
    console.error("⚠️ ALERTA: El último mensaje es undefined aunque hay mensajes en el array.");
    return "end";
  }

  // 5. Verificamos si GPT quiere usar herramientas
  // Usamos el operador '?.' para evitar errores si tool_calls no existe
  if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
    console.log(`--> DECISIÓN: Usar Herramientas 🛠️ (${lastMessage.tool_calls.length} llamada(s))`);
    return "tools";
  }
  // 6. Si no, terminamos
  console.log("--> DECISIÓN: Terminar conversación (Respuesta a usuario) 💬");
  return "end";
};

// --- 2. CONSTRUCCIÓN DEL GRAFO ---
export const buildAgentGraph = () => {
  console.log("🏗️ Construyendo Grafo de Agente...");

  // StateGraph recibe directamente el StateAnnotation, no un objeto con channels
  // Usamos 'as any' temporalmente para evitar problemas de tipado durante la construcción
  const workflow = new StateGraph(StateAnnotation) as any;

  // 1. Nodos (Estaciones de trabajo)
  workflow.addNode("agent", callModel);
  workflow.addNode("tools", toolNode);

  // 2. Conexiones (Flechas)
  // Punto de inicio -> Agente
  workflow.addEdge("__start__", "agent");

  // Agente -> Router (Decide si ir a Tools o Fin)
  workflow.addConditionalEdges(
    "agent",
    shouldContinue,
    {
      tools: "tools",
      end: END,
    }
  );

  // Tools -> Agente (Ciclo de retroalimentación)
  workflow.addEdge("tools", "agent");

  // 3. Compilación
  return workflow.compile();
};

// --- 3. EJECUTOR DEL AGENTE ---
// Instancia única del grafo compilado
const agentExecutor = buildAgentGraph();

// Almacenamiento en memoria del historial de conversaciones por sesión
// En producción, esto debería estar en una base de datos
const conversationHistory = new Map<string, BaseMessage[]>();

/**
 * Función que llama el servidor Express.
 * Se encarga de formatear la entrada y limpiar la salida.
 * @param userMessage - Mensaje del usuario
 * @param sessionId - ID de sesión para mantener el historial (opcional, por defecto 'default')
 */
export async function invokeAgent(userMessage: string, sessionId: string = 'default') {
  // Convertimos el string del usuario a un HumanMessage de LangChain
  const inputMessage = new HumanMessage(userMessage);

  // Obtenemos el historial previo de la sesión, o un array vacío si no existe
  const previousMessages = conversationHistory.get(sessionId) || [];

  // Estado inicial con el historial previo + el nuevo mensaje
  const inputs: State = {
    messages: [...previousMessages, inputMessage],
  };

 
  try {
    // Ejecutamos el grafo
    const result = await agentExecutor.invoke(inputs) as State;

    // Validación: Verificar que result existe y tiene la estructura esperada
    if (!result) {
      console.error("⚠️ ALERTA: El grafo retornó undefined. No se pudo procesar la solicitud.");
      return "Lo siento, no pude procesar tu solicitud. Por favor intenta de nuevo.";
    }

    // Validación: Verificar que result.messages existe y tiene elementos
    if (!result.messages || !Array.isArray(result.messages) || result.messages.length === 0) {
      console.error("⚠️ ALERTA: No se encontraron mensajes en el resultado del grafo.");
      return "Lo siento, no recibí una respuesta válida del agente. Por favor intenta de nuevo.";
    }

    // Extraemos el último mensaje
    const lastMessage = result.messages[result.messages.length - 1] as AIMessage;

    // Validación: Verificar que el último mensaje existe
    if (!lastMessage) {
      console.error("⚠️ ALERTA: El último mensaje es undefined.");
      return "Lo siento, no pude extraer la respuesta. Por favor intenta de nuevo.";
    }

    // Extracción robusta del contenido (texto)
    const content = Array.isArray(lastMessage.content)
      ? lastMessage.content
        .map((chunk: any) =>
          typeof chunk === "string" ? chunk : chunk?.text ?? ""
        )
        .join(" ")
        .trim()
      : (lastMessage.content as string);

    // ACTUALIZAR HISTORIAL: Guardamos todos los mensajes (historial previo + mensaje usuario + respuesta)
    // Esto incluye también los mensajes intermedios de las herramientas
    const updatedHistory = result.messages;
    conversationHistory.set(sessionId, updatedHistory);
    console.log(`💾 Historial actualizado: ${updatedHistory.length} mensaje(s) en sesión "${sessionId}"`);

    return content || "Lo siento, no pude procesar una respuesta.";

  } catch (error) {
    console.error("❌ Error interno en invokeAgent:", error);
    return "Ocurrió un error interno en el agente. Por favor intenta de nuevo.";
  }
}