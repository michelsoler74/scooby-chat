/**
 * Servicio para manejar el reconocimiento de voz y síntesis de voz
 */
class SpeechService {
  constructor(apiKey = null) {
    this.apiKey = apiKey;
    this.recognition = null;
    this.isListening = false;
    this.isSpeechSynthesisSupported = "speechSynthesis" in window;
    this.isSpeechRecognitionSupported = !!(
      window.SpeechRecognition || window.webkitSpeechRecognition
    );
    this.useNativeSpeechRecognition = true;
    this.fallbackToASRApi = true;
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
    this.isVoiceLoaded = false;
    this.selectedVoice = null;
    this.preferredLang = "es-ES";

    this.onSpeechStart = null;
    this.onSpeechEnd = null;
    this.onSpeechError = null;
    this.onResult = null;
    this.onSpeakStart = null;
    this.onSpeakEnd = null;

    // Inicialización inmediata
    this.checkBrowserCompatibility();
    if (this.isSpeechRecognitionSupported) {
      this.initRecognition();
    }
  }

  /**
   * Verifica la compatibilidad del navegador con las APIs de voz
   */
  checkBrowserCompatibility() {
    // Verificar soporte de reconocimiento de voz
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    this.isSpeechRecognitionSupported = !!SpeechRecognition;

    // Verificar soporte de síntesis de voz
    this.isSpeechSynthesisSupported = "speechSynthesis" in window;

    console.log("Compatibilidad del navegador:", {
      reconocimiento: this.isSpeechRecognitionSupported,
      sintesis: this.isSpeechSynthesisSupported,
    });

    return this.isSpeechRecognitionSupported;
  }

  /**
   * Verifica si se puede usar el reconocimiento de voz
   */
  canUseVoiceRecognition() {
    return this.isSpeechRecognitionSupported;
  }

  /**
   * Inicializa el sistema de síntesis de voz
   */
  async initSpeechSynthesis() {
    if (!this.isSpeechSynthesisSupported) {
      console.warn("Este navegador no soporta síntesis de voz");
      return false;
    }

    try {
      console.log("Iniciando sistema de síntesis de voz...");

      // Asegurarse de que tenemos acceso al objeto de síntesis
      if (!this.synth) {
        this.synth = window.speechSynthesis;
      }

      // Intentar cargar voces inmediatamente
      const voices = this.synth.getVoices();
      if (voices && voices.length > 0) {
        console.log("Voces disponibles inmediatamente");
        this.loadVoices();
      }

      // Configurar evento onvoiceschanged
      return new Promise((resolve) => {
        if ("onvoiceschanged" in this.synth) {
          console.log("Esperando evento onvoiceschanged...");
          this.synth.onvoiceschanged = () => {
            this.loadVoices();
            resolve(true);
          };

          // Timeout por si el evento nunca se dispara
          setTimeout(() => {
            if (!this.isVoiceLoaded) {
              console.warn(
                "Timeout esperando voces, intentando cargar manualmente"
              );
              this.loadVoices();
              resolve(false);
            }
          }, 2000);
        } else {
          // Si no hay evento onvoiceschanged, intentar después de un delay
          setTimeout(() => {
            this.loadVoices();
            resolve(true);
          }, 100);
        }
      });
    } catch (error) {
      console.error("Error al inicializar síntesis de voz:", error);
      return false;
    }
  }

  /**
   * Carga las voces disponibles para la síntesis de voz
   * Corrige el error que estaba causando problemas
   */
  loadVoices() {
    try {
      if (!this.isSpeechSynthesisSupported) {
        console.warn("Síntesis de voz no soportada por este navegador");
        return;
      }

      // Obtener todas las voces disponibles
      const availableVoices = this.synth.getVoices();

      if (availableVoices && availableVoices.length > 0) {
        this.voices = availableVoices;
        this.isVoiceLoaded = true;
        console.log(`Voces cargadas: ${this.voices.length}`);

        // Intentar seleccionar una voz en español primero
        let spanishVoice = this.voices.find(
          (voice) =>
            voice.lang.includes(this.preferredLang) &&
            !voice.name.includes("Google")
        );

        // Si no hay voces en español, buscar una alternativa (Microsoft o predeterminada)
        if (!spanishVoice) {
          spanishVoice = this.voices.find(
            (voice) =>
              voice.name.includes("Microsoft") && voice.lang.includes("es")
          );
        }

        // Si aún no hay voz, usar la primera disponible
        this.selectedVoice = spanishVoice || this.voices[0];

        console.log(
          `Voz seleccionada: ${this.selectedVoice.name} - ${this.selectedVoice.lang}`
        );
      } else {
        console.warn("No se encontraron voces disponibles");
        this.isVoiceLoaded = false;
      }
    } catch (error) {
      console.error("Error al cargar voces:", error);
      this.isVoiceLoaded = false;
    }
  }

