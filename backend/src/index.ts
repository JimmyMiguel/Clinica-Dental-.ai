// src/index.ts
import express from 'express';
import dotenv from 'dotenv';
import { invokeAgent } from './agent/graph'; // <-- Importamos nuestro Agente

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json()); // Vital para recibir mensajes JSON del frontend

// --- RUTA PRINCIPAL DE CHATBOT ---
app.post('/api/chat', async (req, res) => {
    const userMessage = req.body.message;
    
    if (!userMessage) {
        return res.status(400).send({ error: "Falta el campo 'message' en la solicitud." });
    }

    try {
        console.log(`\n👤 Usuario: ${userMessage}`);
        
        // Aquí se ejecuta todo el LangGraph, llamando a Gemini y a las DB tools.
        const agentResponse = await invokeAgent(userMessage);

        console.log(`🤖 Agente: ${agentResponse}`);
        
        res.json({ response: agentResponse });

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
app.listen(PORT, () => {
  console.log(`\n🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`🔌 API Chat lista en: http://localhost:${PORT}/api/chat (POST)`);
});