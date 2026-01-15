/**
 * Scooby Chat - Lógica Principal (app.js)
 * Sistema de gestión de estado y comunicación con n8n
 */

// ========== CONFIGURACIÓN ==========
const IS_BETA_MODE = true;
const BETA_WEBHOOK_URLS = [
  "https://n8n.michel-ia.eu/webhook/scooby-beta-1",
  "https://n8n.michel-ia.eu/webhook/scooby-beta-2",
  "https://n8n.michel-ia.eu/webhook/scooby-beta-3"
];

const config = {
  userId: localStorage.getItem("scooby_user_id") || `user_${Date.now()}`,
  conversationId: localStorage.getItem("scooby_conversation_id") || `conv_${Date.now()}`,
  userName: localStorage.getItem("scooby_user_name") || "",
  userAge: localStorage.getItem("scooby_user_age") || "",
  isBetaMode: IS_BETA_MODE,
  webhookUrl: ""
};

// ========== ESTADO DE LA APP ==========
const state = {
  isRecording: false,
  isBotResponding: false,
  isCancelling: false,
  hasRecordedMessage: false,
  recordedMessage: "",
  mouthAnimationTimer: null,
  mouthAnimationPhase: 0,
  messageHistory: []
};

// ========== UTILIDADES ==========

function getUserConsistentUrl(userId) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const index = Math.abs(hash) % BETA_WEBHOOK_URLS.length;
  return BETA_WEBHOOK_URLS[index];
}

function trackEvent(event, extra = {}) {
  console.log(`[Telemetry] ${event}`, extra);
}

function cleanTextForTTS(text) {
  if (!text) return "";
  
  return text
    // 1. Eliminar URLs (http, https, www)
    .replace(/https?:\/\/\S+|www\.\S+/gi, '')
    // 2. Eliminar imágenes markdown y convertir enlaces [texto](url) a solo "texto"
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    // 3. Eliminar símbolos de formato Markdown y otros caracteres especiales
    .replace(/[*#_~`•→←↑↓]/g, '')
    // 4. Eliminar Emojis y símbolos pictográficos exhaustivamente
    .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]/gu, '')
    // 5. Normalizar puntuación excesiva (manteniendo una para la pausa)
    .replace(/([!?])\1+/g, '$1')
    // 6. Limpieza final de espacios
    .replace(/\s+/g, ' ')
    .trim();
}

// ========== UI & ANIMACIONES ==========

function setMouthShape(phase) {
  const mouth = document.getElementById("mouthPath");
  if (!mouth) return;
  const shapes = [
    "M 190 295 L 210 295",            // Reposo
    "M 185 295 Q 200 305 215 295",    // Semi-abierta
    "M 180 295 Q 200 312 220 295"     // Abierta
  ];
  mouth.setAttribute("d", shapes[phase % 3]);
}

function startMouthAnimation() {
  if (state.mouthAnimationTimer) return;
  state.mouthAnimationPhase = 0;
  state.mouthAnimationTimer = setInterval(() => {
    state.mouthAnimationPhase = (state.mouthAnimationPhase + 1) % 3;
    setMouthShape(state.mouthAnimationPhase);
  }, 140);
}

function stopMouthAnimation() {
  if (state.mouthAnimationTimer) {
    clearInterval(state.mouthAnimationTimer);
    state.mouthAnimationTimer = null;
  }
  setMouthShape(0);
}

function updateStatus(type, text) {
  const badge = document.getElementById("statusBadge");
  const dot = badge?.querySelector(".status-dot");
  const statusLine = document.getElementById("scoobyStatus");

  if (!statusLine || !dot) return;

  // Actualizar texto
  statusLine.textContent = text;

  // Actualizar color del punto
  dot.className = "status-dot " + type;
}

