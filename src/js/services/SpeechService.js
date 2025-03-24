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

  /**
   * Sintetiza un texto en voz
   * @param {string} text - Texto a sintetizar
   * @param {Object} options - Opciones adicionales
   * @param {number} options.volume - Volumen (0-1)
   * @param {boolean} options.force - Si es true, fuerza la síntesis incluso sin interacción previa
   * @param {number} options.rate - Velocidad de habla (0.1-2.0)
   * @returns {Promise<void>} - Promesa que se resuelve cuando termina la síntesis
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

      // Asegurarnos de que la síntesis está disponible
      if (!this.synthesis) {
        console.error("SpeechSynthesis no está disponible en este navegador");
        throw new Error("Síntesis de voz no disponible");
      }

      // Verificar si hay un estado pendiente (podría bloquear nuevas pronunciaciones)
      if (
        (this.synthesis.speaking || this.synthesis.pending) &&
        !options.force
      ) {
        console.log("Hay síntesis pendiente o en progreso, limpiando...");
        this.synthesis.cancel();
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      // Asegurar que haya habido alguna interacción del usuario para permitir audio
      // (necesario en algunos navegadores como Safari/Chrome)
      if (!document.body.classList.contains("user-interaction")) {
        console.log(
          "Añadiendo clase de interacción de usuario para permitir audio"
        );
        document.body.classList.add("user-interaction");

        // Intentar forzar interacción simulada
        const audioContext = new (window.AudioContext ||
          window.webkitAudioContext)();
        if (audioContext && audioContext.state === "suspended") {
          audioContext
            .resume()
            .then(() => {
              console.log("AudioContext resumido exitosamente");
            })
            .catch((e) => {
              console.warn("No se pudo resumir AudioContext:", e);
            });
        }
      }

      // Técnica de "kick-start" del motor de síntesis
      // Algunos navegadores móviles necesitan una síntesis inicial antes de comenzar la real
      if (options.force && !this.kickStarted) {
        try {
          console.log("Iniciando 'kick-start' del motor de síntesis");
          const kickUtterance = new SpeechSynthesisUtterance(".");
          kickUtterance.volume = 0; // Sin sonido
          kickUtterance.rate = 1;

          // Usar un enfoque síncrono para el kick-start
          this.synthesis.speak(kickUtterance);
          this.synthesis.cancel(); // Cancelar inmediatamente
          this.kickStarted = true;
          console.log("Kick-start completado");

          // Pequeña pausa para reiniciar el estado
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (e) {
          console.warn("Error en kick-start:", e);
        }
      }

      const utterance = new SpeechSynthesisUtterance(cleanText);

      // Calcular una estimación aproximada del tiempo que tomará hablar el texto
      // Utilizamos una fórmula aproximada: 5ms por carácter a velocidad normal
      // Ajustamos según la velocidad configurada
      const speechDuration = Math.max(
        3000, // Mínimo 3 segundos
        cleanText.length * 70 * (1 / (options.rate || 0.9))
      );
      console.log(`Duración estimada de síntesis: ${speechDuration}ms`);

      // Guarda la hora de inicio para calcular el tiempo real
      const startTime = Date.now();

      // Establecer voz en español si está disponible
      if (this.selectedVoice) {
        console.log("Usando voz seleccionada:", this.selectedVoice.name);
        utterance.voice = this.selectedVoice;
      } else {
        console.log("Buscando voz en español disponible...");
        // Intentar encontrar una voz en español si no se ha configurado previamente
        const voices = this.synthesis.getVoices();
        console.log("Voces disponibles:", voices.length);

        // Estrategia más agresiva para encontrar voces
        let spanishVoice = voices.find(
          (voice) =>
            voice.lang.startsWith("es") ||
            voice.name.includes("Spanish") ||
            voice.name.includes("español")
        );

        // Si no encontramos una voz específicamente en español, usar cualquier otra
        if (!spanishVoice && voices.length > 0) {
          console.warn(
            "No se encontró voz en español, usando primera disponible"
          );
          spanishVoice = voices[0];
        }

        if (spanishVoice) {
          console.log("Voz encontrada:", spanishVoice.name);
          utterance.voice = spanishVoice;
          this.selectedVoice = spanishVoice; // Guardar para uso futuro
        } else {
          console.warn(
            "No se encontró ninguna voz disponible, usando la predeterminada"
          );
        }
      }

      // Configurar propiedades de voz para Scooby
      utterance.rate = options.rate || 0.9; // Un poco más lento para que sea claro
      utterance.pitch = 1.1; // Tono un poco más alto para Scooby
      utterance.volume = options.volume || 1.0; // Volumen al máximo
      utterance.lang = "es-ES"; // Forzar idioma español

      console.log("Configuración de síntesis:", {
        voice: utterance.voice ? utterance.voice.name : "predeterminada",
        rate: utterance.rate,
        pitch: utterance.pitch,
        volume: utterance.volume,
        lang: utterance.lang,
        force: options.force || false,
      });

      // Manejar eventos de la síntesis con mayor robustez
      let hasStarted = false;

      utterance.onstart = () => {
        console.log("Síntesis de voz iniciada");
        hasStarted = true;
        this.isSpeaking = true;
        if (typeof this.onSpeakStart === "function") {
          this.onSpeakStart();
        }
      };

      // Respaldo si onstart nunca se dispara (ocurre en algunos dispositivos móviles)
      setTimeout(() => {
        if (!hasStarted && this.synthesis.speaking) {
          console.log(
            "Detectada síntesis activa sin evento onstart, forzando estado de habla"
          );
          hasStarted = true;
          this.isSpeaking = true;
          if (typeof this.onSpeakStart === "function") {
            this.onSpeakStart();
          }
        }
      }, 500);

      utterance.onend = () => {
        console.log("Síntesis de voz finalizada correctamente");
        const actualDuration = Date.now() - startTime;
        console.log(`Duración real de síntesis: ${actualDuration}ms`);

        // En lugar de finalizar inmediatamente, mantener el estado de habla
        // durante un tiempo adicional para asegurar que la animación coincida
        // con cualquier retraso en el audio
        const extraTime = 1000; // 1 segundo extra para garantizar sincronización
        console.log(
          `Manteniendo estado de habla por ${extraTime}ms adicionales`
        );

        setTimeout(() => {
          console.log("Finalizando estado de habla después del tiempo extra");
          this.isSpeaking = false;
          if (typeof this.onSpeakEnd === "function") {
            this.onSpeakEnd();
          }
        }, extraTime);
      };

      utterance.onerror = (err) => {
        console.error("Error en síntesis de voz:", err);
        this.isSpeaking = false;
        if (typeof this.onSpeakEnd === "function") {
          this.onSpeakEnd();
        }
      };

      // Iniciar síntesis con mejor manejo de errores
      console.log("Ejecutando speechSynthesis.speak()");
      try {
        this.synthesis.speak(utterance);

        // Si la síntesis está forzada, verificar activamente que haya comenzado
        if (options.force) {
          // Verificar cada 100ms durante 1 segundo si realmente comenzó la síntesis
          let checkCount = 0;
          const checkInterval = setInterval(() => {
            checkCount++;

            if (this.synthesis.speaking) {
              console.log("Confirmado: síntesis activa detectada");
              clearInterval(checkInterval);
            } else if (checkCount > 10) {
              // 1 segundo (10 * 100ms)
              console.warn(
                "La síntesis no inició después de 1 segundo, reintentando"
              );
              clearInterval(checkInterval);

              // Último recurso: reintentar con un enfoque diferente
              try {
                this.synthesis.cancel(); // Limpiar cualquier estado
                this.synthesis.speak(utterance); // Reintentar
              } catch (retryError) {
                console.error("Error en reintento final:", retryError);
              }
            }
          }, 100);
        }
      } catch (speakError) {
        console.error("Error al iniciar síntesis:", speakError);
        throw speakError;
      }

      // Esperar a que termine (Promise)
      return new Promise((resolve) => {
        const originalOnEnd = utterance.onend;
        utterance.onend = () => {
          console.log("Promesa de síntesis: síntesis terminada");
          const actualDuration = Date.now() - startTime;

          // No resolver la promesa inmediatamente - mantener animación
          const extraTime = 1000;
          console.log(`Retrasando resolución de promesa por ${extraTime}ms`);

          setTimeout(() => {
            console.log(
              "Resolviendo promesa de síntesis después de tiempo extra"
            );
            this.isSpeaking = false;
            if (typeof this.onSpeakEnd === "function") {
              this.onSpeakEnd();
            }
            resolve();
          }, extraTime);
        };

        utterance.onerror = (err) => {
          console.error("Promesa de síntesis resuelta (onerror):", err);
          this.isSpeaking = false;
          if (typeof this.onSpeakEnd === "function") {
            this.onSpeakEnd();
          }
          resolve();
        };

        // Seguridad: resolver después de un tiempo máximo
        // Aumentando el tiempo para textos largos
        const timeoutDuration = Math.max(
          10000, // Mínimo 10 segundos
          speechDuration + 3000 // Duración estimada + 3 segundos extra
        );

        setTimeout(() => {
          if (this.isSpeaking) {
            console.warn(
              `Tiempo máximo de síntesis (${timeoutDuration}ms) alcanzado, finalizando`
            );
            this.isSpeaking = false;
            if (typeof this.onSpeakEnd === "function") {
              this.onSpeakEnd();
            }
            resolve();
          }
        }, timeoutDuration);
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
