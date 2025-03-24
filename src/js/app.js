import SpeechService from "./services/SpeechService.js";
import HuggingFaceService from "./services/HuggingFaceService.js";
import { UIService } from "./services/UIService.js";

class ScoobyApp {
  constructor() {
    this.isInitialized = false;
    this.isProcessing = false;
    this.isSpeaking = false;
    this.hasVoiceSupport = false;

    // Detectar tipo de dispositivo
    this.isMobile = window.innerWidth <= 768 || "ontouchstart" in window;
    console.log(
      `Inicializando Scooby en dispositivo ${
        this.isMobile ? "móvil" : "desktop"
      }`
    );
    console.log(
      `Dimensiones de ventana: ${window.innerWidth}x${window.innerHeight}`
    );

    // Añadir clases específicas al body para detectar el tipo de dispositivo
    document.body.classList.add(
      this.isMobile ? "mobile-device" : "desktop-device"
    );
    document.body.classList.add("user-interaction");

    // Configurar evento de interacción para navegadores que requieren interacción antes de reproducir audio
    const setupUserInteraction = () => {
      document.body.classList.add("user-interaction");
      // Asegurarnos de que el audio esté disponible después de interacción
      if (window.speechSynthesis) {
        window.speechSynthesis.getVoices();
        console.log("Voces cargadas después de interacción de usuario");
      }
    };

    // Agregar detectores para capturar la primera interacción del usuario
    document.addEventListener("click", setupUserInteraction, { once: true });
    document.addEventListener("touchstart", setupUserInteraction, {
      once: true,
    });
    document.addEventListener("keydown", setupUserInteraction, { once: true });

    // Inicializar
    this.initializeApp();
  }

  async initializeApp() {
    try {
      console.log("Iniciando aplicación...");

      // Inicializar servicios
      this.uiService = new UIService();
      this.speechService = new SpeechService();
      this.llmService = new HuggingFaceService();

      // Verificar si hay soporte de voz
      this.hasVoiceSupport = !!(
        window.SpeechRecognition || window.webkitSpeechRecognition
      );

      if (!this.hasVoiceSupport) {
        console.warn(
          "Tu navegador no soporta reconocimiento de voz. El modo de texto seguirá funcionando."
        );
        this.uiService.showWarning(
          "Tu navegador no soporta reconocimiento de voz. Puedes usar el modo de texto."
        );
      }

      // Configurar eventos
      this.setupEventHandlers();
      this.setupSpeechCallbacks();

      // Verificar conexión con el modelo
      await this.checkModelConnection();

      this.isInitialized = true;
      console.log("Aplicación inicializada correctamente");
    } catch (error) {
      console.error("Error al inicializar la aplicación:", error);
      this.uiService?.showError("Error al inicializar: " + error.message);
    }
  }

  async checkModelConnection() {
    try {
      await this.llmService.checkConnection();
      this.uiService.addMessage(
        "Sistema",
        "✅ Conectado a Scooby-Doo Amigo Mentor correctamente"
      );

      // Forzar el nuevo mensaje de bienvenida de Scooby
      // Aumentamos el tiempo de espera para dispositivos móviles
      const welcomeDelay = this.isMobile ? 2000 : 1000; // Mayor tiempo en móviles

      console.log(
        `Dispositivo ${
          this.isMobile ? "móvil" : "desktop"
        } detectado, mostrando bienvenida en ${welcomeDelay}ms`
      );

      // Guardamos una referencia al mensaje para verificar después
      let welcomeMessageShown = false;

      // Primera llamada con tiempo normal
      setTimeout(async () => {
        await this.showWelcomeMessage();
        welcomeMessageShown = true;
      }, welcomeDelay);

      // Mecanismo de seguridad: si después de 5 segundos no se mostró, forzar
      if (this.isMobile) {
        setTimeout(() => {
          if (!welcomeMessageShown) {
            console.log(
              "MECANISMO DE SEGURIDAD: Forzando mensaje de bienvenida en móvil"
            );
            this.showWelcomeMessage();
          }
        }, 5000);
      }
    } catch (error) {
      console.error("Error de conexión con el modelo:", error);
      this.uiService.showError(
        "No se pudo conectar con el modelo: " + error.message
      );
      throw error;
    }
  }