function animateScooby(isTalking) {
  const avatar = document.getElementById("scoobyAvatar");
  const thoughtBubble = document.getElementById("thoughtBubble");
  const leftEye = document.getElementById("leftEyeOuter");
  const rightEye = document.getElementById("rightEyeOuter");

  if (isTalking) {
    avatar?.classList.add("talking");
    thoughtBubble?.classList.add("show");
    updateStatus("thinking", "Hablando...");
    leftEye?.setAttribute("filter", "url(#glow)");
    rightEye?.setAttribute("filter", "url(#glow)");
  } else {
    avatar?.classList.remove("talking");
    thoughtBubble?.classList.remove("show");
    updateStatus("ready", "Listo");
    leftEye?.removeAttribute("filter");
    rightEye?.removeAttribute("filter");
  }
}

// ========== GESTIÓN DE MENSAJES ==========

function addMessage(sender, text) {
  const chatMessages = document.getElementById("chatMessages");
  if (!chatMessages) return;

  const messageDiv = document.createElement("div");
  const time = new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

  messageDiv.className = sender === "user" ? "user-message message" : "scooby-message message";
  if (sender === "sistema") messageDiv.style.opacity = "0.7";

  messageDiv.innerHTML = `<div>${text}</div><div class="message-time">${time}</div>`;
  chatMessages.appendChild(messageDiv);

  setTimeout(() => {
    chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: "smooth" });
  }, 100);

  state.messageHistory.push({ sender, text, time });
  if (state.messageHistory.length > 20) {
    state.messageHistory.shift();
  }
  saveHistory();
}

function saveHistory() {
  const historyToSave = state.messageHistory.slice(-20);
  localStorage.setItem("scooby_history", JSON.stringify(historyToSave));
}

function loadHistory() {
  const saved = localStorage.getItem("scooby_history");
  if (saved) {
    try {
      const history = JSON.parse(saved);
      const chatMessages = document.getElementById("chatMessages");
      if (!chatMessages) return false;
      
      chatMessages.innerHTML = "";
      history.forEach(msg => {
        const messageDiv = document.createElement("div");
        messageDiv.className = msg.sender === "user" ? "user-message message" : "scooby-message message";
        if (msg.sender === "sistema") messageDiv.style.opacity = "0.7";
        messageDiv.innerHTML = `<div>${msg.text}</div><div class="message-time">${msg.time}</div>`;
        chatMessages.appendChild(messageDiv);
      });
      state.messageHistory = history;
      
      setTimeout(() => {
        chatMessages.scrollTo({ top: chatMessages.scrollHeight });
      }, 100);
      return true;
    } catch (e) {
      console.error("Error cargando historial:", e);
      return false;
    }
  }
  return false;
}

function saveProfile(name, age) {
  if (name) {
    config.userName = name;
    localStorage.setItem("scooby_user_name", name);
  }
  if (age) {
    config.userAge = age;
    localStorage.setItem("scooby_user_age", age);
  }
}

function showTypingIndicator() {
  const chatMessages = document.getElementById("chatMessages");
  if (!chatMessages) return;
  const typingDiv = document.createElement("div");
  typingDiv.id = "typingIndicator";
  typingDiv.className = "scooby-message message";
  typingDiv.innerHTML = `<div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>`;
  chatMessages.appendChild(typingDiv);
  chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: "smooth" });
}

function hideTypingIndicator() {
  document.getElementById("typingIndicator")?.remove();
}

function updateSuggestions(suggestions) {
  const suggestionsDiv = document.getElementById("suggestions");
  if (!suggestionsDiv) return;
  suggestionsDiv.innerHTML = "";
  suggestions.forEach(suggestion => {
    const chip = document.createElement("div");
    chip.className = "suggestion-chip";
    chip.textContent = suggestion;
    chip.onclick = () => {
      document.getElementById("messageInput").value = suggestion;
      sendMessage();
    };
    suggestionsDiv.appendChild(chip);
  });
}

// ========== COMUNICACIÓN API ==========

