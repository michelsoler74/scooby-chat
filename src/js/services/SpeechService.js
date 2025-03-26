/**
 * Servicio para manejar el reconocimiento de voz y síntesis de voz
 */
class SpeechService {
  constructor(apiKey = null) {
    this.apiKey = apiKey;
    this.recognition = null;
    this.isListening = false;
    this.isSpeechSynthesisSupported = "speechSynthesis" in window;
    this.isSpeechRecognitionSupported =
      "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
    this.useNativeSpeechRecognition = true; // Por defecto usar reconocimiento nativo
    this.fallbackToASRApi = true; // Permitir uso de API externa si el nativo falla
    this.voiceRecognitionErrors = 0;
    this.maxVoiceErrors = 3;
    this.recognitionCallbacks = {
      onStart: () => {},
      onResult: () => {},
      onError: () => {},
      onEnd: () => {},
    };
    this.synth = window.speechSynthesis;
    this.utterance = null;
    this.voices = [];

    this.checkBrowserCompatibility();
    this.initSpeechSynthesis();
  }

  /**
   * Verifica la compatibilidad del navegador con las API de voz
   * y establece las capacidades disponibles
   */
  checkBrowserCompatibility() {
    // Verificar soporte de reconocimiento de voz
    if (!this.isSpeechRecognitionSupported) {
      console.warn("Este navegador no soporta reconocimiento de voz nativo.");
      // Intentaremos usar la API externa solamente
      this.useNativeSpeechRecognition = false;

      // Mensaje específico para el usuario en la consola
      console.log(
        "%c ℹ️ Modo texto activado. El reconocimiento de voz no está disponible en este navegador.",
        "background: #FFF3CD; color: #856404; padding: 5px; border-radius: 3px;"
      );

      // Crear mensaje de advertencia visible
      this.showVoiceNotSupportedMessage();
    } else {
      console.log("Reconocimiento de voz soportado por el navegador");
    }

    // Verificar soporte de síntesis de voz
    if (!this.isSpeechSynthesisSupported) {
      console.warn("Este navegador no soporta síntesis de voz.");
    } else {
      console.log("Síntesis de voz soportada por el navegador");
    }
  }

  /**
   * Muestra un mensaje visible cuando el reconocimiento de voz no está disponible
   */
  showVoiceNotSupportedMessage() {
    // Crear un elemento para mostrar la advertencia
    setTimeout(() => {
      try {
        const warningBox = document.createElement("div");
        warningBox.className = "browser-warning";
        warningBox.style.cssText = `
          position: fixed;
          top: 10px;
          left: 50%;
          transform: translateX(-50%);
          background-color: #fff3cd;
          border: 1px solid #ffeeba;
          color: #856404;
          padding: 10px 15px;
          border-radius: 4px;
          z-index: 1050;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
          max-width: 90%;
        `;

        // Icono de advertencia
        const icon = document.createElement("span");
        icon.innerHTML = "⚠️";
        icon.style.fontSize = "20px";

        // Mensaje
        const message = document.createElement("div");
        message.innerHTML = `
          <strong>Tu navegador no soporta reconocimiento de voz.</strong><br>
          Usa el modo de texto o prueba con Chrome/Edge.
          <button id="voice-warning-close" style="background: none; border: none; color: #856404; float: right; cursor: pointer; font-weight: bold;">×</button>
        `;

        // Agregar elementos
        warningBox.appendChild(icon);
        warningBox.appendChild(message);

        // Agregar a la página
        document.body.appendChild(warningBox);

        // Configurar botón de cierre
        document
          .getElementById("voice-warning-close")
          .addEventListener("click", () => {
            warningBox.style.display = "none";
          });

        // Ocultar después de 10 segundos
        setTimeout(() => {
          warningBox.style.opacity = "0";
          warningBox.style.transition = "opacity 0.5s ease";
          setTimeout(() => warningBox.remove(), 500);
        }, 10000);
      } catch (error) {
        console.error("Error al mostrar mensaje de compatibilidad:", error);
      }
    }, 2000); // Esperar a que la página se cargue

    // También deshabilitar botones de voz
    setTimeout(() => {
      try {
        // Deshabilitar botón de hablar
        const talkBtn = document.getElementById("talk-btn");
        if (talkBtn) {
          talkBtn.disabled = true;
          talkBtn.title =
            "Reconocimiento de voz no soportado en este navegador";
          talkBtn.style.opacity = "0.6";
          talkBtn.style.cursor = "not-allowed";
        }

        // Asegurarse que el input de texto sea evidente
        const textInput = document.getElementById("text-input");
        if (textInput) {
          textInput.placeholder =
            "📝 Escribe tu mensaje aquí (reconocimiento de voz no disponible)";
          textInput.focus();

          // Resaltar el campo de texto
          textInput.style.boxShadow = "0 0 0 3px rgba(0, 123, 255, 0.3)";
          setTimeout(() => {
            textInput.style.transition = "box-shadow 0.5s ease";
            textInput.style.boxShadow = "none";
          }, 2000);
        }
      } catch (error) {
        console.error("Error al actualizar UI para modo de texto:", error);
      }
    }, 1000);
  }

  /**
   * Inicializa el sistema de síntesis de voz
   */
  initSpeechSynthesis() {
    if (this.isSpeechSynthesisSupported) {
      // Intentar cargar voces inmediatamente
      this.loadVoices();

      // Fallback para navegadores que cargan las voces asíncronamente
      if ("onvoiceschanged" in speechSynthesis) {
        speechSynthesis.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  // ... rest of the original code ...
}

export default SpeechService;
