// src/index.ts
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { invokeAgent } from './agent/graph'; // <-- Importamos nuestro Agente

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de CORS para permitir peticiones del frontend
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173', 
    credentials: true
}));

app.use(express.json()); // Vital para recibir mensajes JSON del frontend

// --- RUTA PRINCIPAL DE CHATBOT ---
app.post('/api/chat', async (req, res) => {
    const userMessage = req.body.message;
    const sessionId = req.body.sessionId || 'default'; // Permite pasar un sessionId o usa 'default'

    if (!userMessage) {
        return res.status(400).send({ error: "Falta el campo 'message' en la solicitud." });
    }

    try {
        console.log(`\n👤 Usuario [${sessionId}]: ${userMessage}`);

        // Aquí se ejecuta todo el LangGraph, llamando a Gemini y a las DB tools.
        // El sessionId permite mantener el historial de conversación
        const agentResponse = await invokeAgent(userMessage, sessionId);

        console.log(`🤖 Agente [${sessionId}]: ${agentResponse}`);

        res.json({ response: agentResponse, sessionId });

    } catch (error) {
        console.error("❌ Error CRÍTICO en la ejecución del Agente:", error);
        res.status(500).json({
            response: "Lo siento, tuve un problema interno de comunicación. Por favor, inténtalo de nuevo más tarde."
        });
    }
});

// Ruta de prueba
app.get('/', (req, res) => {
    res.send('🦷 Servidor de Clínica Dental IA: EN LÍNEA y CHAT LISTO.');
});

// Arrancar el servidor
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`🚀 Servidor local en http://localhost:${PORT}`);
    });
}
// Al final de tu archivo index.ts
export default app;