  /**
   * Inicializa el reconocimiento de voz
   */
  initRecognition() {
    try {
      if (!this.isSpeechRecognitionSupported) {
        console.warn("Reconocimiento de voz no soportado");
        return false;
      }

      // Obtener la clase correcta de reconocimiento
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;

      // Crear nueva instancia
      this.recognition = new SpeechRecognition();

      // Configurar opciones básicas
      this.recognition.lang = "es-ES";
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.maxAlternatives = 1;

      // Configurar manejadores de eventos
      this.recognition.onstart = () => {
        console.log("Reconocimiento de voz iniciado");
        this.isListening = true;
        if (typeof this.onSpeechStart === "function") this.onSpeechStart();
      };

      this.recognition.onresult = (event) => {
        if (event.results && event.results.length > 0) {
          const last = event.results.length - 1;
          const text = event.results[last][0].transcript.trim();
          console.log(`Texto reconocido: "${text}"`);
          if (typeof this.onResult === "function") this.onResult(text);
        } else {
          console.warn("Evento onresult sin resultados");
        }
      };

      this.recognition.onerror = (event) => {
        console.error(`Error de reconocimiento: ${event.error}`);
        // Manejar errores específicos
        switch (event.error) {
          case "not-allowed":
            console.error("Permiso de micrófono denegado");
            break;
          case "no-speech":
            console.log("No se detectó voz");
            break;
          case "audio-capture":
            console.error("No se detectó micrófono");
            break;
          case "network":
            console.error("Error de red en reconocimiento de voz");
            break;
        }
        this.isListening = false;
        if (typeof this.onSpeechError === "function") this.onSpeechError(event);
      };

      this.recognition.onend = () => {
        console.log("Reconocimiento de voz finalizado");
        this.isListening = false;
        if (typeof this.onSpeechEnd === "function") this.onSpeechEnd();
      };

      console.log("Sistema de reconocimiento inicializado correctamente");
      return true;
    } catch (error) {
      console.error("Error al inicializar reconocimiento:", error);
      this.isSpeechRecognitionSupported = false;
      return false;
    }
  }

  /**
   * Inicia el reconocimiento de voz
   */
  startListening() {
    try {
      if (!this.isSpeechRecognitionSupported) {
        console.warn("Reconocimiento de voz no soportado");
        return false;
      }

      // Si no hay instancia de reconocimiento, inicializarla
      if (!this.recognition) {
        console.log("Iniciando nueva instancia de reconocimiento");
        if (!this.initRecognition()) {
          console.error("No se pudo inicializar el reconocimiento");
          return false;
        }
      }

      // Si ya está escuchando, detener primero
      if (this.isListening) {
        console.log("Ya está escuchando, deteniendo primero");
        this.stopListening();
        // Pequeña pausa antes de reiniciar
        setTimeout(() => {
          this.recognition.start();
          console.log("Reconocimiento reiniciado");
        }, 300);
        return true;
      }

      // Iniciar reconocimiento
      this.recognition.start();
      console.log("Reconocimiento iniciado");
      return true;
    } catch (error) {
      console.error("Error al iniciar reconocimiento:", error);

      // Intentar reiniciar el reconocimiento si falló
      try {
        console.log("Intentando reiniciar el reconocimiento");
        this.recognition = null;
        if (this.initRecognition()) {
          setTimeout(() => {
            this.recognition.start();
            console.log("Reconocimiento reiniciado tras error");
          }, 500);
          return true;
        }
      } catch (e) {
        console.error("Error al reiniciar reconocimiento:", e);
      }

      return false;
    }
  }