  /**
   * Método dedicado para mostrar el mensaje de bienvenida
   * Extraído para permitir múltiples llamadas si es necesario
   */
  async showWelcomeMessage() {
    console.log(
      `Enviando mensaje de bienvenida actualizado (dispositivo ${
        this.isMobile ? "móvil" : "desktop"
      })`
    );
    // Limpiar cualquier mensaje existente en la UI antes de mostrar el nuevo
    const existingMessages = document.querySelectorAll(".system-message");
    if (existingMessages.length > 1) {
      // Si ya hay mensajes del sistema, eliminar el último (que sería el de bienvenida)
      existingMessages[existingMessages.length - 1].remove();
    }

    const welcomeMessage =
      "¡Scooby-dooby-doo! ¡Hola! Me llamo Scooby y soy tu amigo mentor. ¿Cómo te llamas y cuántos años tienes? ¡Así podré adaptar mis respuestas para ti!";

    // Mostrar el mensaje en la UI, indicando que es un mensaje de bienvenida
    this.uiService.addSystemMessage(welcomeMessage, true);

    // Asegurarnos de que la síntesis de voz se ejecute y sea visible
    console.log("INICIANDO SÍNTESIS DE VOZ PARA MENSAJE DE BIENVENIDA");
    if (this.speechService) {
      try {
        // Mostrar el Scooby hablando visualmente
        this.uiService.showSpeakingScooby();
        this.isSpeaking = true;
        this.uiService.updateButtonStates(false, false, true);

        // Reproducir el mensaje con una segunda espera para asegurar que las voces estén cargadas
        // Usar mayor tiempo de espera en móviles
        await new Promise((resolve) =>
          setTimeout(resolve, this.isMobile ? 800 : 200)
        );

        // Intentar reproducir la voz y loggear todo el proceso
        console.log("Reproduciendo mensaje de bienvenida en voz alta");

        const speakingPromise = this.speechService.speak(welcomeMessage);
        await speakingPromise;

        // Mantener Scooby animado un poco más
        await new Promise((resolve) => setTimeout(resolve, 500));

        console.log("Mensaje de bienvenida reproducido correctamente");
      } catch (error) {
        console.error("Error al sintetizar voz de bienvenida:", error);
      } finally {
        // Asegurarnos de restablecer el estado correcto
        this.isSpeaking = false;
        this.uiService.showSilentScooby();
        this.uiService.updateButtonStates(false, false, false);
        console.log("Finalizada síntesis de voz de bienvenida");
      }
    } else {
      console.error("El servicio de voz no está disponible");
    }
  }

  /**
   * Reinicia la conversación después de limpiar el chat
   */
  reinitWelcomeMessage() {
    // Añadir mensaje de bienvenida de Scooby después de limpiar el chat
    setTimeout(async () => {
      const welcomeMessage =
        "¡Ruf-ruf! ¡Chat limpio y listo para nuevas aventuras! ¿Quieres contarme algo nuevo o preguntar sobre algún tema interesante?";

      // Mostrar el mensaje en la UI, indicando que es un mensaje de bienvenida
      this.uiService.addSystemMessage(welcomeMessage, true);

      // Leer el mensaje en voz alta
      console.log("INICIANDO SÍNTESIS DE VOZ TRAS LIMPIAR CHAT");
      if (this.speechService) {
        try {
          // Mostrar el Scooby hablando visualmente
          this.uiService.showSpeakingScooby();
          this.isSpeaking = true;
          this.uiService.updateButtonStates(false, false, true);

          // Pequeña espera para asegurar que la UI se ha actualizado
          await new Promise((resolve) =>
            setTimeout(resolve, this.isMobile ? 800 : 200)
          );

          // Intentar reproducir la voz
          console.log("Reproduciendo mensaje después de limpiar chat");

          const speakingPromise = this.speechService.speak(welcomeMessage);
          await speakingPromise;

          // Mantener Scooby animado un poco más
          await new Promise((resolve) => setTimeout(resolve, 500));

          console.log("Mensaje post-limpieza reproducido correctamente");
        } catch (error) {
          console.error(
            "Error al sintetizar voz después de limpiar chat:",
            error
          );
        } finally {
          // Asegurarnos de restablecer el estado correcto
          this.isSpeaking = false;
          this.uiService.showSilentScooby();
          this.uiService.updateButtonStates(false, false, false);
          console.log("Finalizada síntesis de voz post-limpieza");
        }
      } else {
        console.error(
          "El servicio de voz no está disponible para mensaje post-limpieza"
        );
      }
    }, 1000);
  }

