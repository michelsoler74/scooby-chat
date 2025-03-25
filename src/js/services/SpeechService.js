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

    // Hugging Face API
    this.HUGGINGFACE_API_KEY =
      localStorage.getItem("HUGGINGFACE_API_KEY") || "";
    this.TTS_MODEL = "facebook/mms-tts-spa"; // Modelo gratuito para español

    // NUEVO: Control de fallos para la API
    this.huggingFaceFailures = 0;
    this.maxHuggingFaceFailures = 2; // Después de 2 fallos, usar solo Web Speech
    this.useHuggingFace = this.HUGGINGFACE_API_KEY !== "";

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

    console.log(
      `SpeechService inicializado, useHuggingFace: ${this.useHuggingFace}`
    );
  }

  initSynthesis() {
    try {
      // Cargar voces
      const loadVoices = () => {
        const voices = this.synthesis.getVoices();
        if (voices.length > 0) {
          this.setVoice(voices);
          console.log(`Voces cargadas: ${voices.length}`);
          return true;
        }
        return false;
      };

      // Intento inicial de cargar voces
      if (!loadVoices()) {
        console.log(
          "No se pudieron cargar las voces inmediatamente, esperando evento onvoiceschanged"
        );

        // Configurar un listener para cuando las voces estén disponibles
        this.synthesis.onvoiceschanged = () => {
          loadVoices();
        };

        // Como respaldo, intentar cargar las voces después de un breve retraso
        setTimeout(() => {
          if (!this.selectedVoice) {
            console.log("Intentando cargar voces después de timeout");
            loadVoices();
          }
        }, 1000);
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

  /**
   * Reconocimiento de voz utilizando la API de Hugging Face
   * @param {Blob} audioBlob - El audio grabado para transcribir
   * @returns {Promise<string>} - Texto transcrito
   */
  async recognizeWithHuggingFace(audioBlob) {
    if (!this.HUGGINGFACE_API_KEY || !this.useHuggingFace) {
      console.warn(
        "No hay API key para Hugging Face o se ha desactivado, no se puede usar la API de reconocimiento"
      );
      return null;
    }

    try {
      console.log("Iniciando reconocimiento con Hugging Face...");

      const STT_MODEL = "openai/whisper-medium";
      const formData = new FormData();
      formData.append("audio", audioBlob, "audio.wav");

      const response = await fetch(
        `https://api-inference.huggingface.co/models/${STT_MODEL}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.HUGGINGFACE_API_KEY}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        this.huggingFaceFailures++;
        console.error(
          `Error en Hugging Face STT: ${response.status} - Fallos: ${this.huggingFaceFailures}`
        );

        // Si hay demasiados fallos, desactivar Hugging Face temporalmente
        if (this.huggingFaceFailures >= this.maxHuggingFaceFailures) {
          console.warn(
            `Demasiados fallos (${this.huggingFaceFailures}), desactivando Hugging Face temporalmente`
          );
          this.useHuggingFace = false;
        }

        throw new Error(
          `Error en Hugging Face STT: ${response.status} ${response.statusText}`
        );
      }

      // Éxito, resetear contador de fallos
      this.huggingFaceFailures = 0;

      const result = await response.json();
      console.log("Resultado del reconocimiento:", result);

      // Registrar llamada a la API
      if (window.monitorUI) {
        window.monitorUI.trackCall("stt");
      }

      return result.text || "";
    } catch (error) {
      console.error("Error en reconocimiento con Hugging Face:", error);
      return null;
    }
  }

  /**
   * Inicia la escucha y grabación de audio para procesar con Hugging Face si está disponible
   */
  async startListening() {
    if (this.isListening) {
      console.log("Ya está escuchando, ignorando solicitud");
      return;
    }

    try {
      this.isListening = true;

      if (this.onSpeechStart) {
        this.onSpeechStart();
      }

      // Si tenemos API key de Hugging Face y no ha habido demasiados fallos, usarla
      if (this.HUGGINGFACE_API_KEY && this.useHuggingFace) {
        try {
          console.log("Iniciando grabación para Hugging Face Whisper...");
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
          const mediaRecorder = new MediaRecorder(stream);
          const audioChunks = [];

          // Configurar event handlers
          mediaRecorder.addEventListener("dataavailable", (event) => {
            audioChunks.push(event.data);
          });

          mediaRecorder.addEventListener("stop", async () => {
            console.log("Grabación finalizada, procesando...");
            const audioBlob = new Blob(audioChunks, { type: "audio/wav" });

            // Procesar con Hugging Face
            const recognizedText = await this.recognizeWithHuggingFace(
              audioBlob
            );

            if (recognizedText) {
              console.log("Texto reconocido con Hugging Face:", recognizedText);
              if (this.onResult) {
                this.onResult(recognizedText);
              }
            } else {
              console.log(
                "Fallo en reconocimiento con Hugging Face, intentando con Web Speech..."
              );
              // Fallback a reconocimiento local si falló
              this.startWebSpeechRecognition();
            }

            // Detener la grabación
            stream.getTracks().forEach((track) => track.stop());
            this.isListening = false;
            if (this.onSpeechEnd) {
              this.onSpeechEnd();
            }
          });

          // Iniciar grabación por 7 segundos (aumentado para mejor captura)
          mediaRecorder.start();
          console.log("Grabación iniciada, escuchando durante 7 segundos");
          setTimeout(() => {
            if (mediaRecorder.state === "recording") {
              console.log("Deteniendo grabación después de 7s");
              mediaRecorder.stop();
            }
          }, 7000);
        } catch (error) {
          console.error("Error en grabación para Hugging Face:", error);
          // Fallback a la implementación del navegador
          this.startWebSpeechRecognition();
        }
      } else {
        console.log("Usando reconocimiento de Web Speech directamente");
        // Usar la implementación del navegador
        this.startWebSpeechRecognition();
      }
    } catch (error) {
      console.error("Error iniciando reconocimiento:", error);
      this.isListening = false;

      if (this.onError) {
        this.onError(error);
      }

      if (this.onSpeechEnd) {
        this.onSpeechEnd();
      }
    }
  }

  /**
   * Inicia el reconocimiento de voz usando la API Web Speech
   */
  startWebSpeechRecognition() {
    try {
      // Comprobar soporte
      if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
        throw new Error("Este navegador no soporta reconocimiento de voz");
      }

      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();

      // Configuración
      this.recognition.lang = this.selectedLanguage;
      this.recognition.continuous = false;
      this.recognition.interimResults = true;

      console.log(
        "Iniciando Web Speech Recognition con idioma:",
        this.selectedLanguage
      );

      // Eventos
      this.recognition.onstart = () => {
        console.log("Reconocimiento Web Speech iniciado");
      };

      this.recognition.onresult = (event) => {
        const finalTranscript = Array.from(event.results)
          .map((result) => result[0].transcript)
          .join(" ");

        console.log("Texto reconocido con Web Speech:", finalTranscript);

        if (this.onResult && finalTranscript.trim()) {
          this.onResult(finalTranscript);
        }
      };

      this.recognition.onerror = (event) => {
        console.error("Error en reconocimiento Web Speech:", event.error);

        if (this.onError) {
          this.onError(new Error(`Error en reconocimiento: ${event.error}`));
        }
      };

      this.recognition.onend = () => {
        console.log("Reconocimiento Web Speech finalizado");
        this.isListening = false;

        if (this.onSpeechEnd) {
          this.onSpeechEnd();
        }
      };

      // Iniciar reconocimiento
      this.recognition.start();
    } catch (error) {
      console.error("Error iniciando Web Speech:", error);
      this.isListening = false;

      if (this.onError) {
        this.onError(error);
      }

      if (this.onSpeechEnd) {
        this.onSpeechEnd();
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

  /**
   * Sintetiza voz utilizando Hugging Face API
   * @param {string} text - Texto a sintetizar
   * @returns {Promise<ArrayBuffer>} - Audio en formato ArrayBuffer
   */
  async synthesizeWithHuggingFace(text) {
    if (!this.HUGGINGFACE_API_KEY) {
      console.warn(
        "No hay API key para Hugging Face, utilizando síntesis local"
      );
      return null;
    }

    try {
      console.log("Sintetizando voz con Hugging Face...");
      const response = await fetch(
        `https://api-inference.huggingface.co/models/${this.TTS_MODEL}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.HUGGINGFACE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inputs: text,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Error en Hugging Face TTS: ${response.status} ${response.statusText}`
        );
      }

      const audioArrayBuffer = await response.arrayBuffer();
      console.log("Síntesis con Hugging Face completada exitosamente");

      // Registrar llamada a la API
      if (window.monitorUI) {
        window.monitorUI.trackCall("tts");
      }

      return audioArrayBuffer;
    } catch (error) {
      console.error("Error al sintetizar con Hugging Face:", error);
      return null;
    }
  }

  /**
   * Sintetiza la respuesta utilizando Hugging Face o SpeechSynthesis como fallback
   * @param {string} responseText - Texto a sintetizar
   * @param {Object} options - Opciones adicionales
   */
  async speak(text, options = {}) {
    if (this.isSpeaking && !options.force) {
      console.log("Ya hay una síntesis en curso, deteniéndola primero");
      this.stopSpeaking();
      // Esperar un momento para asegurar que se ha detenido
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    if (!text || !text.trim()) {
      console.warn("Texto vacío para sintetizar, ignorando");
      return;
    }

    try {
      // Limpiar el texto para mejorar la síntesis
      const cleanText = text
        .replace(/\b(https?:\/\/\S+)\b/gi, "") // Eliminar URLs
        .replace(/([!.?])\s*\1+/g, "$1") // Reducir signos de puntuación repetidos
        .trim();

      console.log(
        "Iniciando síntesis de voz con texto:",
        cleanText.substring(0, 50) + "...",
        "Longitud del texto:",
        cleanText.length
      );

      // Marcar que estamos hablando para la UI
      this.isSpeaking = true;
      if (typeof this.onSpeakStart === "function") {
        this.onSpeakStart();
      }

      // Intentar primero con Hugging Face
      const audioBuffer = await this.synthesizeWithHuggingFace(cleanText);

      if (audioBuffer) {
        // Reproducir el audio de Hugging Face
        const audioBlob = new Blob([audioBuffer], { type: "audio/mpeg" });
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        return new Promise((resolve) => {
          audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            this.isSpeaking = false;
            if (typeof this.onSpeakEnd === "function") {
              this.onSpeakEnd();
            }
            resolve();
          };

          audio.onerror = (err) => {
            console.error("Error reproduciendo audio:", err);
            URL.revokeObjectURL(audioUrl);
            this.isSpeaking = false;
            if (typeof this.onSpeakEnd === "function") {
              this.onSpeakEnd();
            }
            resolve();
          };

          audio.play().catch((err) => {
            console.error("Error iniciando reproducción:", err);
            // Fallback a síntesis local
            this.speakWithLocalSynthesis(cleanText, options).then(resolve);
          });
        });
      } else {
        // Fallback a síntesis local
        return this.speakWithLocalSynthesis(cleanText, options);
      }
    } catch (error) {
      console.error("Error en síntesis de voz:", error);
      this.isSpeaking = false;
      if (typeof this.onSpeakEnd === "function") {
        this.onSpeakEnd();
      }
    }
  }

  /**
   * Utiliza la síntesis de voz del navegador como fallback
   * @param {string} text - Texto a sintetizar
   * @param {Object} options - Opciones adicionales
   */
  async speakWithLocalSynthesis(text, options = {}) {
    // Asegurarnos de que la síntesis está disponible
    if (!this.synthesis) {
      console.error("SpeechSynthesis no está disponible en este navegador");
      throw new Error("Síntesis de voz no disponible");
    }

    // Verificar si hay un estado pendiente (podría bloquear nuevas pronunciaciones)
    if ((this.synthesis.speaking || this.synthesis.pending) && !options.force) {
      console.log("Hay síntesis pendiente o en progreso, limpiando...");
      this.synthesis.cancel();
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    console.log("Usando TTS del navegador como fallback");
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = this.selectedLanguage;
    utterance.rate = options.rate || 0.9;
    utterance.pitch = 1.1;
    utterance.volume = options.volume || 1.0;

    // Establecer voz en español si está disponible
    if (this.selectedVoice) {
      console.log("Usando voz seleccionada:", this.selectedVoice.name);
      utterance.voice = this.selectedVoice;
    } else {
      // Intentar encontrar una voz en español
      const voices = this.synthesis.getVoices();
      const spanishVoice =
        voices.find(
          (voice) =>
            voice.lang.startsWith("es") ||
            voice.name.includes("Spanish") ||
            voice.name.includes("español")
        ) || (voices.length > 0 ? voices[0] : null);

      if (spanishVoice) {
        utterance.voice = spanishVoice;
        this.selectedVoice = spanishVoice;
      }
    }

    // Esperar a que termine (Promise)
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

      // Iniciar síntesis
      this.synthesis.speak(utterance);

      // Seguridad: resolver después de un tiempo máximo
      const timeoutDuration = Math.max(
        10000,
        text.length * 70 * (1 / (options.rate || 0.9)) + 3000
      );
      setTimeout(() => {
        if (this.isSpeaking) {
          this.isSpeaking = false;
          if (typeof this.onSpeakEnd === "function") {
            this.onSpeakEnd();
          }
          resolve();
        }
      }, timeoutDuration);
    });
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