  /**
   * Detiene el reconocimiento de voz
   */
  stopListening() {
    try {
      if (this.recognition && this.isListening) {
        this.recognition.stop();
        console.log("Reconocimiento detenido");
        return true;
      }
      return true; // Devolver true incluso si no estaba escuchando
    } catch (error) {
      console.error("Error al detener reconocimiento:", error);
      this.isListening = false; // Asegurar que el estado es consistente
      return false;
    }
  }

  /**
   * Sintetiza voz a partir de un texto
   * @param {string} text - Texto a sintetizar
   * @param {Object} options - Opciones adicionales
   * @return {Promise} Promesa que se resuelve cuando termina la síntesis
   */
  async speak(text, options = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        // Verificar soporte de síntesis
        if (!this.isSpeechSynthesisSupported || !this.synth) {
          console.warn("Síntesis de voz no disponible");
          if (this.onSpeakEnd) this.onSpeakEnd();
          reject(new Error("Síntesis de voz no soportada"));
          return;
        }

        // Cancelar síntesis anterior si existe
        await this.cancelSpeech();

        // Asegurarse de que las voces estén cargadas
        if (!this.isVoiceLoaded || !this.selectedVoice) {
          console.log("Intentando cargar voces nuevamente...");
          await new Promise((resolve) => {
            if (
              typeof speechSynthesis.getVoices === "function" &&
              speechSynthesis.getVoices().length > 0
            ) {
              this.loadVoices();
              resolve();
            } else if ("onvoiceschanged" in speechSynthesis) {
              speechSynthesis.onvoiceschanged = () => {
                this.loadVoices();
                resolve();
              };
            } else {
              setTimeout(() => {
                this.loadVoices();
                resolve();
              }, 1000);
            }
          });
        }

        // Crear nueva utterance
        this.utterance = new SpeechSynthesisUtterance(text);

        // Configurar opciones
        this.utterance.volume = options.volume || 1.0;
        this.utterance.rate = options.rate || 0.9;
        this.utterance.pitch = options.pitch || 1.0;

        // Establecer voz
        if (this.selectedVoice) {
          this.utterance.voice = this.selectedVoice;
          this.utterance.lang = this.selectedVoice.lang;
        } else {
          console.warn(
            "No se encontró una voz adecuada, usando configuración por defecto"
          );
          this.utterance.lang = "es-ES";
        }

        // Sistema de reintentos
        let attempts = 0;
        const maxAttempts = 3;
        const attemptSpeech = async () => {
          try {
            if (attempts >= maxAttempts) {
              throw new Error(`Fallaron ${maxAttempts} intentos de síntesis`);
            }

            attempts++;
            console.log(`Intento de síntesis #${attempts}`);

            // Asegurarse que el contexto de síntesis está activo
            if (this.synth.speaking) {
              console.log("Cancelando síntesis anterior...");
              this.synth.cancel();
              await new Promise((resolve) => setTimeout(resolve, 100));
            }

            // Configurar callbacks
            this.utterance.onstart = () => {
              console.log("Síntesis iniciada");
              if (this.onSpeakStart) this.onSpeakStart();
            };

            this.utterance.onend = () => {
              console.log("Síntesis completada");
              if (this.onSpeakEnd) this.onSpeakEnd();
              resolve();
            };

            this.utterance.onerror = async (event) => {
              console.error(`Error en síntesis (intento ${attempts}):`, event);
              if (attempts < maxAttempts) {
                console.log("Reintentando síntesis...");
                await new Promise((resolve) => setTimeout(resolve, 500));
                attemptSpeech();
              } else {
                if (this.onSpeakEnd) this.onSpeakEnd();
                reject(
                  new Error(
                    `Error en síntesis después de ${maxAttempts} intentos`
                  )
                );
              }
            };

            // Intentar síntesis
            this.synth.speak(this.utterance);

            // Verificar si la síntesis comenzó
            setTimeout(() => {
              if (!this.synth.speaking && attempts < maxAttempts) {
                console.log("La síntesis no comenzó, reintentando...");
                attemptSpeech();
              }
            }, 500);
          } catch (error) {
            console.error(`Error en intento ${attempts}:`, error);
            if (attempts < maxAttempts) {
              await new Promise((resolve) => setTimeout(resolve, 500));
              attemptSpeech();
            } else {
              if (this.onSpeakEnd) this.onSpeakEnd();
              reject(error);
            }
          }
        };

        // Iniciar sistema de reintentos
        await attemptSpeech();
      } catch (error) {
        console.error("Error crítico en síntesis:", error);
        if (this.onSpeakEnd) this.onSpeakEnd();
        reject(error);
      }
    });
  }

  /**
   * Cancela la síntesis de voz en curso
   */
  async cancelSpeech() {
    try {
      if (this.isSpeechSynthesisSupported && this.synth) {
        this.synth.cancel();
        console.log("Síntesis de voz cancelada");
        if (this.onSpeakEnd) this.onSpeakEnd();
      }
    } catch (error) {
      console.error("Error al cancelar síntesis:", error);
    }
  }

  /**
   * Establece los callbacks para eventos de reconocimiento
   * @param {Object} callbacks - Objeto con los callbacks
   */
  setRecognitionCallbacks(callbacks) {
    if (callbacks.onStart) this.onSpeechStart = callbacks.onStart;
    if (callbacks.onEnd) this.onSpeechEnd = callbacks.onEnd;
    if (callbacks.onError) this.onSpeechError = callbacks.onError;
    if (callbacks.onResult) this.onResult = callbacks.onResult;
  }

  /**
   * Obtiene la lista de voces disponibles
   * @returns {Array} Lista de voces
   */
  getVoices() {
    return this.voices || [];
  }

  /**
   * Obtiene la voz seleccionada actualmente
   * @returns {SpeechSynthesisVoice} Voz seleccionada
   */
  getSelectedVoice() {
    return this.selectedVoice;
  }

  /**
   * Cambia la voz seleccionada por índice
   * @param {number} index - Índice de la voz a seleccionar
   * @returns {boolean} true si se cambió correctamente
   */
  setVoiceByIndex(index) {
    if (!this.voices || index >= this.voices.length) {
      console.warn(`Índice de voz inválido: ${index}`);
      return false;
    }

    this.selectedVoice = this.voices[index];
    console.log(`Voz cambiada a: ${this.selectedVoice.name}`);
    return true;
  }

  /**
   * Diagnostica el estado del sistema de reconocimiento de voz
   */
  async diagnoseVoiceSupport() {
    const diagnosis = {
      browserSupport: false,
      microphoneAvailable: false,
      permissionsGranted: false,
      recognitionInitialized: false,
      details: [],
    };

    try {
      // 1. Verificar soporte del navegador
      diagnosis.browserSupport = !!(
        window.SpeechRecognition || window.webkitSpeechRecognition
      );
      diagnosis.details.push(
        `Soporte del navegador: ${diagnosis.browserSupport ? "✅" : "❌"}`
      );

      // 2. Verificar dispositivos de audio
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioDevices = devices.filter(
          (device) => device.kind === "audioinput"
        );
        diagnosis.microphoneAvailable = audioDevices.length > 0;
        diagnosis.details.push(
          `Micrófonos disponibles: ${audioDevices.length}`
        );
      } catch (e) {
        diagnosis.details.push(`Error al enumerar dispositivos: ${e.message}`);
      }

      // 3. Verificar permisos
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        diagnosis.permissionsGranted = true;
        stream.getTracks().forEach((track) => track.stop());
        diagnosis.details.push("Permisos de micrófono: ✅");
      } catch (e) {
        diagnosis.permissionsGranted = false;
        diagnosis.details.push(`Permisos de micrófono: ❌ (${e.name})`);
      }

      // 4. Verificar estado de inicialización
      diagnosis.recognitionInitialized = !!(
        this.recognition && this.isSpeechRecognitionSupported
      );
      diagnosis.details.push(
        `Reconocimiento inicializado: ${
          diagnosis.recognitionInitialized ? "✅" : "❌"
        }`
      );

      return diagnosis;
    } catch (error) {
      console.error("Error durante diagnóstico:", error);
      diagnosis.details.push(`Error general: ${error.message}`);
      return diagnosis;
    }
  }
}

export default SpeechService;
