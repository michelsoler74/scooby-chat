/**
 * Servicio para manejar el reconocimiento de voz y síntesis de voz
 */
class SpeechService {
  constructor() {
    // Propiedades básicas
    this.recognition = null;
    this.synthesis = window.speechSynthesis;
    this.isListening = false;
    this.isSpeaking = false;
    this.retryCount = 0;
    this.maxRetries = 3;

    // Callbacks
    this.onSpeechStart = null;
    this.onSpeechEnd = null;
    this.onResult = null;
    this.onError = null;
    this.onSpeakStart = null;
    this.onSpeakEnd = null;

    // Configuración
    this.selectedVoice = null;
    this.selectedLanguage = "es-ES";

    // Inicialización
    this.initSynthesis();
    this.initRecognition();
  }

  initSynthesis() {
    try {
      // Cargar voces
      const voices = this.synthesis.getVoices();
      if (voices.length > 0) {
        this.setVoice(voices);
      } else {
        this.synthesis.onvoiceschanged = () => {
          const voices = this.synthesis.getVoices();
          this.setVoice(voices);
        };
      }
    } catch (error) {
      console.error("Error al inicializar síntesis:", error);
    }
  }

  setVoice(voices) {
    this.selectedVoice =
      voices.find((voice) => voice.lang.startsWith("es")) || voices[0];
    console.log(
      "Voz seleccionada:",
      this.selectedVoice ? this.selectedVoice.name : "ninguna"
    );
  }

  initRecognition() {
    try {
      // Comprobar soporte
      if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
        console.error("Este navegador no soporta reconocimiento de voz");
        return;
      }

      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();

      // Configuración optimizada para mejor detección
      this.recognition.lang = this.selectedLanguage;
      this.recognition.continuous = true; // Mantener escuchando continuamente
      this.recognition.interimResults = true; // Obtener resultados parciales
      this.recognition.maxAlternatives = 3; // Obtener múltiples alternativas

      // Eventos básicos
      this.recognition.onstart = () => {
        console.log("Reconocimiento iniciado");
        this.isListening = true;
        if (this.onSpeechStart) this.onSpeechStart();

        // Reiniciar contador de reintentos
        this.retryCount = 0;
      };

      this.recognition.onend = () => {
        console.log("Reconocimiento finalizado");
        this.isListening = false;

        // Reintentar automáticamente si no se alcanzó el máximo de intentos
        if (this.retryCount < this.maxRetries) {
          console.log(
            `Reintentando reconocimiento (intento ${this.retryCount + 1})`
          );
          this.retryCount++;

          // Esperar un momento antes de reintentar
          setTimeout(() => {
            if (!this.isSpeaking) {
              // Solo reintentar si no está hablando
              this.startListening();
            }
          }, 500);
        } else {
          if (this.onSpeechEnd) this.onSpeechEnd();
        }
      };

      this.recognition.onresult = (event) => {
        let finalTranscript = "";
        let interimTranscript = "";

        // Procesar todos los resultados
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        // Mostrar transcripción parcial para depuración
        if (interimTranscript) {
          console.log("Texto parcial:", interimTranscript);
        }

        // Procesar texto final si existe
        if (finalTranscript) {
          console.log("Texto final reconocido:", finalTranscript);
          if (this.onResult && finalTranscript.trim()) {
            this.onResult(finalTranscript);
          }
        }
      };

      this.recognition.onerror = (event) => {
        console.error("Error en reconocimiento:", event.error, event);

        // Mantener el estado de escucha si es un error recuperable
        if (event.error === "no-speech") {
          console.warn("No se detectó voz, seguir escuchando");
          // No cambiar isListening para que el sistema siga intentando
        } else {
          this.isListening = false;

          if (this.onError) {
            let message = "Error de reconocimiento de voz";
            if (event.error === "no-speech") {
              message =
                "No se detectó voz. Intenta hablar más fuerte y cerca del micrófono.";
            } else if (event.error === "audio-capture") {
              message =
                "No se detectó micrófono. Verifica que esté conectado y permitido.";
            } else if (event.error === "not-allowed") {
              message =
                "Permiso de micrófono denegado. Haz clic en el icono de cámara en la barra de direcciones y permite el micrófono.";
            } else {
              message = `Error de reconocimiento: ${event.error}`;
            }
            this.onError(message);
          }
        }
      };

      console.log(
        "Reconocimiento de voz inicializado con configuración mejorada"
      );
    } catch (error) {
      console.error("Error al inicializar reconocimiento:", error);
    }
  }

  async startListening() {
    if (!this.recognition) {
      if (this.onError) this.onError("Reconocimiento de voz no disponible");
      return;
    }

    try {
      if (this.isListening) {
        this.stopListening();
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      this.retryCount = 0;
      console.log("Iniciando reconocimiento de voz...");
      await this.recognition.start();
    } catch (error) {
      console.error("Error al iniciar reconocimiento:", error);
      this.isListening = false;

      // Reintentar una vez más si el error es "already started"
      if (error.message && error.message.includes("already started")) {
        console.log("Reconocimiento ya iniciado, reiniciando...");
        this.stopListening();
        setTimeout(() => this.startListening(), 500);
      } else if (this.onError) {
        this.onError(error.message);
      }
    }
  }

  stopListening() {
    if (this.recognition) {
      try {
        if (this.isListening) {
          console.log("Deteniendo reconocimiento...");
          this.recognition.stop();
        }
        this.isListening = false;
        this.retryCount = this.maxRetries; // Evitar reintentos automáticos
      } catch (error) {
        console.error("Error al detener reconocimiento:", error);
      }
    }
  }

  async speak(text) {
    if (this.isSpeaking) {
      this.stopSpeaking();
    }

    if (!text || !text.trim()) return;

    try {
      const cleanText = text.replace(/\b(https?:\/\/\S+)\b/gi, "").trim();

      const utterance = new SpeechSynthesisUtterance(cleanText);

      if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
      }

      utterance.rate = 0.9;
      utterance.pitch = 1.1;
      utterance.volume = 1.0;

      utterance.onstart = () => {
        console.log("Iniciando síntesis de voz");
        this.isSpeaking = true;
        if (typeof this.onSpeakStart === "function") {
          this.onSpeakStart();
        }
      };

      utterance.onend = () => {
        console.log("Síntesis de voz finalizada");
        this.isSpeaking = false;
        if (typeof this.onSpeakEnd === "function") {
          this.onSpeakEnd();
        }
      };

      utterance.onerror = (err) => {
        console.error("Error en síntesis de voz:", err);
        this.isSpeaking = false;
        if (typeof this.onSpeakEnd === "function") {
          this.onSpeakEnd();
        }
      };

      this.synthesis.speak(utterance);

      return new Promise((resolve) => {
        utterance.onend = () => {
          this.isSpeaking = false;
          if (typeof this.onSpeakEnd === "function") {
            this.onSpeakEnd();
          }
          resolve();
        };

        utterance.onerror = () => {
          this.isSpeaking = false;
          if (typeof this.onSpeakEnd === "function") {
            this.onSpeakEnd();
          }
          resolve();
        };
      });
    } catch (error) {
      console.error("Error al sintetizar voz:", error);
      this.isSpeaking = false;
      if (typeof this.onSpeakEnd === "function") {
        this.onSpeakEnd();
      }
      throw error;
    }
  }

  stopSpeaking() {
    if (this.synthesis) {
      console.log("Deteniendo síntesis de voz");
      this.synthesis.cancel();
      this.isSpeaking = false;

      if (typeof this.onSpeakEnd === "function") {
        this.onSpeakEnd();
      }
    }
  }
}

export default SpeechService;
