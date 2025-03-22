/**
 * Servicio para manejar la interfaz de usuario
 */
export class UIService {
  constructor() {
    // Elementos de la UI
    this.conversation = document.getElementById("conversation");
    this.textInput = document.getElementById("text-input");
    this.sendButton = document.getElementById("send-btn");
    this.talkButton = document.getElementById("talk-btn");
    this.stopButton = document.getElementById("stop-btn");
    this.resumeButton = document.getElementById("resume-btn");
    this.micStatus = document.getElementById("mic-status");
    this.scoobySilent = document.getElementById("scooby-callado");
    this.scoobyTalking = document.getElementById("scooby-hablando");

    // Verificar elementos requeridos
    this.checkRequiredElements();

    // Inicializar videos
    this.initializeVideos();

    // Estado
    this.isListening = false;
    this.isSpeaking = false;

    // Configuración inicial de botones
    this.updateButtonStates(false, false);
  }

  checkRequiredElements() {
    const requiredElements = {
      "scooby-callado": this.scoobySilent,
      "scooby-hablando": this.scoobyTalking,
      conversation: this.conversation,
      "mic-status": this.micStatus,
      "talk-btn": this.talkButton,
      "stop-btn": this.stopButton,
      "resume-btn": this.resumeButton,
      "text-input": this.textInput,
      "send-btn": this.sendButton,
    };

    for (const [id, element] of Object.entries(requiredElements)) {
      if (!element) {
        console.error(`Elemento requerido no encontrado: ${id}`);
      }
    }
  }

  /**
   * Inicializa los videos de Scooby
   */
  initializeVideos() {
    if (this.scoobySilent) {
      this.scoobySilent.classList.remove("d-none");
      this.scoobySilent.play().catch((error) => {
        console.error("Error al reproducir el video silencioso:", error);
        this.showError("Error al cargar el video de Scooby");
      });
    }

    if (this.scoobyTalking) {
      this.scoobyTalking.classList.add("d-none");
    }
  }

  setupEventHandlers({ onTalk, onStop, onResume, onTextSubmit }) {
    this.talkButton?.addEventListener("click", onTalk);
    this.stopButton?.addEventListener("click", onStop);
    this.resumeButton?.addEventListener("click", onResume);

    // Manejar envío de texto
    const handleTextSubmit = () => {
      const text = this.textInput?.value.trim();
      if (text) {
        onTextSubmit(text);
        this.textInput.value = "";
      }
    };

    this.sendButton?.addEventListener("click", handleTextSubmit);
    this.textInput?.addEventListener("keypress", (event) => {
      if (event.key === "Enter") {
        handleTextSubmit();
      }
    });
  }

  /**
   * Actualiza el estado de los botones
   */
  updateButtonStates(isListening, isProcessing) {
    this.isListening = isListening;

    if (this.talkButton) {
      this.talkButton.disabled = isListening || isProcessing;
    }
    if (this.stopButton) {
      this.stopButton.disabled = !isListening;
    }
    if (this.resumeButton) {
      this.resumeButton.disabled = isListening || isProcessing;
    }
    if (this.sendButton) {
      this.sendButton.disabled = isProcessing;
    }
    if (this.textInput) {
      this.textInput.disabled = isProcessing;
    }

    // Cuando estamos escuchando, Scooby debe estar en silencio
    if (isListening) {
      this.showSilentScooby();
    }
  }

  /**
   * Actualiza el estado del micrófono
   */
  updateMicStatus(status, isError = false) {
    if (this.micStatus) {
      this.micStatus.innerHTML = `<small class="${
        isError ? "text-danger" : "text-success"
      }">${isError ? "❌" : "✅"} ${status}</small>`;
    }
  }

  /**
   * Agrega un mensaje del usuario al chat
   */
  addUserMessage(text) {
    this.addMessage("Usuario", text);
  }

  /**
   * Agrega un mensaje del sistema al chat
   */
  addSystemMessage(text) {
    this.addMessage("Scooby", text);
  }

  /**
   * Agrega un mensaje al chat
   */
  addMessage(sender, text) {
    if (!this.conversation) return;

    const messageDiv = document.createElement("div");
    messageDiv.className = `mensaje ${
      sender === "Usuario" ? "user-message" : "system-message"
    }`;
    messageDiv.innerHTML = `<strong>${sender}:</strong> ${text}`;
    this.conversation.appendChild(messageDiv);
    this.conversation.scrollTop = this.conversation.scrollHeight;
  }

  /**
   * Muestra un mensaje de error
   */
  showError(message) {
    const errorElement = document.createElement("div");
    errorElement.className = "error-message";
    errorElement.innerHTML = `<span class="error-icon">❌</span> ${message}`;

    // Si hay un error anterior, reemplazarlo
    const prevError = document.querySelector(".error-message");
    if (prevError) {
      prevError.remove();
    }

    // Añadir a la página
    document.body.appendChild(errorElement);

    // Eliminar después de 5 segundos
    setTimeout(() => {
      errorElement.remove();
    }, 5000);
  }

  showWarning(message) {
    const warningElement = document.createElement("div");
    warningElement.className = "warning-message";
    warningElement.innerHTML = `<span class="warning-icon">⚠️</span> ${message}`;

    // Si hay una advertencia anterior, reemplazarla
    const prevWarning = document.querySelector(".warning-message");
    if (prevWarning) {
      prevWarning.remove();
    }

    // Añadir a la página
    document.body.appendChild(warningElement);

    // Eliminar después de 5 segundos
    setTimeout(() => {
      warningElement.remove();
    }, 5000);
  }

  hideError() {
    const errorElement = document.querySelector(".error-message");
    if (errorElement) {
      errorElement.remove();
    }

    const warningElement = document.querySelector(".warning-message");
    if (warningElement) {
      warningElement.remove();
    }
  }

  showSpeakingScooby() {
    if (this.scoobySilent && this.scoobyTalking) {
      this.scoobySilent.classList.add("d-none");
      this.scoobyTalking.classList.remove("d-none");
      this.scoobyTalking.play();
    }
  }

  showSilentScooby() {
    if (this.scoobySilent && this.scoobyTalking) {
      this.scoobySilent.classList.remove("d-none");
      this.scoobyTalking.classList.add("d-none");
      this.scoobyTalking.pause();
      this.scoobySilent.play();
    }
  }
}