  setupSpeechCallbacks() {
    // Solo configurar si el servicio existe
    if (!this.speechService) return;

    this.speechService.onSpeechStart = () => {
      console.log("Iniciando reconocimiento de voz");
      this.uiService.updateButtonStates(true, false, false);
      this.uiService.showSilentScooby();
    };

    this.speechService.onSpeechEnd = () => {
      console.log("Reconocimiento finalizado");
      this.uiService.updateButtonStates(false, false, this.isSpeaking);
    };

    // Nuevos callbacks para controlar el estado de la síntesis de voz
    this.speechService.onSpeakStart = () => {
      console.log("Iniciando síntesis de voz");
      this.isSpeaking = true;
      this.uiService.updateButtonStates(false, false, true);
    };

    this.speechService.onSpeakEnd = () => {
      console.log("Síntesis de voz finalizada");
      this.isSpeaking = false;
      this.uiService.updateButtonStates(false, false, false);
    };

    this.speechService.onResult = async (text) => {
      if (!text || !text.trim()) return;

      console.log("Procesando texto reconocido:", text);
      this.uiService.addUserMessage(text);
      await this.processUserInput(text);
    };

    this.speechService.onError = (errorMessage) => {
      console.warn("Error de reconocimiento:", errorMessage);

      // No mostrar errores de no-speech, solo actualizamos la UI
      if (errorMessage.includes("No se detectó ninguna voz")) {
        this.uiService.updateButtonStates(false, false, this.isSpeaking);
        return;
      }

      this.uiService.showWarning(errorMessage);
      this.uiService.updateButtonStates(false, false, this.isSpeaking);
      this.uiService.showSilentScooby();
    };
  }