async function sendMessage(message = null) {
  if (state.isCancelling) return;

  if (state.isRecording) {
    recognition?.stop();
    state.isRecording = false;
  }

  const input = document.getElementById("messageInput");
  const text = message || input?.value.trim();

  if (!text) return;

  if (!config.webhookUrl) {
    alert("Por favor, configura la URL del webhook.");
    toggleConfig();
    return;
  }

  addMessage("user", text);
  if (input) input.value = "";
  
  showTypingIndicator();
  updateStatus("thinking", "Pensando...");
  animateScooby(true);
  state.isBotResponding = true;

  try {
    const response = await fetch(config.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        user_id: config.userId,
        userId: config.userId,
        userName: config.userName,
        userAge: config.userAge,
        conversationId: config.conversationId,
        betaMode: config.isBetaMode
      })
    });

    if (!response.ok) throw new Error("Error en el servidor");

    const data = await response.json();
    if (state.isCancelling) return;

    hideTypingIndicator();
    animateScooby(false);

    const responseText = data.output || data.respuesta;
    if (responseText) {
      // Guardar perfil si el backend devuelve datos extraídos
      if (data.userName || data.userAge) {
        saveProfile(data.userName, data.userAge);
      }
      addMessage("scooby", responseText);
      speakText(responseText);
      if (data.suggestions) updateSuggestions(data.suggestions);
    } else {
      addMessage("scooby", "¡Ruh-roh! No pude entenderte. ¿Repites?");
      resetToRecordState();
    }
  } catch (error) {
    console.error("API Error:", error);
    hideTypingIndicator();
    animateScooby(false);
    addMessage("scooby", "¡Ups! Problemas de conexión. ¿Revisas el webhook?");
    resetToRecordState();
  }
}

// ========== VOZ Y SÍNTESIS ==========

const synth = window.speechSynthesis;
let recognition = null;

function initializeSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return;

  recognition = new SpeechRecognition();
  recognition.lang = "es-ES";
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onstart = () => {
    state.isRecording = true;
    updateVoiceButton();
    updateStatus("recording", "Escuchando...");
    addMessage("sistema", "🎤 Te escucho...");
  };

  recognition.onresult = (event) => {
    if (state.isCancelling) return;
    const transcript = event.results[0][0].transcript.trim();
    if (transcript) {
      state.recordedMessage = transcript;
      state.hasRecordedMessage = true;
      document.getElementById("messageInput").value = transcript;
    }
  };

  recognition.onend = () => {
    state.isRecording = false;
    updateVoiceButton();
    if (state.hasRecordedMessage && !state.isBotResponding && !state.isCancelling) {
      setTimeout(() => sendMessage(state.recordedMessage), 500);
    }
  };

  recognition.onerror = (e) => {
    console.error("STT Error:", e.error);
    resetToRecordState();
  };
}

function speakText(text) {
  if (!synth || state.isCancelling) return;
  synth.cancel();

  const utterance = new SpeechSynthesisUtterance(cleanTextForTTS(text));
  utterance.lang = "es-ES";
  utterance.rate = 1.0;
  utterance.pitch = 1.2;

  const voices = synth.getVoices();
  const spanishVoice = voices.find(v => v.lang.includes("es"));
  if (spanishVoice) utterance.voice = spanishVoice;

  utterance.onstart = () => {
    if (!state.isCancelling) {
      animateScooby(true);
      startMouthAnimation();
    }
  };

  utterance.onend = () => {
    stopMouthAnimation();
    animateScooby(false);
    resetToRecordState();
  };

  synth.speak(utterance);
}

// ========== ACCIONES DE CONTROL ==========

function resetToRecordState() {
  state.recordedMessage = "";
  state.hasRecordedMessage = false;
  state.isBotResponding = false;
  if (state.isRecording) recognition?.stop();
  updateVoiceButton();
}

function toggleVoiceRecording() {
  if (!recognition) return alert("Navegador no soportado");
  if (state.isRecording) {
    recognition.stop();
  } else {
    if (state.isBotResponding) {
      synth.cancel();
      stopMouthAnimation();
      animateScooby(false);
      state.isBotResponding = false;
    }
    recognition.start();
  }
}

