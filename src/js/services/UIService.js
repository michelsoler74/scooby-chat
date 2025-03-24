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
    this.continueButton = document.getElementById("continue-btn");
    this.micStatus = document.getElementById("mic-status");
    this.scoobySilent = document.getElementById("scooby-callado");
    this.scoobyTalking = document.getElementById("scooby-hablando");

    // Estado para continuación de respuestas
    this.lastUserMessage = "";
    this.lastResponse = "";
    this.continuationInProgress = false;

    // Verificar elementos requeridos
    this.checkRequiredElements();

    // Inicializar videos
    this.initializeVideos();

    // Estado
    this.isListening = false;
    this.isSpeaking = false;

    // Configuración inicial de botones
    this.updateButtonStates(false, false, false);
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
      "continue-btn": this.continueButton,
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

  setupEventHandlers({
    onTalk,
    onStop,
    onResume,
    onTextSubmit,
    onContinue,
    onChatCleared,
  }) {
    this.talkButton?.addEventListener("click", onTalk);
    this.stopButton?.addEventListener("click", onStop);
    this.resumeButton?.addEventListener("click", onResume);

    // Botón continuar
    if (this.continueButton) {
      this.continueButton.addEventListener("click", () => {
        if (this.lastUserMessage && !this.continuationInProgress) {
          this.continueButton.classList.add("d-none");
          onContinue(this.lastUserMessage, this.lastResponse);
        }
      });
    }

    // Botón limpiar chat
    const clearChatButton = document.getElementById("clear-chat-btn");
    if (clearChatButton) {
      clearChatButton.addEventListener("click", () => {
        // Mostrar confirmación antes de limpiar
        if (
          confirm("¿Estás seguro de que quieres limpiar el historial de chat?")
        ) {
          this.clearChat(onChatCleared);
        }
      });
    }

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
   * @param {boolean} isListening - Si está escuchando
   * @param {boolean} isProcessing - Si está procesando
   * @param {boolean} isSpeaking - Si está hablando (sintetizando voz)
   */
  updateButtonStates(isListening, isProcessing, isSpeaking = false) {
    this.isListening = isListening;

    if (this.talkButton) {
      this.talkButton.disabled = isListening || isProcessing || isSpeaking;
    }
    if (this.stopButton) {
      // El botón de detener está habilitado si está escuchando O está hablando
      this.stopButton.disabled = !(isListening || isSpeaking);

      // Mostrar el botón de detener con un estilo destacado si está hablando
      if (isSpeaking) {
        this.stopButton.classList.add("btn-danger");
        this.stopButton.classList.remove("btn-secondary");
        this.stopButton.title = "Detener a Scooby";
      } else {
        this.stopButton.classList.remove("btn-danger");
        this.stopButton.classList.add("btn-secondary");
        this.stopButton.title = "Detener grabación";
      }
    }
    if (this.resumeButton) {
      this.resumeButton.disabled = isListening || isProcessing || isSpeaking;
    }
    if (this.sendButton) {
      this.sendButton.disabled = isProcessing || isSpeaking;
    }
    if (this.textInput) {
      this.textInput.disabled = isProcessing || isSpeaking;
    }
    if (this.continueButton) {
      this.continueButton.disabled = isProcessing || isSpeaking;
    }

    // Botón limpiar chat (siempre disponible)
    const clearChatButton = document.getElementById("clear-chat-btn");
    if (clearChatButton) {
      // Deshabilitar solo cuando está procesando una respuesta
      clearChatButton.disabled = isProcessing;
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
    this.lastUserMessage = text;
    this.addMessage("Usuario", text);
  }

  /**
   * Agrega un mensaje del sistema al chat
   * @param {string} text - El texto del mensaje
   * @param {boolean} isWelcome - Indica si es un mensaje de bienvenida
   * @param {boolean} returnElement - Si es true, devuelve el elemento DOM creado
   * @returns {HTMLElement|undefined} - El elemento DOM si returnElement es true
   */
  addSystemMessage(text, isWelcome = false, returnElement = false) {
    this.lastResponse = text;
    const messageElement = this.addMessage(
      "Scooby",
      text,
      isWelcome ? "welcome-message" : "",
      returnElement
    );

    // Verificar si la respuesta podría estar incompleta
    if (this.shouldShowContinueButton(text)) {
      this.showContinueButton();
    } else {
      this.hideContinueButton();
    }

    return returnElement ? messageElement : undefined;
  }

  /**
   * Determina si la respuesta podría estar incompleta
   */
  shouldShowContinueButton(text) {
    if (!text || text.length < 50) return false;

    // Palabras/frases que indican que la respuesta está completa
    const completionPhrases = [
      "espero haberte ayudado",
      "¿hay algo más",
      "¿tienes alguna otra pregunta",
      "¡hasta la próxima!",
      "¡nos vemos pronto!",
      "¡adiós!",
      "¡cuídate!",
    ];

    // Verificar si la respuesta contiene alguna frase de conclusión
    const lowerText = text.toLowerCase();
    const hasCompletionPhrase = completionPhrases.some((phrase) =>
      lowerText.includes(phrase)
    );

    // Si contiene una frase de conclusión, la respuesta está completa
    if (hasCompletionPhrase) return false;

    // Verificar si la respuesta tiene un final lógico
    const hasProperEnding =
      /[.!?]$/.test(text.trim()) && !text.trim().endsWith("...");
    const endsWithEllipsis = text.trim().endsWith("...");
    const reachedTokenLimit = text.length >= 100; // Cerca del límite de tokens

    // Analizar la estructura de la respuesta
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const lastSentenceIncomplete =
      sentences.length > 0 &&
      sentences[sentences.length - 1].length < 10 &&
      !hasProperEnding;

    // Si la última oración parece incompleta o hay muchas oraciones (posible continuación)
    return (
      !hasProperEnding ||
      endsWithEllipsis ||
      reachedTokenLimit ||
      lastSentenceIncomplete
    );
  }

  /**
   * Muestra el botón de continuar respuesta
   */
  showContinueButton() {
    if (this.continueButton) {
      this.continueButton.classList.remove("d-none");
    }
  }

  /**
   * Oculta el botón de continuar respuesta
   */
  hideContinueButton() {
    if (this.continueButton) {
      this.continueButton.classList.add("d-none");
    }
  }

  /**
   * Agrega un mensaje al chat
   * @param {string} sender - El remitente del mensaje
   * @param {string} text - El texto del mensaje
   * @param {string} additionalClass - Clase adicional opcional para el mensaje
   * @param {boolean} returnElement - Si es true, devuelve el elemento DOM creado
   * @returns {HTMLElement|undefined} - El elemento DOM si returnElement es true
   */
  addMessage(sender, text, additionalClass = "", returnElement = false) {
    if (!this.conversation) return;

    const messageDiv = document.createElement("div");
    messageDiv.className = `mensaje ${
      sender === "Usuario" ? "user-message" : "system-message"
    } ${additionalClass}`.trim();
    messageDiv.innerHTML = `<strong>${sender}:</strong> ${text}`;
    this.conversation.appendChild(messageDiv);

    // Asegurarnos de que el scroll siempre muestre el último mensaje
    this.scrollToBottom();

    return returnElement ? messageDiv : undefined;
  }

  /**
   * Desplaza el chat hasta el final para mostrar los mensajes más recientes
   * Con detección de dispositivo móvil para comportamiento específico
   */
  scrollToBottom() {
    if (!this.conversation) return;

    const isMobile = document.body.classList.contains("mobile-device");

    // Comportamiento diferente para móviles
    if (isMobile) {
      // Asegurar que el scroll llega al final inmediatamente
      this.conversation.scrollTop = this.conversation.scrollHeight;

      // Y también después de un momento para evitar problemas con la carga de contenido
      setTimeout(() => {
        this.conversation.scrollTop = this.conversation.scrollHeight;
      }, 100);

      // Un tercer intento después de más tiempo por si acaso
      setTimeout(() => {
        this.conversation.scrollTop = this.conversation.scrollHeight;
      }, 500);
    } else {
      // En desktop solo necesitamos el comportamiento básico
      this.conversation.scrollTop = this.conversation.scrollHeight;
      setTimeout(() => {
        this.conversation.scrollTop = this.conversation.scrollHeight;
      }, 100);
    }
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

  /**
   * Muestra un mensaje de advertencia
   */
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

    // Eliminar después de 8 segundos
    setTimeout(() => {
      warningElement.remove();
    }, 8000);
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
      console.log("Mostrando Scooby hablando");

      try {
        // Primero pausamos el video silencioso
        this.scoobySilent.pause();
        this.scoobySilent.classList.add("d-none");

        // Luego mostramos y reproducimos el video hablando
        this.scoobyTalking.classList.remove("d-none");

        // Asegurar que el video se reproduce desde el principio
        this.scoobyTalking.currentTime = 0;

        // Configurar el video para que se repita mientras Scooby habla
        this.scoobyTalking.loop = true;

        // Añadir clase al body para destacar que Scooby está hablando
        document.body.classList.add("scooby-is-speaking");

        // Crear una promesa para manejar la reproducción
        const playPromise = this.scoobyTalking.play();

        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            console.error(
              "Error al reproducir video de Scooby hablando:",
              error
            );
            // En caso de error, mostrar al menos el Scooby silencioso
            this.showSilentScooby();
          });
        }
      } catch (error) {
        console.error("Error al mostrar Scooby hablando:", error);
        // En caso de error, intentar mostrar el Scooby silencioso
        this.scoobySilent.classList.remove("d-none");
        this.scoobyTalking.classList.add("d-none");
      }
    } else {
      console.warn("No se pueden encontrar los elementos de video de Scooby");
    }
  }

  showSilentScooby() {
    if (this.scoobySilent && this.scoobyTalking) {
      console.log("Mostrando Scooby callado");

      try {
        // Primero pausamos el video hablando
        this.scoobyTalking.pause();
        this.scoobyTalking.classList.add("d-none");

        // Luego mostramos y reproducimos el video silencioso
        this.scoobySilent.classList.remove("d-none");

        // Asegurar que el video se reproduce desde el principio
        this.scoobySilent.currentTime = 0;

        // Quitar clase del body cuando Scooby deja de hablar
        document.body.classList.remove("scooby-is-speaking");

        // Crear una promesa para manejar la reproducción
        const playPromise = this.scoobySilent.play();

        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            console.error(
              "Error al reproducir video de Scooby callado:",
              error
            );
          });
        }
      } catch (error) {
        console.error("Error al mostrar Scooby callado:", error);
      }
    } else {
      console.warn("No se pueden encontrar los elementos de video de Scooby");
    }
  }

  /**
   * Limpia el historial de chat del área de conversación
   * @param {function} onChatCleared - Callback a ejecutar después de limpiar el chat
   */
  clearChat(onChatCleared = null) {
    // Verificar que existe el elemento de conversación
    if (!this.conversation) return;

    // Limpiar todos los mensajes del chat excepto mensajes del sistema importantes
    while (this.conversation.firstChild) {
      this.conversation.removeChild(this.conversation.firstChild);
    }

    // Reiniciar los mensajes almacenados
    this.lastUserMessage = "";
    this.lastResponse = "";

    // Ocultar el botón de continuar
    this.hideContinueButton();

    // Mostrar mensaje de que el chat ha sido limpiado
    this.addMessage("Sistema", "✨ El chat ha sido limpiado");
    console.log("Chat limpiado");

    // Ejecutar callback si existe
    if (typeof onChatCleared === "function") {
      onChatCleared();
    }
  }
}
