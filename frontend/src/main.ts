import './style.css';

// 1. Referencias al DOM (Tipadas correctamente)
const chatForm = document.getElementById('chat-form') as HTMLFormElement;
const userInput = document.getElementById('user-input') as HTMLInputElement;
const chatContainer = document.getElementById('chat-container') as HTMLDivElement;
const sendBtn = document.getElementById('send-btn') as HTMLButtonElement;

// URL de tu Backend (Asegúrate de que el puerto coincida)
const API_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api/chat` 
  : 'http://localhost:3000/api/chat';
// Generar o obtener sessionId para mantener el historial de conversación
const getSessionId = (): string => {
  let sessionId = localStorage.getItem('chat_session_id');
  if (!sessionId) {
    // Generar un ID único simple
    sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('chat_session_id', sessionId);
  }
  return sessionId;
};

// 2. Función para agregar mensajes al chat
const appendMessage = (text: string, sender: 'user' | 'bot') => {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${sender}`;

  // Avatar condicional
  const avatarHTML = sender === 'bot'
    ? '<div class="avatar">👨‍⚕️</div>'
    : '<div class="avatar">👤</div>';

  // Formateo simple: Convierte **texto** en <b>texto</b> (como lo envía GPT)
  const formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');

  messageDiv.innerHTML = `
    ${avatarHTML}
    <div class="bubble">${formattedText}</div>
  `;

  chatContainer.appendChild(messageDiv);

  // Auto-scroll al fondo
  chatContainer.scrollTop = chatContainer.scrollHeight;
};

// 3. Función para mostrar indicador de "Escribiendo..."
const showTyping = () => {
  const typingDiv = document.createElement('div');
  typingDiv.id = 'typing-indicator';
  typingDiv.className = 'message bot';
  typingDiv.innerHTML = `
    <div class="avatar">👨‍⚕️</div>
    <div class="bubble" style="color: gray; font-style: italic;">Escribiendo...</div>
  `;
  chatContainer.appendChild(typingDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;
};

const removeTyping = () => {
  const typingDiv = document.getElementById('typing-indicator');
  if (typingDiv) typingDiv.remove();
};

// 4. Manejo del Envío
const handleSubmit = async (e: Event) => {
  e.preventDefault();

  const message = userInput.value.trim();
  if (!message) return;

  // UI: Mostrar mensaje usuario y limpiar input
  appendMessage(message, 'user');
  userInput.value = '';
  userInput.disabled = true;
  sendBtn.disabled = true;

  // UI: Mostrar "Escribiendo..."
  showTyping();

  try {
    // LLAMADA AL BACKEND (incluimos sessionId para mantener el historial)
    const sessionId = getSessionId();
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, sessionId }),
    });

    if (!response.ok) throw new Error('Error en el servidor');

    // Procesar respuesta JSON del backend
    const data = await response.json();

    // UI: Mostrar respuesta del bot
    removeTyping();
    appendMessage(data.response, 'bot');

  } catch (error) {
    console.error(error);
    removeTyping();
    appendMessage("Lo siento, tuve un problema de conexión. Intenta de nuevo.", 'bot');
  } finally {
    userInput.disabled = false;
    sendBtn.disabled = false;
    userInput.focus();
  }
};

// 5. Event Listeners
chatForm.addEventListener('submit', handleSubmit);