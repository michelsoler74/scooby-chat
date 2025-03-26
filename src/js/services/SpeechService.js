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

    this.checkBrowserCompatibility();
    this.initSpeechSynthesis();

    // Inicializar reconocimiento si está disponible
    if (this.isSpeechRecognitionSupported) {
      this.initRecognition();
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
  startListening() {
    try {
      if (!this.isSpeechRecognitionSupported) {
        console.warn("Reconocimiento de voz no soportado");
        return false;
      }

      // Verificar si ya está escuchando
      if (this.isListening) {
        console.log("Ya está escuchando, reiniciando...");
        this.stopListening();
      }

      // Asegurarnos de que tenemos una instancia
      if (!this.recognition) {
        this.initRecognition();
      }

      // Iniciar reconocimiento
      this.recognition.start();
      console.log("Reconocimiento iniciado");
      return true;
    } catch (error) {
      console.error("Error al iniciar reconocimiento:", error);
      // Intentar reiniciar en caso de error
      this.restartRecognition();
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
  restartRecognition() {
    try {
      console.log("Reiniciando motor de reconocimiento...");

      // Detener si está activo
      if (this.isListening) {
        this.stopListening();
      }

      // Eliminar y recrear
      this.recognition = null;
      this.initRecognition();

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
  speak(text, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        if (!this.isSpeechSynthesisSupported) {
          console.warn("Síntesis de voz no soportada");
          reject(new Error("Síntesis de voz no soportada"));
          return;
        }

        // Cancelar síntesis anterior si existe
        this.cancelSpeech();

        // Si se solicita forzar carga, intentar cargar voces nuevamente
        if (options.force && (!this.voices || this.voices.length === 0)) {
          this.loadVoices();
        }

        // Crear nueva utterance
        this.utterance = new SpeechSynthesisUtterance(text);

        // Configurar opciones
        this.utterance.volume = options.volume || 1.0;
        this.utterance.rate = options.rate || 0.9; // Un poco más lento para mejor entendimiento
        this.utterance.pitch = options.pitch || 1.0;

        // Establecer voz seleccionada o la predeterminada
        if (this.selectedVoice) {
          this.utterance.voice = this.selectedVoice;
          this.utterance.lang = this.selectedVoice.lang;
        } else {
          this.utterance.lang = "es-ES";
        }

        // Callback para inicio de síntesis
        this.utterance.onstart = () => {
          console.log("Síntesis de voz iniciada");
          if (this.onSpeakStart) this.onSpeakStart();
        };

        // Callback para finalización
        this.utterance.onend = () => {
          console.log("Síntesis de voz finalizada");
          if (this.onSpeakEnd) this.onSpeakEnd();
          resolve();
        };

        // Callback para errores
        this.utterance.onerror = (event) => {
          console.error(`Error en síntesis: ${event.error}`);
          if (this.onSpeakEnd) this.onSpeakEnd();
          reject(new Error(`Error en síntesis: ${event.error}`));
        };

        // Iniciar síntesis
        this.synth.speak(this.utterance);

        // En algunos navegadores, el evento onend no se dispara correctamente
        // Establecemos un timeout basado en la longitud del texto
        const timeout = Math.max(5000, text.length * 90); // ~90ms por carácter como estimación
        setTimeout(() => {
          if (this.utterance) {
            // Si después del timeout estimado aún no se ha resuelto, forzar resolución
            resolve();
          }
        }, timeout);
      } catch (error) {
        console.error("Error al iniciar síntesis de voz:", error);
        if (this.onSpeakEnd) this.onSpeakEnd();
        reject(error);
      }
    });
  }

  /**
   * Cancela la síntesis de voz en curso
   */
  cancelSpeech() {
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