function updateVoiceButton() {
  const btn = document.getElementById("voiceBtn");
  if (!btn) return;
  btn.classList.toggle("recording", state.isRecording);
  btn.innerHTML = state.isRecording ? "⏹️ Parar" : "🎤 Grabar";
}

function cancelAllInteractions() {
  state.isCancelling = true;
  synth.cancel();
  recognition?.stop();
  stopMouthAnimation();
  animateScooby(false);
  
  state.isRecording = false;
  state.isBotResponding = false;
  setTimeout(() => (state.isCancelling = false), 500);
  
  resetToRecordState();
  addMessage("sistema", "🛑 Interacción cancelada.");
}

function resetEverything() {
  if (confirm("¿Estás seguro de que quieres borrar toda la memoria y reiniciar? No podrás recuperar tus datos.")) {
    localStorage.removeItem("scooby_user_name");
    localStorage.removeItem("scooby_user_age");
    localStorage.removeItem("scooby_history");
    localStorage.removeItem("scooby_conversation_id");
    // Mantenemos el webhook url y user id opcionalmente, pero borramos perfil y chat
    location.reload();
  }
}

function toggleConfig() {
  const modal = document.getElementById("configModal");
  modal?.classList.toggle("show");
  document.getElementById("webhookUrl").value = config.webhookUrl;
}

function saveConfig() {
  const url = document.getElementById("webhookUrl").value;
  if (!url) return alert("Ingresa una URL");
  config.webhookUrl = url;
  localStorage.setItem("scooby_webhook_url", url);
  toggleConfig();
  addMessage("sistema", "✅ Configuración guardada.");
}

function clearChat() {
  document.getElementById("chatMessages").innerHTML = "";
  addMessage("sistema", "🧹 Chat limpio.");
  state.messageHistory = [];
}

// ========== INICIALIZACIÓN ==========

function setupEventListeners() {
  // Envío de mensajes
  document.getElementById("sendBtn")?.addEventListener("click", () => sendMessage());
  document.getElementById("messageInput")?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  // Botones de control
  document.getElementById("voiceBtn")?.addEventListener("click", toggleVoiceRecording);
  document.getElementById("cancelBtn")?.addEventListener("click", cancelAllInteractions);
  document.getElementById("clearBtn")?.addEventListener("click", clearChat);
  document.getElementById("resetBtn")?.addEventListener("click", resetEverything);

  // Modal de configuración
  document.querySelector(".config-btn")?.addEventListener("click", toggleConfig);
  document.getElementById("saveConfigBtn")?.addEventListener("click", saveConfig);
  document.getElementById("cancelConfigBtn")?.addEventListener("click", toggleConfig);
}

window.onload = () => {
  // Setup inicial de config
  if (config.isBetaMode) {
    config.webhookUrl = getUserConsistentUrl(config.userId);
    const betaIndicator = document.getElementById("betaIndicator");
    if (betaIndicator) betaIndicator.classList.remove("hidden");
    addMessage("sistema", "🚀 Modo Beta activado.");
  } else {
    config.webhookUrl = localStorage.getItem("scooby_webhook_url") || "";
    if (!config.webhookUrl) toggleConfig();
  }

  localStorage.setItem("scooby_user_id", config.userId);
  localStorage.setItem("scooby_conversation_id", config.conversationId);

  initializeSpeechRecognition();
  setupEventListeners();
  
  // Bienvenida inicial o carga de historial
  setTimeout(() => {
    const hasHistory = loadHistory();
    
    if (!hasHistory) {
      let welcome = "";
      if (config.userName) {
        welcome = `¡Hola de nuevo, ${config.userName}! 🐕 Me alegra verte. ¿Seguimos aprendiendo?`;
        // n8n se encargará de ajustar la personalidad basándose en config.userAge enviado en el payload
      } else {
        welcome = "¡Hola! Soy Scooby, tu amigo mentor. ¿Cómo te llamas y cuántos años tienes? Para empezar nuestra aventura.";
      }
      speakText(welcome);
      addMessage("scooby", welcome);
    } else {
      updateStatus("ready", "Conversación recuperada");
    }
  }, 1000);
};
