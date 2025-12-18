// src/database/schemas.ts

export interface CitaDental {
    patientName: string;
    identificationNumber: string; // ✅ Nuevo: Para identificar clientes únicos
    phoneNumber: string;          // ✅ Nuevo: Para contactar por WhatsApp
    date: Date;
    reason: string;
    status: 'confirmada' | 'pendiente' | 'cancelada';
}