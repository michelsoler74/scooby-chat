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
    this.synth = null;
    this.utterance = null;
    this.voices = [];
    this.isVoiceLoaded = false;
    this.selectedVoice = null;
    this.preferredLang = "es-ES"; // Preferencia para voces en español

    // Callbacks para manejo de eventos de voz
    this.onSpeechStart = null;
    this.onSpeechEnd = null;
    this.onSpeechError = null;
    this.onResult = null;
    this.onSpeakStart = null;
    this.onSpeakEnd = null;

    // Inicialización asíncrona
    this.initPromise = this.initialize();
  }

  /**
   * Inicialización asíncrona del servicio
   * @private
   */
  async initialize() {
    try {
      console.log("Iniciando SpeechService...");

      // Verificar compatibilidad
      this.checkBrowserCompatibility();

      // Inicializar síntesis de voz
      if (this.isSpeechSynthesisSupported) {
        this.synth = window.speechSynthesis;
        await this.initSpeechSynthesis();
      }

      // Inicializar reconocimiento si está disponible
      if (this.isSpeechRecognitionSupported) {
        await this.initRecognition();
      }

      console.log("SpeechService inicializado correctamente");
      return true;
    } catch (error) {
      console.error("Error al inicializar SpeechService:", error);
      return false;
    }
  }

  /**
   * Espera a que el servicio esté inicializado
   * @returns {Promise<boolean>}
   */
  async waitForInit() {
    try {
      return await this.initPromise;
    } catch (error) {
      console.error("Error esperando inicialización:", error);
      return false;
    }
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
  async initRecognition() {
    try {
      if (!this.isSpeechRecognitionSupported) {
        console.warn("Reconocimiento de voz no soportado");
        return false;
      }

      // Crear nueva instancia del reconocimiento
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();

      // Configurar opciones
      this.recognition.lang = "es-ES";
      this.recognition.continuous = false;
      this.recognition.interimResults = false;

      // Configurar manejadores de eventos
      this.recognition.onstart = () => {
        console.log("Reconocimiento de voz iniciado");
        this.isListening = true;
        if (this.onSpeechStart) this.onSpeechStart();
      };

      this.recognition.onresult = (event) => {
        const last = event.results.length - 1;
        const text = event.results[last][0].transcript.trim();
        console.log(`Texto reconocido: "${text}"`);
        if (this.onResult) this.onResult(text);
      };

      this.recognition.onerror = (event) => {
        console.error(`Error de reconocimiento: ${event.error}`);
        this.isListening = false;
        if (this.onSpeechError) this.onSpeechError(event);
      };

      this.recognition.onend = () => {
        console.log("Reconocimiento de voz finalizado");
        this.isListening = false;
        if (this.onSpeechEnd) this.onSpeechEnd();
      };

      console.log("Sistema de reconocimiento inicializado correctamente");
      return true;
    } catch (error) {
      console.error("Error al inicializar reconocimiento:", error);
      return false;
    }
  }

  /**
   * Inicia el reconocimiento de voz
   */
  async startListening() {
    try {
      if (!this.isSpeechRecognitionSupported) {
        console.warn("Reconocimiento de voz no soportado");
        return false;
      }

      // Verificar si ya está escuchando
      if (this.isListening) {
        console.log("Ya está escuchando, reiniciando...");
        await this.stopListening();
      }

      // Asegurarnos de que tenemos una instancia
      if (!this.recognition) {
        await this.initRecognition();
      }

      // Iniciar reconocimiento
      this.recognition.start();
      console.log("Reconocimiento iniciado");
      return true;
    } catch (error) {
      console.error("Error al iniciar reconocimiento:", error);
      // Intentar reiniciar en caso de error
      await this.restartRecognition();
      return false;
    }
  }

  /**
   * Detiene el reconocimiento de voz
   */
  async stopListening() {
    try {
      if (this.recognition && this.isListening) {
        this.recognition.stop();
        console.log("Reconocimiento detenido");
      }
      this.isListening = false;
      return true;
    } catch (error) {
      console.error("Error al detener reconocimiento:", error);
      this.isListening = false;
      return false;
    }
  }

  /**
   * Reinicia el motor de reconocimiento (útil cuando hay errores)
   */
  async restartRecognition() {
    try {
      console.log("Reiniciando motor de reconocimiento...");

      // Detener si está activo
      if (this.isListening) {
        await this.stopListening();
      }

      // Eliminar y recrear
      this.recognition = null;
      await this.initRecognition();

      console.log("Motor de reconocimiento reiniciado");
      return true;
    } catch (error) {
      console.error("Error al reiniciar reconocimiento:", error);
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
   * Verifica si el navegador puede usar reconocimiento de voz
   * @returns {boolean} true si el navegador soporta reconocimiento de voz
   */
  canUseVoiceRecognition() {
    return this.isSpeechRecognitionSupported;
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
}

export default SpeechService;
