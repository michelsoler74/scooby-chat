import SpeechService from "./services/SpeechService.js";
import HuggingFaceService from "./services/HuggingFaceService.js";
import { UIService } from "./services/UIService.js";

class ScoobyApp {
  constructor() {
    this.isInitialized = false;
    this.isProcessing = false;
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
      this.uiService.updateButtonStates(true, false);
      this.uiService.showSilentScooby();
    };

    this.speechService.onSpeechEnd = () => {
      console.log("Reconocimiento finalizado");
      this.uiService.updateButtonStates(false, false);
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
        this.uiService.updateButtonStates(false, false);
        return;
      }

      this.uiService.showWarning(errorMessage);
      this.uiService.updateButtonStates(false, false);
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
          this.uiService.updateButtonStates(false, false);
        }
      },

      onStop: () => {
        // Detener todos los procesos
        if (this.speechService) {
          this.speechService.stopListening();
          this.speechService.stopSpeaking();
        }
        this.isProcessing = false;
        this.uiService.showSilentScooby();
        this.uiService.updateButtonStates(false, false);
      },

      onResume: async () => {
        // Solo reanudar si no hay procesos en curso
        if (!this.isInitialized || this.isProcessing || !this.hasVoiceSupport)
          return;

        try {
          await this.speechService.startListening();
        } catch (error) {
          console.error("Error al reanudar reconocimiento:", error);
          this.uiService.updateButtonStates(false, false);
        }
      },
    });
  }

  async processUserInput(userMessage) {
    // Verificar si ya hay un proceso en curso
    if (this.isProcessing || !userMessage || !userMessage.trim()) return;

    // Actualizar estado
    this.isProcessing = true;
    this.uiService.updateButtonStates(false, true);

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
          await this.speechService.speak(response);
          this.uiService.showSilentScooby();
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
      this.uiService.updateButtonStates(false, false);
    }
  }
}

// Inicializar cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
  window.app = new ScoobyApp();
});
