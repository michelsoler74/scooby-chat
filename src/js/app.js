import SpeechService from "./services/SpeechService.js";
import HuggingFaceService from "./services/HuggingFaceService.js";
import { UIService } from "./services/UIService.js";
import MonitorUI from "./utils/MonitorUI.js";
import DogApi from "./services/DogApi.js";
import config from "./config.js";

// Inicializar instancia global del monitor
window.monitorUI = new MonitorUI();

class ScoobyApp {
  constructor() {
    console.log("🐕 Inicializando ScoobyApp...");
    this.apiKey = null;
    this.model = null;
    this.speechService = null;
    this.uiService = null;
    this.llmService = null; // Cambiado de this.model
    this.appConfig = {};
    this.isInitialized = false;
    this.isProcessing = false;
    this.isVoiceSupported = false;
    this.lastResponse = null;
    this.useFallbackVoice = false;
    this.isErrorHandlerAttached = false;
    this.displayName = "Scooby";
    this.voiceIndex = 0;
    this.maxAttempts = 3;

    // Hacemos visible la instancia para debugging
    window.app = this;

    // Reportar errores no capturados
    if (!this.isErrorHandlerAttached) {
      window.addEventListener("error", this.handleGlobalError.bind(this));
      this.isErrorHandlerAttached = true;
    }

    // Inicializar servicios
    this.initServices();
  }

  initServices() {
    try {
      console.log("Inicializando servicios básicos...");

      // Inicializar servicio de voz
      this.speechService = new SpeechService();

      // Inicializar servicio de UI
      this.uiService = new UIService();

      // Inicializar servicio LLM (Hugging Face)
      this.llmService = new HuggingFaceService();

      // Inicializar servicio de imágenes
      this.dogApi = new DogApi();

      console.log("Servicios básicos inicializados correctamente");
      return true;
    } catch (error) {
      console.error("Error al inicializar servicios básicos:", error);
      throw error;
    }
  }

  async init() {
    try {
      console.log("🐕 Iniciando proceso de inicialización completa...");

      // Establecer que la aplicación está en proceso de inicialización
      this.isInitializing = true;

      // Intento #1: Buscar API key en parámetros URL
      this.apiKey = this.getAPIKeyFromURL();

      if (!this.apiKey) {
        // Intento #2: Buscar API key en localStorage
        this.apiKey = localStorage.getItem("HUGGINGFACE_API_KEY");
        console.log("API key encontrada en localStorage:", !!this.apiKey);
      }

      // Inicializar elementos DOM primero
      this.initDOMElements();

      // Mostrar un mensaje de inicialización
      this.addSystemMessage("Inicializando Scooby Chat...");

      // Inicializar audio y TTS
      await this.initAudio();

      // Inicializar servicios
      const servicesInitialized = await this.initializeServices();
      if (!servicesInitialized) {
        throw new Error(
          "No se pudieron inicializar los servicios correctamente"
        );
      }

      // Verificar conexión con el modelo
      await this.checkModelConnection();

      // Configurar callbacks de reconocimiento de voz si está disponible
      if (
        this.speechService &&
        this.speechService.isSpeechRecognitionSupported
      ) {
        this.setupSpeechCallbacks();
        this.isVoiceSupported = true;
        console.log("Reconocimiento de voz configurado correctamente");
      } else {
        console.log(
          "🚫 Reconocimiento de voz no soportado - Activando modo texto"
        );
        this.isVoiceSupported = false;
        this.adaptUIForTextMode();
      }

      // Configurar manejadores de eventos
      this.setupEventHandlers();
      console.log("Manejadores de eventos configurados correctamente");

      // Ajustar layout para dispositivos móviles
      this.adjustMobileLayout();

      // Establecer como inicializada antes de mostrar el mensaje de bienvenida
      this.isInitialized = true;
      this.isInitializing = false;
      console.log("🎉 ScoobyApp inicializada correctamente");

      // Intentar una interacción de usuario simulada para desbloquear audio
      this.simulateUserInteraction();

      // Mostrar mensaje de bienvenida
      await this.showWelcomeMessage();

      // Activar monitoreo de API
      this.setupMonitoring();

      // Habilitar botones ahora que todo está listo
      this.enableButtons();
    } catch (error) {
      console.error("❌ Error al inicializar ScoobyApp:", error);
      this.handleInitializationError(error);
    }
  }

  enableButtons() {
    // Habilitar botones después de inicialización completa
    if (this.talkBtn && this.isVoiceSupported) {
      this.talkBtn.disabled = false;
      console.log("Botón de hablar habilitado");
    }

    if (this.sendBtn) {
      this.sendBtn.disabled = false;
      console.log("Botón de enviar habilitado");
    }

    if (this.textInput) {
      this.textInput.disabled = false;
      console.log("Campo de texto habilitado");
    }
  }

  initDOMElements() {
    // Elementos DOM
    this.conversation = document.getElementById("conversation");
    this.textInput = document.getElementById("text-input");
    this.sendBtn = document.getElementById("send-btn");
    this.talkBtn = document.getElementById("talk-btn");
    this.stopBtn = document.getElementById("stop-btn");
    this.resumeBtn = document.getElementById("resume-btn");
    this.continueBtn = document.getElementById("continue-btn");
    this.clearChatBtn = document.getElementById("clear-chat-btn");
    this.scoobyCalladoVideo = document.getElementById("scooby-callado");
    this.scoobyHablandoVideo = document.getElementById("scooby-hablando");

    // Ajustar layout para móviles
    if (this.isMobile) {
      this.adjustMobileLayout();
      window.addEventListener("resize", () => this.adjustMobileLayout());
      window.addEventListener("orientationchange", () =>
        this.adjustMobileLayout()
      );
    }
  }

