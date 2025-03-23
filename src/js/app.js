import SpeechService from "./services/SpeechService.js";
import HuggingFaceService from "./services/HuggingFaceService.js";
import { UIService } from "./services/UIService.js";

class ScoobyApp {
  constructor() {
    this.isInitialized = false;
    this.isProcessing = false;
    this.isSpeaking = false;
    this.hasVoiceSupport = false;

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

      // Añadir mensaje de bienvenida de Scooby
      setTimeout(() => {
        this.uiService.addSystemMessage(
          "¡Yippie-yippie-yeeeaah! ¡Scooby-dooby-doo! ¡Hola amigo! ¡Qué alegría conocerte! Estoy listo para resolver misterios, hablar de aventuras o responder tus preguntas. ¡Las Scooby Galletas me dan super poderes para ayudarte!"
        );
      }, 1000);
    } catch (error) {
      console.error("Error de conexión con el modelo:", error);
      this.uiService.showError(
        "No se pudo conectar con el modelo: " + error.message
      );
      throw error;
    }
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
          this.uiService.showSpeakingScooby();
          this.isSpeaking = true;
          this.uiService.updateButtonStates(false, false, true);
          await this.speechService.speak(response);
          this.isSpeaking = false;
          this.uiService.showSilentScooby();
          this.uiService.updateButtonStates(false, false, false);
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
      this.isSpeaking = false;
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
          this.uiService.showSpeakingScooby();
          this.isSpeaking = true;
          this.uiService.updateButtonStates(false, false, true);
          await this.speechService.speak(response);
          this.isSpeaking = false;
          this.uiService.showSilentScooby();
          this.uiService.updateButtonStates(false, false, false);
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