  setupEventHandlers() {
    // Configurar el campo de texto y botón de enviar
    const textInput = document.getElementById("text-input");
    const sendButton = document.getElementById("send-btn");

    if (textInput && sendButton) {
      // Manejar envío por botón
      sendButton.addEventListener("click", () => {
        const text = textInput.value.trim();
        if (text) {
          this.uiService.addUserMessage(text);
          this.processUserInput(text);
          textInput.value = "";
        }
      });

      // Manejar envío por Enter
      textInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          const text = textInput.value.trim();
          if (text) {
            this.uiService.addUserMessage(text);
            this.processUserInput(text);
            textInput.value = "";
          }
        }
      });
    }

    this.uiService.setupEventHandlers({
      onTalk: async () => {
        // Verificar estado
        if (!this.isInitialized) {
          this.uiService.showWarning(
            "Espera un momento, la aplicación se está iniciando..."
          );
          return;
        }

        if (this.isProcessing) {
          console.log("Ya hay un proceso en curso...");
          return;
        }

        // Comprobar si hay soporte de voz
        if (!this.hasVoiceSupport) {
          this.uiService.showWarning(
            "Tu navegador no soporta reconocimiento de voz. Usa el modo de texto."
          );
          return;
        }

        // Intentar iniciar reconocimiento
        try {
          this.uiService.hideError();
          await this.speechService.startListening();
        } catch (error) {
          console.error("Error al iniciar reconocimiento:", error);
          this.uiService.showError(
            "Error al iniciar reconocimiento: " + error.message
          );
          this.uiService.updateButtonStates(false, false, this.isSpeaking);
        }
      },

      onStop: () => {
        // Detener todos los procesos
        if (this.speechService) {
          this.speechService.stopListening();
          this.speechService.stopSpeaking();
        }

        // Actualizar flags de estado
        this.isProcessing = false;
        this.isSpeaking = false;

        // Actualizar UI
        this.uiService.showSilentScooby();
        this.uiService.updateButtonStates(false, false, false);

        // Cancelar cualquier solicitud pendiente si es posible
        console.log("Deteniendo todos los procesos activos...");
      },

      onResume: async () => {
        // Solo reanudar si no hay procesos en curso
        if (!this.isInitialized || this.isProcessing || !this.hasVoiceSupport)
          return;

        try {
          await this.speechService.startListening();
        } catch (error) {
          console.error("Error al reanudar reconocimiento:", error);
          this.uiService.updateButtonStates(false, false, this.isSpeaking);
        }
      },

      onContinue: (userMessage, prevResponse) => {
        // Continuar la respuesta
        this.continuarRespuesta(userMessage, prevResponse);
      },

      onChatCleared: () => {
        // Mostrar mensaje de bienvenida después de limpiar el chat
        this.reinitWelcomeMessage();
      },
    });
  }

  async processUserInput(userMessage) {
    // Verificar si ya hay un proceso en curso
    if (this.isProcessing || !userMessage || !userMessage.trim()) return;

    // Actualizar estado
    this.isProcessing = true;
    this.uiService.updateButtonStates(false, true, this.isSpeaking);

    // Ocultar el botón de continuar al procesar un nuevo mensaje
    this.uiService.hideContinueButton();

    // Detener reconocimiento mientras procesamos
    if (this.speechService) {
      this.speechService.stopListening();
    }

    try {
      // Mostrar indicador de procesamiento
      this.uiService.addMessage("Sistema", "💭 Procesando tu mensaje...");

      // Obtener respuesta
      const response = await this.llmService.getResponse(userMessage);

      // Procesar respuesta
      if (response && response.trim()) {
        // Mostrar respuesta en UI
        this.uiService.addSystemMessage(response);

        // Sintetizar voz si está disponible
        if (this.speechService) {
          console.log("INICIANDO SÍNTESIS DE VOZ PARA RESPUESTA");
          try {
            // Mostrar el Scooby hablando visualmente
            this.uiService.showSpeakingScooby();
            this.isSpeaking = true;
            this.uiService.updateButtonStates(false, false, true);

            // Iniciar un temporizador para mantener Scooby hablando hasta que realmente termine
            const speakingPromise = this.speechService.speak(response);

            // Esperar a que termine la síntesis de voz
            await speakingPromise;

            // Mantener la animación un poco más antes de terminar
            await new Promise((resolve) => setTimeout(resolve, 500));

            console.log("Respuesta reproducida correctamente");
          } catch (error) {
            console.error("Error al sintetizar voz de respuesta:", error);
          } finally {
            // Asegurarnos de restablecer el estado correcto
            this.isSpeaking = false;
            this.uiService.showSilentScooby();
            this.uiService.updateButtonStates(false, false, false);
            console.log("Finalizada síntesis de voz de respuesta");
          }
        } else {
          console.error(
            "El servicio de voz no está disponible para síntesis de respuesta"
          );
        }
      } else {
        throw new Error("No se recibió respuesta del modelo");
      }
    } catch (error) {
      console.error("Error al procesar mensaje:", error);
      this.uiService.showError("Error: " + error.message);
      this.uiService.showSilentScooby();
    } finally {
      // Actualizar estado
      this.isProcessing = false;
      this.uiService.updateButtonStates(false, false, false);
    }
  }

  /**
   * Continúa una respuesta que puede haber quedado incompleta
   */
  async continuarRespuesta(userMessage, prevResponse) {
    if (this.isProcessing) return;

    // Actualizar estado
    this.isProcessing = true;
    this.uiService.updateButtonStates(false, true, this.isSpeaking);
    this.uiService.continuationInProgress = true;

    try {
      // Mostrar indicador de continuación
      this.uiService.addMessage(
        "Sistema",
        "💭 Continuando la respuesta anterior..."
      );

      // Extraer las primeras palabras de la respuesta anterior para verificar contexto
      const previousTopicIndicator = prevResponse.split(/[.!?]/)[0].trim();

      // Añadir texto para indicar que queremos continuación
      const promptContinuacion =
        userMessage + " (continúa tu respuesta anterior)";

      // Obtener respuesta
      const response = await this.llmService.getResponse(promptContinuacion);

      if (response && response.trim()) {
        // Verificar si la respuesta está relacionada con el tema anterior
        const isRelated = this.checkResponseRelevance(prevResponse, response);

        if (!isRelated) {
          console.warn(
            "La continuación parece no estar relacionada con la respuesta anterior"
          );
          // Añadir un mensaje sutil de sistema
          this.uiService.addMessage(
            "Sistema",
            "📝 Nota: Scooby quizás ha cambiado de tema. Si quieres seguir con el tema anterior, intenta hacer una pregunta más específica."
          );
        }

        // Mostrar la continuación como un nuevo mensaje
        this.uiService.addSystemMessage(response);

        // Sintetizar voz si está disponible
        if (this.speechService) {
          console.log("INICIANDO SÍNTESIS DE VOZ PARA CONTINUACIÓN");
          try {
            // Mostrar el Scooby hablando visualmente
            this.uiService.showSpeakingScooby();
            this.isSpeaking = true;
            this.uiService.updateButtonStates(false, false, true);

            // Pequeña espera para asegurar que la UI se ha actualizado
            await new Promise((resolve) => setTimeout(resolve, 200));

            // Intentar reproducir la voz y loggear todo el proceso
            console.log(
              "Reproduciendo continuación en voz alta:",
              response.substring(0, 50) + "..."
            );

            const speakingPromise = this.speechService.speak(response);
            await speakingPromise;

            // Mantener Scooby animado un poco más
            await new Promise((resolve) => setTimeout(resolve, 500));

            console.log("Continuación reproducida correctamente");
          } catch (error) {
            console.error("Error al sintetizar voz de continuación:", error);
          } finally {
            // Asegurarnos de restablecer el estado correcto
            this.isSpeaking = false;
            this.uiService.showSilentScooby();
            this.uiService.updateButtonStates(false, false, false);
            console.log("Finalizada síntesis de voz de continuación");
          }
        } else {
          console.error(
            "El servicio de voz no está disponible para síntesis de continuación"
          );
        }
      } else {
        throw new Error("No se recibió respuesta del modelo");
      }
    } catch (error) {
      console.error("Error al continuar respuesta:", error);
      this.uiService.showError("Error: " + error.message);
      this.uiService.showSilentScooby();
    } finally {
      // Actualizar estado
      this.isProcessing = false;
      this.isSpeaking = false;
      this.uiService.continuationInProgress = false;
      this.uiService.updateButtonStates(false, false, false);
    }
  }

  /**
   * Verifica si la nueva respuesta está relacionada con la anterior
   * @param {string} prevResponse - Respuesta anterior
   * @param {string} newResponse - Nueva respuesta (continuación)
   * @returns {boolean} - true si parece estar relacionada
   */
  checkResponseRelevance(prevResponse, newResponse) {
    // Extraer palabras clave de ambas respuestas (excluyendo palabras comunes)
    const commonWords = [
      "el",
      "la",
      "los",
      "las",
      "un",
      "una",
      "unos",
      "unas",
      "y",
      "o",
      "pero",
      "porque",
      "que",
      "cuando",
      "como",
      "si",
      "es",
      "son",
      "estar",
      "estar",
      "muy",
      "también",
      "esto",
      "eso",
      "aquello",
      "scooby",
      "galletas",
      "amigo",
      "woof",
      "ruh",
      "dooby",
    ];

    // Función para extraer palabras clave de un texto
    const extractKeywords = (text) => {
      return text
        .toLowerCase()
        .replace(/[^\wáéíóúüñ\s]/g, "") // Mantener solo letras, números y espacios
        .split(/\s+/)
        .filter((word) => word.length > 3 && !commonWords.includes(word));
    };

    const prevKeywords = extractKeywords(prevResponse);
    const newKeywords = extractKeywords(newResponse);

    // Contar coincidencias de palabras clave
    let matches = 0;
    for (const keyword of newKeywords) {
      if (prevKeywords.includes(keyword)) {
        matches++;
      }
    }

    // Si hay al menos 2 coincidencias o 15% de las palabras coinciden, consideramos que está relacionado
    const matchThreshold = Math.max(2, Math.floor(prevKeywords.length * 0.15));
    return matches >= matchThreshold;
  }
}

// Inicializar cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
  window.app = new ScoobyApp();
});
