// src/index.ts
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { invokeAgent } from './agent/graph'; // <-- Importamos nuestro Agente

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de CORS para permitir peticiones del frontend
const corsOptions = {
    origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
        // En producción, permitir el origen del frontend o todos si no se especifica
        const allowedOrigins = process.env.FRONTEND_URL
            ? process.env.FRONTEND_URL.split(',')
            : ['*'];

        if (allowedOrigins.includes('*') || !origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(null, true); // Permitir todos temporalmente para debug
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    preflightContinue: false,
    optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

app.use(express.json()); // Vital para recibir mensajes JSON del frontend

// Logging para debug (siempre activo para diagnosticar problemas)
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Origin: ${req.get('origin') || 'none'}`);
    next();
});

// Manejar preflight explícitamente ANTES de las rutas
app.options('/api/chat', cors(corsOptions));
app.options('/{*path}', cors(corsOptions));
// --- RUTA PRINCIPAL DE CHATBOT ---
app.post('/api/chat', async (req, res) => {
    console.log('✅ Ruta /api/chat recibida');
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
        console.error("Stack trace:", error instanceof Error ? error.stack : 'No stack trace available');
        res.status(500).json({
            response: "Lo siento, tuve un problema interno de comunicación. Por favor, inténtalo de nuevo más tarde."
        });
    }
});

// Ruta de prueba
app.get('/', (req, res) => {
    res.send('🦷 Servidor de Clínica Dental IA: EN LÍNEA y CHAT LISTO.');
});

// Ruta de prueba para verificar que /api funciona
app.get('/api/test', (req, res) => {
    res.json({ message: 'API funcionando correctamente', path: req.path, method: req.method });
});

// Arrancar el servidor
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`🚀 Servidor local en http://localhost:${PORT}`);
    });
}
// Al final de tu archivo index.ts
export default app;