  async checkModelConnection() {
    try {
      await this.llmService.checkConnection();
      this.uiService.addMessage(
        "Sistema",
        "✅ Conectado a Scooby-Doo Amigo Mentor correctamente"
      );
      console.log("Conexión con el modelo establecida correctamente");
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
   * @param {boolean} isRetry - Indica si es un reintento
   * @returns {Promise<boolean>} - true si el mensaje se mostró y sintetizó correctamente
   */
  async showWelcomeMessage(isRetry = false) {
    console.log(
      `Enviando mensaje de bienvenida${
        isRetry ? " (reintento)" : ""
      } en dispositivo ${this.isMobile ? "móvil" : "desktop"}`
    );

    try {
      // Verificar si ya existe un mensaje de bienvenida previo
      const existingWelcomeMessage = document.querySelector(".welcome-message");
      if (existingWelcomeMessage && !isRetry) {
        console.log(
          "Ya existe un mensaje de bienvenida, intentando reproducirlo"
        );

        // Incluso si ya existe, intentamos reproducirlo por voz, pero limpiando emoticonos
        let welcomeText =
          existingWelcomeMessage.textContent ||
          "¡Scooby-dooby-doo! ¡Hola amigo! Me llamo Scooby y estoy aquí para charlar contigo.";

        // Limpiar emoticonos del texto antes de la síntesis
        welcomeText = welcomeText
          .replace(
            /[\u{1F300}-\u{1F9FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F1E0}-\u{1F1FF}]|[👋🐕]/gu,
            ""
          )
          .trim();

        // Intentar reproducir el mensaje existente
        try {
          // Forzar la activación del audio si es necesario
          if (window.speechSynthesis) {
            window.speechSynthesis.cancel(); // Limpiar cualquier síntesis pendiente

            // Intentar activar el contexto de audio
            try {
              const audioContext = new (window.AudioContext ||
                window.webkitAudioContext)();
              if (audioContext.state === "suspended") {
                await audioContext.resume();
              }
            } catch (e) {
              console.warn("No se pudo activar el contexto de audio:", e);
            }
          }

          this.uiService.showSpeakingScooby();
          this.isSpeaking = true;

          // Intentar la síntesis con múltiples intentos
          let attempt = 0;
          const maxAttempts = 3;
          let success = false;

          while (!success && attempt < maxAttempts) {
            attempt++;
            try {
              await this.speechService.speak(welcomeText, {
                volume: 1.0,
                force: true,
                rate: 0.9 - attempt * 0.1,
              });
              success = true;
            } catch (error) {
              console.warn(`Intento ${attempt} fallido:`, error);
              if (attempt < maxAttempts) {
                await new Promise((resolve) => setTimeout(resolve, 800));
              }
            }
          }

          if (!success) {
            throw new Error(
              "No se pudo reproducir después de múltiples intentos"
            );
          }

          return true;
        } catch (error) {
          console.error("Error al reproducir mensaje existente:", error);
          this.addManualPlayButton(existingWelcomeMessage, welcomeText);
        } finally {
          this.isSpeaking = false;
          this.uiService.showSilentScooby();
        }

        return true;
      }

      // Si es un reintento, limpiar mensajes existentes
      if (isRetry) {
        const existingMessages = document.querySelectorAll(
          ".system-message.welcome-message"
        );
        existingMessages.forEach((msg) => msg.remove());
      }

      // Mensaje de bienvenida con emojis (para mostrar en pantalla)
      const welcomeMessageWithEmojis =
        "👋 ¡Scooby-dooby-doo! ¡Hola amigo! Me llamo Scooby y estoy aquí para charlar contigo. ¿Cómo te llamas y cuántos años tienes? ¡Así podré conocerte mejor!";

      // Mensaje de bienvenida sin emojis (para síntesis de voz)
      const welcomeMessageForSpeech = welcomeMessageWithEmojis
        .replace(
          /[\u{1F300}-\u{1F9FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F1E0}-\u{1F1FF}]|[👋🐕]/gu,
          ""
        )
        .trim();

      // Mostrar el mensaje con emojis en la UI
      const welcomeElement = this.uiService.addSystemMessage(
        welcomeMessageWithEmojis,
        true,
        true
      );

      if (!welcomeElement) {
        throw new Error("No se pudo crear el elemento de bienvenida");
      }

      // Asegurar que el scroll está al final
      this.uiService.scrollToBottom();

      // Preparar el motor de síntesis
      if (window.speechSynthesis) {
        try {
          // Limpiar cualquier síntesis pendiente
          window.speechSynthesis.cancel();

          // Forzar carga de voces
          const voices = window.speechSynthesis.getVoices();
          console.log(`Voces disponibles: ${voices.length}`);

          // Intentar activar el contexto de audio
          const audioContext = new (window.AudioContext ||
            window.webkitAudioContext)();
          if (audioContext.state === "suspended") {
            await audioContext.resume();
          }

          // Simular interacción
          document.body.click();
        } catch (e) {
          console.warn("Error al preparar síntesis:", e);
        }
      }

      // Esperar a que todo esté listo
      await new Promise((resolve) =>
        setTimeout(resolve, this.isMobile ? 800 : 500)
      );

      // Mostrar a Scooby hablando
      this.uiService.showSpeakingScooby();
      this.isSpeaking = true;
      this.uiService.updateButtonStates(false, false, true);

      // Intentar la síntesis con múltiples intentos
      let attempt = 0;
      const maxAttempts = 3;
      let success = false;

      while (!success && attempt < maxAttempts) {
        attempt++;
        try {
          console.log(`Intento de síntesis #${attempt}`);

          await this.speechService.speak(welcomeMessageForSpeech, {
            volume: 1.0,
            force: true,
            rate: 0.9 - attempt * 0.1,
          });

          success = true;
          console.log(`Síntesis exitosa en intento #${attempt}`);

          // Mantener la animación un momento más
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Error en intento #${attempt}:`, error);

          if (attempt < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 800));
          }
        }
      }

      if (!success) {
        console.warn("Todos los intentos de síntesis fallaron");
        this.addManualPlayButton(welcomeElement, welcomeMessageForSpeech);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error general en mensaje de bienvenida:", error);
      return false;
    } finally {
      this.isSpeaking = false;
      this.uiService.showSilentScooby();
      this.uiService.updateButtonStates(false, false, false);
    }
  }

  /**
   * Añade un botón para reproducir manualmente el mensaje
   * @param {HTMLElement} messageElement - Elemento DOM del mensaje
   * @param {string} messageText - Texto del mensaje a reproducir
   */
  addManualPlayButton(messageElement, messageText) {
    if (!messageElement) return;

    // Verificar si ya existe un botón
    if (messageElement.querySelector(".read-welcome-btn")) return;

    const readButton = document.createElement("button");
    readButton.textContent = "🔊 Escuchar mensaje";
    readButton.className = "btn btn-sm btn-info mt-2 read-welcome-btn";
    readButton.style.display = "block";
    readButton.onclick = async () => {
      readButton.disabled = true;
      readButton.textContent = "🔊 Leyendo...";

      try {
        this.uiService.showSpeakingScooby();
        this.isSpeaking = true;

        const speakPromise = this.speechService.speak(messageText, {
          volume: 1.0,
          force: true,
        });
        await speakPromise;

        readButton.textContent = "✅ Mensaje leído";
        setTimeout(() => {
          readButton.style.display = "none";
        }, 3000);
      } catch (err) {
        readButton.textContent = "❌ Error al leer";
        readButton.disabled = false;
      } finally {
        this.isSpeaking = false;
        this.uiService.showSilentScooby();
      }
    };

    messageElement.appendChild(readButton);
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

      // Sistema mejorado de síntesis de voz para el mensaje después de limpiar chat
      console.log("INICIANDO SÍNTESIS DE VOZ TRAS LIMPIAR CHAT");

      // Esperar para asegurar que el DOM se ha actualizado
      await new Promise((resolve) =>
        setTimeout(resolve, this.isMobile ? 500 : 300)
      );

      // Número máximo de intentos
      const maxIntentos = 3;
      let intentoActual = 0;
      let exitoso = false;

      while (intentoActual < maxIntentos && !exitoso) {
        intentoActual++;
        console.log(
          `Intento ${intentoActual} de ${maxIntentos} para sintetizar voz post-limpieza`
        );

        try {
          // Asegurarnos que la UI muestra que Scooby está hablando
          this.uiService.showSpeakingScooby();
          this.isSpeaking = true;
          this.uiService.updateButtonStates(false, false, true);

          // Añadir un tiempo de espera variable según el intento
          const tiempoEspera = this.isMobile ? 800 : 200 + intentoActual * 300;
          await new Promise((resolve) => setTimeout(resolve, tiempoEspera));

          // Reproducir el mensaje con un volumen ligeramente incrementado
          console.log(
            `Reproduciendo mensaje post-limpieza (intento ${intentoActual})`
          );
          const speakingPromise = this.speechService.speak(welcomeMessage, {
            volume: 1.0,
          });
          await speakingPromise;

          // Si llegamos aquí sin error, la síntesis fue exitosa
          console.log("Mensaje post-limpieza reproducido correctamente");
          exitoso = true;

          // Mantener Scooby animado un poco más para que sea natural
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (error) {
          console.error(
            `Error en intento ${intentoActual} de sintetizar voz post-limpieza:`,
            error
          );

          // Si es el último intento, pasar silenciosamente
          if (intentoActual === maxIntentos) {
            console.warn(
              "No se pudo reproducir el mensaje post-limpieza después de varios intentos"
            );
          } else {
            // Pequeña pausa antes del siguiente intento
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }
      }

      // Siempre restablecer el estado al finalizar
      this.isSpeaking = false;
      this.uiService.showSilentScooby();
      this.uiService.updateButtonStates(false, false, false);
      console.log("Finalizada síntesis de voz post-limpieza");
    }, 1000);
  }

  setupSpeechCallbacks() {
    // Configurar los callbacks del servicio de voz para actualizar la UI
    // Utilizamos setRecognitionCallbacks para configurar los callbacks de una manera más estructurada
    this.speechService.setRecognitionCallbacks({
      onStart: () => {
        console.log("Reconocimiento de voz iniciado");
        // Actualizar UI
        if (this.stopBtn) this.stopBtn.disabled = false;
        if (this.talkBtn) {
          this.talkBtn.disabled = true;
          this.talkBtn.classList.add("btn-recording");
          this.talkBtn.classList.remove("btn-success");
          this.talkBtn.innerHTML =
            '<i class="fas fa-microphone-alt me-1"></i> Escuchando...';
        }
      },

      onEnd: () => {
        console.log("Reconocimiento de voz finalizado");
        // Actualizar UI
        if (this.stopBtn) this.stopBtn.disabled = true;
        if (this.talkBtn) {
          this.talkBtn.disabled = false;
          this.talkBtn.classList.remove("btn-recording");
          this.talkBtn.classList.add("btn-success");
          this.talkBtn.innerHTML =
            '<i class="fas fa-microphone me-1"></i> Hablar';
        }
        // Reiniciar contador de reintentos
        this.speechRetryCount = 0;
      },

      onResult: async (text) => {
        if (!text || !text.trim()) {
          console.log("Texto vacío recibido del reconocimiento, ignorando");
          return;
        }

        console.log(`Texto reconocido: "${text}"`);
        if (this.textInput) this.textInput.value = text;

        // Procesar si el texto es válido
        if (text && text.trim().length > 0) {
          // Reiniciar contador de reintentos
          this.speechRetryCount = 0;

          // Detener reconocimiento para procesar
          this.speechService.stopListening();

          // Procesar entrada después de un pequeño retraso
          setTimeout(() => {
            this.processUserInput(text);
          }, 300);
        } else if (this.speechRetryCount < this.maxSpeechRetries) {
          // Si no hay texto, reintentar reconocimiento
          this.speechRetryCount++;
          console.log(
            `Reintentando reconocimiento (${this.speechRetryCount}/${this.maxSpeechRetries})`
          );

          // Detener y reiniciar
          this.speechService.stopListening();
          setTimeout(() => {
            this.speechService.startListening();
          }, 500);
        }
      },

      onError: (event) => {
        console.error("Error de reconocimiento:", event);

        // Actualizar UI
        if (this.stopBtn) this.stopBtn.disabled = true;
        if (this.talkBtn) {
          this.talkBtn.disabled = false;
          this.talkBtn.classList.remove("btn-recording");
          this.talkBtn.classList.add("btn-success");
          this.talkBtn.innerHTML =
            '<i class="fas fa-microphone me-1"></i> Hablar';
        }

        // Intentar reiniciar si hay errores consistentes
        if (this.speechRetryCount < this.maxSpeechRetries) {
          this.speechRetryCount++;
          console.log(
            `Error en reconocimiento, reintentando (${this.speechRetryCount}/${this.maxSpeechRetries})`
          );
          setTimeout(() => {
            // Reintentar reconocimiento
            this.speechService.stopListening();
            setTimeout(() => {
              this.speechService.startListening();
            }, 500);
          }, 800);
        } else {
          // Reiniciar el servicio de reconocimiento si hay demasiados errores
          console.log("Demasiados errores, reiniciando servicio de voz");
          this.speechService.restartRecognition();
          this.speechRetryCount = 0;

          // Mostrar mensaje al usuario
          this.uiService.addSystemMessage(
            "No puedo entenderte. Por favor, intenta hablar más claro o usa el teclado para escribir tu mensaje."
          );
        }
      },
    });

    // Configurar eventos para la síntesis de voz
    this.speechService.onSpeakStart = () => {
      console.log("Síntesis de voz iniciada");
      this.playScoobyTalking();
    };

    this.speechService.onSpeakEnd = () => {
      console.log("Síntesis de voz finalizada");
      this.playScoobyQuiet();
    };
  }

  setupEventHandlers() {
    console.log("Configurando manejadores de eventos de la aplicación");

    // Configurar el botón de envío de texto
    const sendBtn = document.getElementById("send-btn");
    const textInput = document.getElementById("text-input");

    if (sendBtn && textInput) {
      // Destacar el botón de envío si no hay soporte de voz
      if (!this.isVoiceSupported) {
        sendBtn.classList.remove("btn-primary");
        sendBtn.classList.add("btn-success");
        sendBtn.style.fontWeight = "bold";
      }

      // Manejar clic en el botón de envío
      sendBtn.addEventListener("click", () => {
        const text = textInput.value.trim();
        if (text) {
          this.processUserInput(text);
          textInput.value = "";
        }
      });

      // Manejar tecla Enter en el campo de texto
      textInput.addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
          const text = textInput.value.trim();
          if (text) {
            event.preventDefault();
            this.processUserInput(text);
            textInput.value = "";
          }
        }
      });
    }

    // Configurar el botón de hablar (solo si hay soporte de voz)
    const talkBtn = document.getElementById("talk-btn");
    if (talkBtn) {
      talkBtn.addEventListener("click", () => {
        if (!this.isInitialized) {
          console.warn(
            "Aplicación no inicializada, ignorando clic en botón hablar"
          );
          return;
        }

        if (!this.isVoiceSupported) {
          this.uiService.addSystemMessage(
            "El reconocimiento de voz no está disponible en este navegador. Por favor, usa el modo de texto."
          );
          // Enfocar el campo de texto como alternativa
          if (textInput) {
            textInput.focus();
          }
          return;
        }

        // Verificar si ya está procesando
        if (this.isProcessing) {
          console.log("Ya está procesando, ignorando clic en botón hablar");
          this.uiService.addSystemMessage(
            "Espera a que termine el proceso actual..."
          );
          return;
        }

        console.log("Iniciando reconocimiento de voz");
        this.startListening();
      });
    }

    // Configurar el botón de detener
    const stopBtn = document.getElementById("stop-btn");
    if (stopBtn) {
      stopBtn.addEventListener("click", () => {
        console.log("Deteniendo reconocimiento");
        this.stopListening();
      });
    }

    // Configurar el botón de continuar respuesta
    const continueBtn = document.getElementById("continue-btn");
    if (continueBtn) {
      continueBtn.addEventListener("click", () => {
        // Solo continuar si tenemos una respuesta previa y no estamos procesando
        if (!this.lastResponse || this.isProcessing) {
          console.log("No hay respuesta previa o ya está procesando");
          return;
        }

        console.log("Continuando respuesta");
        this.continuarRespuesta("", this.lastResponse);
      });
    }

    // Configurar el botón de limpiar chat
    const clearChatBtn = document.getElementById("clear-chat-btn");
    if (clearChatBtn) {
      clearChatBtn.addEventListener("click", () => {
        // Confirmar antes de limpiar
        if (confirm("¿Estás seguro de querer limpiar el historial del chat?")) {
          console.log("Limpiando chat");
          const conversationDiv = document.getElementById("conversation");
          if (conversationDiv) {
            conversationDiv.innerHTML = "";
            this.lastResponse = null;
            // Ocultar el botón de continuación
            if (continueBtn) {
              continueBtn.classList.add("d-none");
            }
          }
        }
      });
    }

    // Configurar el botón de diagnóstico del micrófono
    const diagnoseBtn = document.getElementById("diagnose-btn");
    if (diagnoseBtn) {
      diagnoseBtn.addEventListener("click", async () => {
        console.log("Diagnóstico del sistema de voz");
        if (!this.isVoiceSupported) {
          this.uiService.addSystemMessage(
            "El reconocimiento de voz no está disponible en este navegador. Por favor, usa el modo de texto o prueba con Chrome/Edge."
          );
          return;
        }

        // Si tiene soporte, ejecutar diagnóstico
        await this.diagnoseSpeechSystem();
      });
    }

    // Manejar resize de ventana para ajustes de layout
    window.addEventListener("resize", () => {
      this.adjustMobileLayout();
    });

    // Manejar cambios en conexión
    window.addEventListener("online", () => {
      console.log("Conexión restablecida");
      if (this.uiService) {
        this.uiService.addSystemMessage("✅ Conexión restablecida");
      }
    });

    window.addEventListener("offline", () => {
      console.log("Conexión perdida");
      if (this.uiService) {
        this.uiService.addSystemMessage(
          "⚠️ Conexión perdida. Algunas funciones pueden no estar disponibles."
        );
      }
    });

    console.log("Manejadores de eventos configurados");
  }

  /**
   * Ajusta el diseño en dispositivos móviles basado en la altura actual de la ventana
   * para garantizar que siempre se vea el avatar y los controles
   */
  adjustMobileLayout() {
    if (!this.isMobile) return;

    const windowHeight = window.innerHeight;
    const headerHeight = 60; // Altura aproximada del header

    // Calcular altura para el área de video (avatar de Scooby)
    const videoHeight = Math.min(windowHeight * 0.3, 200); // Máximo 30% de la altura o 200px

    // Obtener los elementos principales
    const videoSection = document.querySelector(".video-section");
    const chatSection = document.querySelector(".chat-section");
    const conversation = document.getElementById("conversation");
    const inputArea = document.querySelector(".input-area");

    if (videoSection && chatSection && inputArea) {
      // Establecer altura y posición de la sección de video
      videoSection.style.height = `${videoHeight}px`;
      videoSection.style.top = `${headerHeight}px`;

      // Ajustar la posición de la sección de chat debajo del video
      chatSection.style.top = `${videoHeight + headerHeight}px`;

      // Calcular altura disponible para el chat
      const chatSectionHeight = windowHeight - videoHeight - headerHeight;
      chatSection.style.height = `${chatSectionHeight}px`;

      // Si tenemos el área de conversación y conocemos la altura del área de input
      if (conversation && inputArea) {
        const inputHeight = inputArea.offsetHeight;
        conversation.style.maxHeight = `${
          chatSectionHeight - inputHeight - 10
        }px`;
      }

      console.log(
        `Layout móvil ajustado - Video: ${videoHeight}px, Chat: ${chatSectionHeight}px`
      );
    }
  }

  async processUserInput(userMessage) {
    if (!userMessage || userMessage.trim().length === 0) {
      console.log("Mensaje vacío, ignorando");
      return;
    }

    // Si la aplicación no está inicializada, mostrar un mensaje de error
    if (!this.isInitialized) {
      console.error("La aplicación no está inicializada completamente");
      this.addSystemMessage(
        "Por favor, espera a que la aplicación termine de inicializarse."
      );
      return;
    }

    // Evitar procesamiento si ya hay uno en curso
    if (this.isProcessing) {
      console.log("Ya hay un proceso en curso, ignorando entrada");
      return;
    }

    try {
      // Establecer estado de procesamiento
      this.isProcessing = true;

      // Desactivar botones durante el procesamiento
      if (this.talkBtn) this.talkBtn.disabled = true;
      if (this.sendBtn) this.sendBtn.disabled = true;
      if (this.textInput) this.textInput.disabled = true;

      // Mostrar mensaje del usuario
      this.addUserMessage(userMessage);

      // Mostrar animación de Scooby pensando
      this.playScoobyTalking();

      // Procesar mensaje con el servicio LLM
      console.log("Procesando mensaje:", userMessage);

      let response;
      try {
        response = await this.llmService.getResponse(userMessage);
        console.log("Respuesta obtenida:", response);
      } catch (error) {
        console.error("Error al obtener respuesta:", error);
        throw new Error(`Error al procesar tu mensaje: ${error.message}`);
      }

      // Verificar que la respuesta existe
      if (!response || response.trim().length === 0) {
        throw new Error("No se obtuvo una respuesta válida");
      }

      // Guardar para continuar respuesta después
      this.lastResponse = response;

      // Crear elemento para la respuesta
      const responseElement = document.createElement("div");
      responseElement.className = "message response";

      // Añadir la respuesta al chat primero como texto
      const messageElement = document.createElement("div");
      messageElement.className = "message-bubble dog-bubble";
      messageElement.textContent = response;
      responseElement.appendChild(messageElement);

      // Agregar la respuesta al chat
      if (this.conversation) {
        this.conversation.appendChild(responseElement);
        this.conversation.scrollTop = this.conversation.scrollHeight;
      }

      // Sintetizar respuesta si hay soporte de voz
      if (this.isVoiceSupported && this.speechService) {
        try {
          await this.speechService.speak(response);
        } catch (error) {
          console.error("Error en síntesis de voz:", error);
          // Continuar sin síntesis
        }
      }

      // Mostrar botón para continuar la conversación
      if (this.continueBtn) {
        this.continueBtn.classList.remove("d-none");
      }

      // Animar Scooby callado al terminar de hablar
      this.playScoobyQuiet();
    } catch (error) {
      console.error("Error al procesar mensaje:", error);
      this.addSystemMessage(`Error: ${error.message}`);
      this.playScoobyQuiet();
    } finally {
      // Reactivar botones al finalizar
      if (this.talkBtn && this.isVoiceSupported) this.talkBtn.disabled = false;
      if (this.sendBtn) this.sendBtn.disabled = false;
      if (this.textInput) {
        this.textInput.disabled = false;
        this.textInput.focus();
      }

      // Restablecer estado de procesamiento
      this.isProcessing = false;
    }
  }

  /**
   * Continúa una respuesta que puede haber quedado incompleta
   */
  async continuarRespuesta(userMessage, prevResponse) {
    if (this.isProcessing) {
      console.log(
        "Ya hay un proceso en curso, ignorando solicitud de continuación"
      );
      this.uiService.showWarning(
        "Por favor espera, ya hay un proceso en curso..."
      );
      return;
    }

    console.log("Iniciando continuación de respuesta");

    // Actualizar estado
    this.isProcessing = true;
    this.isContinuing = true;
    this.uiService.updateButtonStates(false, true, this.isSpeaking);
    this.uiService.continuationInProgress = true;

    try {
      // Mostrar indicador visual
      const thinkingMessage = this.uiService.addMessage(
        "Sistema",
        "💭 Scooby está pensando más sobre esto..."
      );

      // Preparar el prompt para la continuación
      const promptContinuacion = userMessage || "Cuéntame más sobre esto";
      console.log("Prompt de continuación:", promptContinuacion);

      // Obtener respuesta adicional
      const response = await this.llmService.getResponse(promptContinuacion, {
        prevResponse: prevResponse, // Pasar el contexto previo
        isContinuation: true,
      });

      // Eliminar mensaje de pensando
      if (thinkingMessage && thinkingMessage.parentNode) {
        thinkingMessage.parentNode.removeChild(thinkingMessage);
      }

      if (response && response.trim()) {
        // Agregar nueva respuesta al chat
        const messageElement = this.uiService.addSystemMessage(response);
        this.lastResponseText = response; // Guardar para posibles continuaciones futuras

        // Scrollear hacia abajo para mostrar la nueva respuesta
        this.uiService.scrollToBottom();

        // Reproducir respuesta con voz
        if (this.speechService) {
          try {
            // Mostrar a Scooby hablando
            this.uiService.showSpeakingScooby();
            this.isSpeaking = true;

            // Esperar un momento para sincronización
            await new Promise((resolve) => setTimeout(resolve, 300));

            // Intentar reproducir el audio
            await this.speechService.speak(response, {
              volume: 1.0,
              force: true,
              rate: 0.9,
            });

            // Mantener animación un poco más
            await new Promise((resolve) => setTimeout(resolve, 300));
          } catch (voiceError) {
            console.error(
              "Error al reproducir continuación con voz:",
              voiceError
            );
          } finally {
            // Restaurar estado normal
            this.isSpeaking = false;
            this.uiService.showSilentScooby();
          }
        }
      } else {
        throw new Error("No se pudo obtener más información");
      }
    } catch (error) {
      console.error("Error al continuar respuesta:", error);
      this.uiService.showError(
        "Lo siento, no pude continuar: " + error.message
      );
      this.uiService.showSilentScooby();
    } finally {
      // Restaurar estado
      this.isProcessing = false;
      this.isSpeaking = false;
      this.isContinuing = false;
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

  /**
   * Reinicia el sistema de reconocimiento de voz
   * Este método puede ser llamado cuando hay problemas con el reconocimiento
   */
  async resetSpeechSystem() {
    try {
      console.log("Reiniciando sistema de reconocimiento de voz...");

      // Detener cualquier reconocimiento en curso
      if (this.speechService) {
        this.speechService.stopListening();

        // Esperar un momento para asegurar que se ha detenido
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Reiniciar el reconocimiento
        this.speechService.initRecognition();

        // Actualizar la UI
        this.uiService.updateButtonStates(false, false, this.isSpeaking);

        // Agregar mensaje de sistema
        this.uiService.addSystemMessage(
          "Sistema de reconocimiento de voz reiniciado. Por favor, intenta hablar nuevamente."
        );

        console.log("Sistema de reconocimiento reiniciado correctamente");
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error al reiniciar reconocimiento de voz:", error);
      return false;
    }
  }

  // Añadir un método para diagnosticar el sistema de voz
  async diagnoseSpeechSystem() {
    const results = {
      browserSupport: false,
      microphoneAvailable: false,
      permissionsGranted: false,
      apiKeyAvailable: false,
      connectionWorks: false,
    };

    try {
      // 1. Verificar soporte del navegador
      results.browserSupport = !!(
        window.SpeechRecognition || window.webkitSpeechRecognition
      );
      console.log(
        `Soporte de reconocimiento en navegador: ${results.browserSupport}`
      );

      // 2. Verificar disponibilidad de micrófono
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioDevices = devices.filter(
          (device) => device.kind === "audioinput"
        );
        results.microphoneAvailable = audioDevices.length > 0;
        console.log(
          `Micrófono disponible: ${results.microphoneAvailable} (${audioDevices.length} dispositivos)`
        );
      } catch (e) {
        console.error("Error al enumerar dispositivos:", e);
      }

      // 3. Verificar permisos
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        results.permissionsGranted = true;
        stream.getTracks().forEach((track) => track.stop());
        console.log("Permisos de micrófono concedidos");
      } catch (e) {
        results.permissionsGranted = false;
        console.error("Permisos de micrófono denegados:", e);
      }

      // 4. Verificar API key
      results.apiKeyAvailable = !!localStorage.getItem("HUGGINGFACE_API_KEY");
      console.log(`API key disponible: ${results.apiKeyAvailable}`);

      // 5. Intentar hacer una conexión de prueba si hay API key
      if (results.apiKeyAvailable) {
        try {
          const response = await fetch(
            "https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem(
                  "HUGGINGFACE_API_KEY"
                )}`,
              },
              body: JSON.stringify({
                inputs: "Hola",
              }),
            }
          );

          results.connectionWorks = response.ok;
          console.log(`Conexión a Hugging Face: ${results.connectionWorks}`);

          if (!response.ok) {
            console.error(
              `Error de conexión: ${response.status} ${response.statusText}`
            );
            const responseText = await response.text();
            console.error("Detalles:", responseText);
          }
        } catch (e) {
          console.error("Error de conexión:", e);
        }
      }

      // Mostrar resumen
      console.log("Diagnóstico completo:", results);

      // Notificar al usuario
      let message = "Diagnóstico del sistema de voz:\n";
      message += `- Navegador compatible: ${
        results.browserSupport ? "✅" : "❌"
      }\n`;
      message += `- Micrófono disponible: ${
        results.microphoneAvailable ? "✅" : "❌"
      }\n`;
      message += `- Permisos concedidos: ${
        results.permissionsGranted ? "✅" : "❌"
      }\n`;
      message += `- API key configurada: ${
        results.apiKeyAvailable ? "✅" : "❌"
      }\n`;
      message += `- Conexión a API funciona: ${
        results.connectionWorks ? "✅" : "❌"
      }\n`;

      this.uiService.addSystemMessage(message);

      return results;
    } catch (error) {
      console.error("Error en diagnóstico:", error);
      return results;
    }
  }

  /**
   * Inicia el reconocimiento de voz con manejo mejorado de errores
   */
  startListening() {
    if (!this.speechService) {
      console.error(
        "No se puede iniciar reconocimiento: servicio no disponible"
      );
      this.uiService.showError(
        "Error: el servicio de reconocimiento de voz no está disponible"
      );
      return;
    }

    if (this.isProcessing || this.isSpeaking) {
      console.log(
        "No se puede iniciar reconocimiento mientras hay otro proceso en curso"
      );
      this.uiService.showWarning(
        "Por favor espera a que termine el proceso actual"
      );
      return;
    }

    console.log("Iniciando reconocimiento de voz...");

    try {
      // Mostrar feedback visual inmediato
      const talkBtn = document.getElementById("talk-btn");
      const stopBtn = document.getElementById("stop-btn");

      if (talkBtn) {
        talkBtn.classList.add("btn-recording");
        talkBtn.classList.remove("btn-success");
        talkBtn.innerHTML =
          '<i class="fas fa-microphone-alt me-1"></i> Iniciando...';
      }

      if (stopBtn) {
        stopBtn.disabled = false;
      }

      // Verificar permisos del micrófono
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          // Detener el stream inmediatamente
          stream.getTracks().forEach((track) => track.stop());

          // Reiniciar el servicio de reconocimiento antes de iniciar
          if (this.speechService.recognition) {
            this.speechService.recognition.abort();
            this.speechService.recognition = null;
          }

          // Inicializar nuevo reconocimiento
          this.speechService.initRecognition();

          // Iniciar el reconocimiento con un pequeño retraso
          setTimeout(() => {
            const started = this.speechService.startListening();
            if (started) {
              this.uiService.addMessage(
                "Sistema",
                "🎤 Escuchando... Di algo como '¿Qué puedes hacer?' o '¡Hola Scooby!'"
              );
            } else {
              throw new Error("No se pudo iniciar el reconocimiento");
            }
          }, 500);
        })
        .catch((error) => {
          console.error("Error al acceder al micrófono:", error);

          // Restaurar estado visual
          if (talkBtn) {
            talkBtn.classList.remove("btn-recording");
            talkBtn.classList.add("btn-success");
            talkBtn.innerHTML = '<i class="fas fa-microphone me-1"></i> Hablar';
          }

          if (stopBtn) {
            stopBtn.disabled = true;
          }

          // Mostrar error específico
          if (error.name === "NotAllowedError") {
            this.uiService.showError(
              "Por favor, permite el acceso al micrófono para poder usar el reconocimiento de voz"
            );
          } else if (error.name === "NotFoundError") {
            this.uiService.showError(
              "No se detectó ningún micrófono. Por favor, conecta uno e intenta de nuevo"
            );
          } else {
            this.uiService.showError(
              `Error al iniciar reconocimiento: ${error.message}`
            );
          }
        });
    } catch (error) {
      console.error("Error al iniciar reconocimiento de voz:", error);
      this.uiService.showError("No se pudo iniciar el reconocimiento de voz");

      // Restaurar estado visual
      if (talkBtn) {
        talkBtn.classList.remove("btn-recording");
        talkBtn.classList.add("btn-success");
        talkBtn.innerHTML = '<i class="fas fa-microphone me-1"></i> Hablar';
      }

      if (stopBtn) {
        stopBtn.disabled = true;
      }
    }
  }

  /**
   * Detiene el reconocimiento de voz con mejor manejo de estado
   */
  stopListening() {
    console.log("Deteniendo reconocimiento de voz...");

    // Restablecer el estado visual independientemente de si hay servicio
    if (this.talkBtn) {
      this.talkBtn.classList.remove("btn-recording");
      this.talkBtn.classList.add("btn-success");
      this.talkBtn.innerHTML = '<i class="fas fa-microphone me-1"></i> Hablar';
      this.talkBtn.disabled = false;
    }

    if (this.stopBtn) {
      this.stopBtn.disabled = true;
    }

    // Detener la síntesis de voz si está en curso
    if (this.isSpeaking && this.speechService) {
      try {
        this.speechService.cancelSpeech();
        console.log("Síntesis de voz cancelada");
      } catch (e) {
        console.warn("Error al cancelar síntesis de voz:", e);
      }
      this.uiService.showSilentScooby();
      this.isSpeaking = false;
    }

    // Detener el reconocimiento si el servicio existe
    if (this.speechService) {
      try {
        const stopped = this.speechService.stopListening();
        console.log("Reconocimiento de voz detenido correctamente:", stopped);
      } catch (error) {
        console.error("Error al detener reconocimiento:", error);
      }
    } else {
      console.warn(
        "No se puede detener reconocimiento: servicio no disponible"
      );
    }

    // Informar al usuario
    this.uiService.addMessage("Sistema", "🛑 Reconocimiento de voz detenido");
  }

  /**
   * Reproduce el video de Scooby hablando
   */
  playScoobyTalking() {
    console.log("Mostrando Scooby hablando");

    // Ocultar Scooby callado
    if (this.scoobyCalladoVideo) {
      this.scoobyCalladoVideo.style.display = "none";
    }

    // Mostrar Scooby hablando
    if (this.scoobyHablandoVideo) {
      this.scoobyHablandoVideo.style.display = "block";

      // Intentar reproducir el video
      try {
        const playPromise = this.scoobyHablandoVideo.play();
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            console.error("Error al reproducir video:", error);
          });
        }
      } catch (error) {
        console.error("Error al intentar reproducir video:", error);
      }
    }
  }

  /**
   * Muestra el Scooby en silencio
   */
  playScoobyQuiet() {
    console.log("Mostrando Scooby callado");

    // Ocultar Scooby hablando
    if (this.scoobyHablandoVideo) {
      this.scoobyHablandoVideo.style.display = "none";

      // Intentar pausar el video
      try {
        this.scoobyHablandoVideo.pause();
      } catch (error) {
        console.error("Error al intentar pausar video:", error);
      }
    }

    // Mostrar Scooby callado
    if (this.scoobyCalladoVideo) {
      this.scoobyCalladoVideo.style.display = "block";
    }
  }

  /**
   * Añade un mensaje del sistema
   */
  addSystemMessage(message) {
    if (!message || message.trim().length === 0) return;

    console.log("Mensaje del sistema:", message);

    // Crear elemento para el mensaje
    const messageElement = document.createElement("div");
    messageElement.className = "message system-message";

    // Contenido del mensaje
    const messageBubble = document.createElement("div");
    messageBubble.className = "message-bubble system-bubble";
    messageBubble.textContent = message;
    messageElement.appendChild(messageBubble);

    // Añadir al chat
    if (this.conversation) {
      this.conversation.appendChild(messageElement);
      this.conversation.scrollTop = this.conversation.scrollHeight;
    }

    return messageElement;
  }

  /**
   * Añade un mensaje del usuario
   */
  addUserMessage(message) {
    if (!message || message.trim().length === 0) return;

    console.log("Mensaje del usuario:", message);

    // Crear elemento para el mensaje
    const messageElement = document.createElement("div");
    messageElement.className = "message user-message";

    // Contenido del mensaje
    const messageBubble = document.createElement("div");
    messageBubble.className = "message-bubble user-bubble";
    messageBubble.textContent = message;
    messageElement.appendChild(messageBubble);

    // Añadir al chat
    if (this.conversation) {
      this.conversation.appendChild(messageElement);
      this.conversation.scrollTop = this.conversation.scrollHeight;
    }

    return messageElement;
  }

  createTemporaryButton() {
    console.log("Creando botón de bienvenida...");

    // Crear botón con estilo
    const tempButton = document.createElement("button");
    tempButton.textContent = "🐕 ¡Haz clic para conocer a Scooby!";
    tempButton.className = "btn btn-lg btn-primary welcome-button";
    tempButton.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 9999;
      padding: 20px 40px;
      font-size: 1.5rem;
      border-radius: 50px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.2);
      animation: pulse 2s infinite;
      cursor: pointer;
      background: #6a1b9a;
      border: none;
      color: white;
    `;

    // Añadir animación
    const style = document.createElement("style");
    style.textContent = `
      @keyframes pulse {
        0% { transform: translate(-50%, -50%) scale(1); box-shadow: 0 4px 15px rgba(0,0,0,0.2); }
        50% { transform: translate(-50%, -50%) scale(1.05); box-shadow: 0 8px 25px rgba(106,27,154,0.4); }
        100% { transform: translate(-50%, -50%) scale(1); box-shadow: 0 4px 15px rgba(0,0,0,0.2); }
      }
      .welcome-button:hover {
        background: #8e24aa !important;
        transform: translate(-50%, -50%) scale(1.02) !important;
      }
    `;
    document.head.appendChild(style);

    // Manejar clic
    tempButton.onclick = async () => {
      try {
        console.log("Botón de bienvenida clickeado, iniciando Scooby...");

        // Desactivar el botón inmediatamente
        tempButton.disabled = true;
        tempButton.style.opacity = "0.7";
        tempButton.textContent = "🐕 Iniciando...";

        // Inicializar audio (crítico para la interacción)
        await this.initAudio();
        console.log("Audio inicializado correctamente");

        // Animar y remover el botón
        tempButton.style.transition = "all 0.5s ease-out";
        tempButton.style.opacity = "0";
        tempButton.style.transform = "translate(-50%, -50%) scale(0.8)";

        // Simulación de interacción para desbloquear el audio
        this.simulateUserInteraction();

        setTimeout(() => {
          tempButton.remove();
          style.remove();
        }, 500);

        // Inicialización de servicios - NO ESPERAR por ellos
        // para evitar bloqueos que impidan establecer isInitialized
        this.initializeServices().catch((e) =>
          console.warn("Error no crítico al inicializar servicios:", e)
        );

        // Verificar conexión con el modelo (no bloqueante)
        this.checkModelConnection()
          .then(() => {
            this.isConnected = true;
            console.log("Conexión con el modelo establecida");
          })
          .catch((error) => {
            console.warn("Error de conexión (no crítico):", error);
            this.isConnected = false;
          })
          .finally(() => {
            // IMPORTANTE: Marcar como inicializado INDEPENDIENTEMENTE de la conexión
            console.log("⭐ Marcando la aplicación como inicializada");
            this.isInitialized = true;

            // Mostrar mensaje incluso si hubo errores
            this.showWelcomeMessage().catch((e) =>
              console.warn("Error al mostrar bienvenida:", e)
            );
          });

        // CRÍTICO: Marcar como inicializado de inmediato para evitar el botón de emergencia
        // Incluso si los servicios aún no están completamente cargados
        setTimeout(() => {
          if (!this.isInitialized) {
            console.warn(
              "⚠️ Forzando estado de inicialización para evitar botón de emergencia"
            );
            this.isInitialized = true;
          }
        }, 2000);
      } catch (error) {
        console.error("Error al iniciar Scooby:", error);

        // IMPORTANTE: Incluso con error, marcar como inicializado para evitar el botón
        this.isInitialized = true;

        // Intentar que el usuario vea el mensaje de error
        alert("Error al iniciar Scooby: " + error.message);

        // Restaurar el botón para otro intento
        tempButton.disabled = false;
        tempButton.style.opacity = "1";
        tempButton.style.transform = "translate(-50%, -50%)";
        tempButton.textContent = "🐕 ¡Intentar de nuevo!";
      }
    };

    // Añadir el botón al DOM
    document.body.appendChild(tempButton);
    console.log("Botón de bienvenida añadido al DOM");
  }

  // Función para simular interacción del usuario y desbloquear audio
  simulateUserInteraction() {
    try {
      // Crear y reproducir un sonido silencioso
      const audio = new Audio();
      audio.volume = 0.01;
      audio.src =
        "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";

      // Reproducir y detener inmediatamente
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setTimeout(() => {
              audio.pause();
              audio.src = "";
            }, 10);
          })
          .catch((e) => console.warn("Error en simulación de audio:", e));
      }

      // Simular clicks
      document.body.click();

      // Activar video silenciosamente
      if (this.scoobyCalladoVideo) {
        this.scoobyCalladoVideo
          .play()
          .catch((e) => console.warn("No se pudo activar video:", e));
      }
    } catch (e) {
      console.warn("Error en simulación de interacción:", e);
    }
  }

  /**
   * Inicializa el contexto de audio y precarga la síntesis de voz
   * Versión mejorada con múltiples intentos y mejor manejo de errores
   */
  async initAudio() {
    console.log("Inicializando contexto de audio...");
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`Intento ${attempt}/${maxAttempts} de inicializar audio`);

        // 1. Forzar interacción para desbloquear políticas restrictivas
        document.body.click();
        document.documentElement.click();

        // 2. Activar AudioContext con diferentes estrategias
        const audioContext = new (window.AudioContext ||
          window.webkitAudioContext)();

        if (audioContext.state === "suspended") {
          // Intentar resumir con diferentes métodos
          try {
            // Método 1: Promesa estándar
            await audioContext.resume();
            console.log("AudioContext resumido correctamente");
          } catch (resumeError) {
            console.warn("Error al resumir AudioContext:", resumeError);

            // Método 2: Evento de interacción
            document.body.addEventListener("click", function resumeOnce() {
              audioContext.resume().then(() => {
                console.log("AudioContext resumido por clic");
                document.body.removeEventListener("click", resumeOnce);
              });
            });

            // Simular clic
            document.body.click();
          }
        }

        // 3. Crear un breve sonido silencioso
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        // Volumen extremadamente bajo (prácticamente inaudible)
        gainNode.gain.value = 0.001;

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime);

        // Ejecutar muy brevemente
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.05);

        // 4. Inicialización más estructurada del sintetizador de voz
        if (window.speechSynthesis) {
          // 4.1 Cancelar cualquier síntesis previa
          window.speechSynthesis.cancel();

          // 4.2 Si tenemos el servicio de voz, utilizar sus métodos para cargar voces
          if (
            this.speechService &&
            typeof this.speechService.loadVoices === "function"
          ) {
            this.speechService.loadVoices();
            console.log("Voces cargadas a través del servicio de voz");
          } else {
            // 4.3 Fallback directo si el servicio no está disponible
            const voices = window.speechSynthesis.getVoices();
            console.log(`Voces disponibles (carga directa): ${voices.length}`);

            // Precargar con una utterance silenciosa
            const utterance = new SpeechSynthesisUtterance("");
            utterance.volume = 0;
            utterance.rate = 1.0;
            utterance.pitch = 1.0;

            window.speechSynthesis.speak(utterance);
          }

          console.log("Sintetizador de voz precargado");
        } else {
          console.warn("SpeechSynthesis no disponible en este navegador");
        }

        // 5. Estrategia alternativa: Audio element para garantizar desbloqueo
        try {
          const audioElement = new Audio();
          audioElement.volume = 0.01;
          audioElement.src =
            "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";

          const playPromise = audioElement.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                setTimeout(() => {
                  audioElement.pause();
                  audioElement.src = "";
                }, 10);
              })
              .catch((e) => console.warn("Error en reproducción de audio:", e));
          }
        } catch (audioElementError) {
          console.warn("Error en Audio element:", audioElementError);
        }

        // Si llegamos aquí, asumimos éxito
        console.log("Audio inicializado correctamente");
        return true;
      } catch (error) {
        console.warn(
          `Error en intento ${attempt}/${maxAttempts} de inicialización de audio:`,
          error
        );

        if (attempt === maxAttempts) {
          console.error(
            "Error al inicializar audio después de múltiples intentos:",
            error
          );
          // En el último intento, continuamos de todas formas
          return false;
        }

        // Esperar un momento antes del siguiente intento
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // Si llegamos aquí es que todos los intentos fallaron pero seguimos
    console.warn(
      "No se pudo inicializar audio completamente, continuando de todas formas"
    );
    return false;
  }

  /**
   * Inicializa los servicios necesarios para la aplicación
   */
  async initializeServices() {
    try {
      console.log("Inicializando servicios con configuración...");

      // Verificar que tenemos los servicios necesarios
      if (!this.llmService || !this.speechService) {
        throw new Error("Servicios base no inicializados correctamente");
      }

      // Obtener la API key desde localStorage o desde la propiedad de la clase
      const apiKey = localStorage.getItem("HUGGINGFACE_API_KEY") || this.apiKey;

      if (!apiKey) {
        throw new Error("No se encontró la API key de Hugging Face");
      }

      // Asignar la API key directamente a la propiedad del servicio
      // Usamos la propiedad apiKey que ahora tiene un setter en HuggingFaceService
      this.llmService.apiKey = apiKey;
      console.log("API key asignada al servicio LLM");

      // Verificar soporte de voz
      if (this.speechService) {
        this.isVoiceSupported = this.speechService.canUseVoiceRecognition();
        console.log("Soporte de voz verificado:", this.isVoiceSupported);

        if (this.isVoiceSupported) {
          // Configurar callbacks de voz
          this.setupSpeechCallbacks();
        } else {
          console.log(
            "Modo texto activado - reconocimiento de voz no disponible"
          );
          this.adaptUIForTextMode();
        }
      }

      // Inicializar servicio de imágenes
      if (this.dogApi) {
        console.log("Servicio de imágenes inicializado");
      }

      console.log("Servicios inicializados correctamente");
      return true;
    } catch (error) {
      console.error("Error al inicializar servicios:", error);
      this.isVoiceSupported = false;
      this.adaptUIForTextMode();
      throw error;
    }
  }

  handleGlobalError(event) {
    console.error("Error global capturado:", event.error || event.message);

    // Si tenemos el servicio UI, mostrar mensaje de error
    if (this.uiService) {
      const errorDetails = event.error
        ? event.error.stack || event.error.message
        : event.message || "Error desconocido";

      // Mostrar un mensaje de error más informativo
      const errorMessage = document.createElement("div");
      errorMessage.className = "error-message";
      errorMessage.innerHTML = `
        <div style="background-color: #ffdddd; padding: 15px; border-radius: 5px; border-left: 5px solid #f44336; margin-bottom: 15px;">
          <h4 style="color: #d32f2f; margin-top: 0;">Error detectado</h4>
          <p>${errorDetails}</p>
          <div>
            <button onclick="location.reload()" class="btn btn-danger btn-sm">Recargar página</button>
            <button onclick="window.app.resetApplication()" class="btn btn-warning btn-sm ml-2">Reiniciar Scooby</button>
          </div>
        </div>
      `;

      // Insertar al principio del área de conversación
      const conversation = document.getElementById("conversation");
      if (conversation) {
        if (conversation.firstChild) {
          conversation.insertBefore(errorMessage, conversation.firstChild);
        } else {
          conversation.appendChild(errorMessage);
        }
      }
    }

    // Intentar recuperar la aplicación
    this.attemptRecovery();
  }

  attemptRecovery() {
    console.log("Intentando recuperar la aplicación después de un error...");

    // Intentar restablecer los servicios básicos
    try {
      // Restablecer estado
      this.isProcessing = false;

      // Asegurarnos de que la UI es utilizable
      if (this.uiService) {
        // Habilitar botones
        const talkBtn = document.getElementById("talk-btn");
        const sendBtn = document.getElementById("send-btn");
        if (talkBtn) talkBtn.disabled = false;
        if (sendBtn) sendBtn.disabled = false;
      }

      // Si el reconocimiento de voz está activo, detenerlo
      if (this.speechService && this.speechService.recognition) {
        try {
          this.speechService.stopRecognition();
          console.log("Reconocimiento de voz detenido durante recuperación");
        } catch (e) {
          console.warn("No se pudo detener el reconocimiento:", e);
        }
      }

      // Reiniciar el sistema de audio si es necesario
      this.initAudio().catch((e) =>
        console.warn("Error al reiniciar audio:", e)
      );
    } catch (recoveryError) {
      console.error("Error durante intento de recuperación:", recoveryError);
    }
  }

  resetApplication() {
    console.log("Reiniciando completamente la aplicación...");

    try {
      // Detener todos los procesos activos
      if (this.speechService) {
        try {
          this.speechService.stopRecognition();
          this.speechService.cancelSpeech();
        } catch (e) {
          console.warn("Error al detener servicios de voz:", e);
        }
      }

      // Limpiar el área de conversación
      const conversation = document.getElementById("conversation");
      if (conversation) {
        conversation.innerHTML = "";
      }

      // Mostrar mensaje de reinicio
      this.addSystemMessage("Reiniciando Scooby... Por favor espere.");

      // Reiniciar estado
      this.isProcessing = false;
      this.isInitialized = false;

      // Reinicializar después de un breve retraso
      setTimeout(() => {
        this.init()
          .then(() => {
            this.addSystemMessage("¡Scooby ha sido reiniciado correctamente!");
            this.showWelcomeMessage();
          })
          .catch((error) => {
            console.error("Error durante el reinicio:", error);
            this.addSystemMessage("Error al reiniciar: " + error.message);

            // Último recurso: sugerir recarga manual
            const reloadMsg = document.createElement("div");
            reloadMsg.innerHTML = `
              <div style="text-align: center; margin: 20px 0;">
                <button onclick="location.reload()" class="btn btn-primary">Recargar página</button>
              </div>
            `;
            conversation.appendChild(reloadMsg);
          });
      }, 1000);
    } catch (error) {
      console.error("Error catastrófico durante reinicio:", error);
      alert("Error grave. La página se recargará.");
      location.reload();
    }
  }

  /**
   * Adapta la UI para modo de texto cuando no hay soporte de voz
   */
  adaptUIForTextMode() {
    try {
      console.log("Adaptando interfaz para modo texto...");

      // Deshabilitar botones relacionados con la voz
      const talkBtn = document.getElementById("talk-btn");
      const stopBtn = document.getElementById("stop-btn");
      const resumeBtn = document.getElementById("resume-btn");

      if (talkBtn) {
        talkBtn.disabled = true;
        talkBtn.title = "Tu navegador no soporta reconocimiento de voz";
        talkBtn.classList.remove("btn-success");
        talkBtn.classList.add("btn-secondary");
        talkBtn.style.opacity = "0.5";
      }

      if (stopBtn) stopBtn.disabled = true;
      if (resumeBtn) resumeBtn.disabled = true;

      // Mostrar un mensaje en la UI
      this.addSystemMessage(
        "⚠️ Tu navegador no soporta reconocimiento de voz. Usa el modo de texto para chatear con Scooby."
      );

      // Destacar el input de texto
      const textInput = document.getElementById("text-input");
      if (textInput) {
        textInput.placeholder =
          "Escribe tu mensaje aquí (reconocimiento de voz no disponible)";
        textInput.focus();

        // Añadir un estilo para hacer más destacado el campo de texto
        textInput.style.boxShadow = "0 0 0 3px rgba(0, 123, 255, 0.4)";
        setTimeout(() => {
          textInput.style.transition = "box-shadow 0.5s ease";
          textInput.style.boxShadow = "none";
        }, 2000);
      }

      // Mostrar un tooltip con los navegadores recomendados
      const tooltip = document.createElement("div");
      tooltip.className = "browser-recommendation";
      tooltip.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background-color: #17a2b8;
        color: white;
        padding: 10px 15px;
        border-radius: 5px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        z-index: 1000;
        font-size: 14px;
        text-align: center;
        max-width: 90%;
      `;

      tooltip.innerHTML = `
        <div>Para usar la función de voz, recomendamos 
        <strong>Chrome</strong> o <strong>Edge</strong></div>
        <button id="close-tooltip" style="background: none; border: none; color: white; margin-top: 5px; cursor: pointer;">
          Entendido
        </button>
      `;

      document.body.appendChild(tooltip);

      // Configurar cierre del tooltip
      document.getElementById("close-tooltip").addEventListener("click", () => {
        tooltip.style.opacity = "0";
        tooltip.style.transition = "opacity 0.5s ease";
        setTimeout(() => tooltip.remove(), 500);
      });

      // Autocierre después de 8 segundos
      setTimeout(() => {
        if (document.body.contains(tooltip)) {
          tooltip.style.opacity = "0";
          tooltip.style.transition = "opacity 0.5s ease";
          setTimeout(() => {
            if (document.body.contains(tooltip)) {
              tooltip.remove();
            }
          }, 500);
        }
      }, 8000);
    } catch (error) {
      console.error("Error al adaptar UI para modo texto:", error);
    }
  }

  /**
   * Obtiene la API key de los parámetros de la URL
   * @returns {string|null} La API key si existe en la URL, null si no
   */
  getAPIKeyFromURL() {
    try {
      // Obtener los parámetros de la URL
      const urlParams = new URLSearchParams(window.location.search);

      // Verificar si existe el parámetro 'key'
      if (urlParams.has("key")) {
        const key = urlParams.get("key");
        console.log("API key encontrada en URL");
        return key;
      }

      // También probar con el formato completo de Hugging Face
      const hfPattern = /hf_[a-zA-Z0-9]{34}/;
      const matches = window.location.href.match(hfPattern);
      if (matches && matches.length > 0) {
        console.log("API key de Hugging Face encontrada en URL");
        return matches[0];
      }

      return null;
    } catch (error) {
      console.warn("Error al obtener API key de URL:", error);
      return null;
    }
  }

  /**
   * Maneja errores durante la inicialización
   */
  handleInitializationError(error) {
    console.error("Error durante la inicialización:", error);
    // Agregar un mensaje en la interfaz
    if (this.uiService) {
      this.uiService.addSystemMessage(
        `Error de inicialización: ${error.message}. Intenta recargar la página o presiona el botón de emergencia.`
      );
    }

    // Intentar establecer al menos algunas capacidades básicas
    if (!this.isInitialized) {
      // Forzar inicialización parcial para permitir al menos el chat por texto
      console.log(
        "Estableciendo inicialización parcial para funcionalidad mínima"
      );
      this.isInitialized = true;

      // Notificar al usuario que hay funcionalidad limitada
      if (this.uiService) {
        this.uiService.addSystemMessage(
          "Scooby está operando en modo limitado. Algunas funciones pueden no estar disponibles."
        );
      }
    }
  }
}

// Inicialización automática de la aplicación cuando se carga el script
let appInstance = null;

function initApp() {
  console.log("🚀 Inicializando App desde módulo...");

  try {
    // Verificar si ya hay una instancia
    if (window.app) {
      console.log("Ya existe una instancia de la aplicación");
      appInstance = window.app;

      // Si la instancia existe pero no está inicializada, inicializarla
      if (
        !appInstance.isInitialized &&
        typeof appInstance.init === "function"
      ) {
        console.log("Inicializando instancia existente...");
        appInstance.init().catch((e) => {
          console.error("Error al inicializar instancia existente:", e);
          // Mostrar un mensaje de error más visible
          const errorDiv = document.createElement("div");
          errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: #f8d7da;
            color: #721c24;
            padding: 20px;
            border-radius: 5px;
            box-shadow: 0 0 15px rgba(0,0,0,0.2);
            z-index: 9999;
            text-align: center;
          `;
          errorDiv.innerHTML = `
            <h3>❌ Error - ${e.message}</h3>
            <p>Intenta recargar la página</p>
            <button onclick="location.reload()" class="btn btn-danger">Recargar página</button>
          `;
          document.body.appendChild(errorDiv);
        });
      }
    } else {
      // Si no hay instancia, crear una nueva
      console.log("Creando nueva instancia de la aplicación...");
      appInstance = new ScoobyApp();
      window.app = appInstance; // Exponerla globalmente

      // Inicializar con manejo de errores
      appInstance.init().catch((e) => {
        console.error("Error durante inicialización:", e);
        // Mostrar mensaje de error
        alert("Error al inicializar Scooby: " + e.message);
      });
    }

    return appInstance;
  } catch (error) {
    console.error("Error crítico durante inicialización:", error);
    alert("Error crítico: " + error.message);
    return null;
  }
}

// Auto-inicializar después de un breve retraso para asegurar que el DOM está listo
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    initApp();
  }, 500);
});

// Exportar app para uso en otros módulos
export { ScoobyApp, initApp };
