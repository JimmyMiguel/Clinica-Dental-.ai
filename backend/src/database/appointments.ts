// src/database/appointments.ts
import { getDb } from '../config/firebase';
import { CitaDental } from './schemas';

// --- FUNCIÓN 1: CREAR CITA (Escritura) ---
export async function crearCita(cita: CitaDental): Promise<string> {
    try {
        const db = getDb();
        const collectionRef = db.collection('appointments');

        // Guardamos en Firebase
        const docRef = await collectionRef.add({
            ...cita,
            createdAt: new Date() // Fecha de auditoría interna
        });

        console.log(`💾 Cita guardada para ${cita.patientName} (ID: ${cita.identificationNumber})`);
        return docRef.id;

    } catch (error) {
        console.error("Error al guardar cita:", error);
        throw new Error("No se pudo agendar la cita.");
    }
}

// --- FUNCIÓN 2: BUSCAR POR CÉDULA (Lectura Historial) ---
export async function buscarCitasPorCedula(cedula: string): Promise<CitaDental[]> {
    try {
        const db = getDb();
        const citasSnapshot = await db.collection('appointments')
            .where('identificationNumber', '==', cedula)
            .get();

        if (citasSnapshot.empty) return [];

        return citasSnapshot.docs.map(doc => {
            const data = doc.data();
            // Truco Importante: Convertir Timestamp de Firebase a Date de JS
            const fechaJS = (data.date as any).toDate ? (data.date as any).toDate() : new Date(data.date);
            return { ...data, date: fechaJS } as CitaDental;
        });

    } catch (error) {
        console.error("Error al buscar citas:", error);
        throw new Error("Error consultando la base de datos.");
    }
}

// --- FUNCIÓN 3: BUSCAR POR DÍA (Lectura Agenda) ---
export async function obtenerCitasPorDia(fecha: Date): Promise<CitaDental[]> {
    try {
        const db = getDb();
        // 1. Calcular inicio del día (00:00:00)
        const inicioDia = new Date(fecha);
        inicioDia.setHours(0, 0, 0, 0);

        // 2. Calcular fin del día (23:59:59)
        const finDia = new Date(fecha);
        finDia.setHours(23, 59, 59, 999);

        // 3. Consulta por rango de fecha
        const snapshot = await db.collection('appointments')
            .where('date', '>=', inicioDia)
            .where('date', '<=', finDia)
            .get();

        if (snapshot.empty) return [];

        return snapshot.docs.map(doc => {
            const data = doc.data();
            // Truco Importante: Convertir Timestamp de Firebase a Date de JS
            const fechaJS = (data.date as any).toDate ? (data.date as any).toDate() : new Date(data.date);
            return { ...data, date: fechaJS } as CitaDental;
        });

    } catch (error) {
        console.error("Error consultando agenda:", error);
        throw new Error("No se pudo leer la agenda del día.");
    }
}
export async function cancelarCita(idCita: string): Promise<string> {
    try {
        const db = getDb();
        await db.collection('appointments').doc(idCita).update({
            status: 'cancelada'
        });

        console.log(`🗑 Cita ${idCita} marcada como cancelada.`);
        return `Cita cancelada correctamente.`;

    } catch (error) {
        console.error("Error al cancelar cita:", error);
        throw new Error("No se pudo cancelar la cita. Verifica el ID.");
    }
}

// --- FUNCIÓN 5: MODIFICAR CITA ---
/**
 * Actualiza fecha, motivo o estado.
 * Usa 'Partial<CitaDental>' para permitir actualizar solo UN campo si es necesario.
 */
export async function actualizarCita(idCita: string, nuevosDatos: Partial<CitaDental>): Promise<string> {
    try {
        const db = getDb();
        await db.collection('appointments').doc(idCita).update({
            ...nuevosDatos,
            updatedAt: new Date() // Auditoría: fecha de modificación
        });

        console.log(`✏️ Cita ${idCita} actualizada.`);
        return `Cita actualizada con éxito.`;

    } catch (error) {
        console.error("Error al actualizar cita:", error);
        throw new Error("No se pudo modificar la cita.");
    }
}