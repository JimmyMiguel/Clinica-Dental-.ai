// src/agent/state.ts
import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";

/**
 * El valor de la definición del estado (Necesario para 'channels' en StateGraph).
 * Usamos StateAnnotation como NOMBRE DE VALOR.
 */
export const StateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (currentState, updateValue) => {
      // Reducer robusto que maneja casos edge
      // currentState: el estado actual (puede ser undefined en la primera llamada)
      // updateValue: el nuevo valor a agregar (puede ser undefined)
      const currentArray = Array.isArray(currentState) ? currentState : [];
      const updateArray = Array.isArray(updateValue) ? updateValue : [];

      // Si updateValue es undefined o vacío, retornamos el estado actual
      if (updateArray.length === 0) {
        return currentArray;
      }

      // Concatenamos el estado actual con el nuevo valor
      return currentArray.concat(updateArray);
    },
    default: () => [], // CRÍTICO: Inicializa messages como array vacío si no existe
  }),
});

/**
 * El tipo del estado (Necesario para 'StateGraph<State>').
 */
export type State = typeof StateAnnotation.State;