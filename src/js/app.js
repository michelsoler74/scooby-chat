import SpeechService from "./services/SpeechService.js";
import HuggingFaceService from "./services/HuggingFaceService.js";
import { UIService } from "./services/UIService.js";

class ScoobyApp {
  constructor() {
    this.isInitialized = false;
    this.isProcessing = false;
    this.isSpeaking = false;
    this.hasVoiceSupport = false;
    this.welcomeAttempted = false;
    this.uiService = null;
    this.speechService = null;
    this.llmService = null;

    // Detectar tipo de dispositivo
    this.isMobile = window.innerWidth <= 768 || "ontouchstart" in window;
    console.log(
      `Inicializando Scooby en dispositivo ${
        this.isMobile ? "móvil" : "desktop"
      }`
    );
    console.log(
      `Dimensiones de ventana: ${window.innerWidth}x${window.innerHeight}`
    );

    // Añadir clases específicas al body para detectar el tipo de dispositivo
    document.body.classList.add(
      this.isMobile ? "mobile-device" : "desktop-device"
    );
    document.body.classList.add("user-interaction");

    // Ajustar la altura de elementos basados en la altura de la ventana en móviles
    if (this.isMobile) {
      this.adjustMobileLayout();
      // También ajustar cuando cambie el tamaño o la orientación
      window.addEventListener("resize", () => this.adjustMobileLayout());
      window.addEventListener("orientationchange", () =>
        this.adjustMobileLayout()
      );
    }

    // Crear un botón temporal para forzar la interacción
    const createTemporaryButton = () => {
      const tempButton = document.createElement("button");
      tempButton.textContent = "🐕 ¡Haz clic para conocer a Scooby!";
      tempButton.className = "btn btn-lg btn-primary welcome-button";
      tempButton.style.position = "fixed";
      tempButton.style.top = "50%";
      tempButton.style.left = "50%";
      tempButton.style.transform = "translate(-50%, -50%)";
      tempButton.style.zIndex = "9999";
      tempButton.style.padding = "20px 40px";
      tempButton.style.fontSize = "1.5rem";
      tempButton.style.borderRadius = "50px";
      tempButton.style.boxShadow = "0 4px 15px rgba(0,0,0,0.2)";
      tempButton.style.animation = "pulse 2s infinite";
      tempButton.style.cursor = "pointer";
      tempButton.style.background = "#6a1b9a";
      tempButton.style.border = "none";
      tempButton.style.color = "white";

      // Añadir estilo de animación
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

      tempButton.onclick = async () => {
        // Desactivar el botón inmediatamente para evitar clics múltiples
        tempButton.disabled = true;
        tempButton.style.opacity = "0.7";
        tempButton.textContent = "🐕 Iniciando...";

        try {
          // Forzar la activación del audio de múltiples maneras
          await Promise.all([
            // 1. Activar AudioContext
            (async () => {
              try {
                const audioContext = new (window.AudioContext ||
                  window.webkitAudioContext)();
                if (audioContext.state === "suspended") {
                  await audioContext.resume();
                }
                const oscillator = audioContext.createOscillator();
                oscillator.connect(audioContext.destination);
                oscillator.frequency.setValueAtTime(
                  0,
                  audioContext.currentTime
                );
                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.01);
              } catch (e) {
                console.warn("Error al activar AudioContext:", e);
              }
            })(),

            // 2. Precargar el sintetizador de voz
            (async () => {
              if (window.speechSynthesis) {
                try {
                  window.speechSynthesis.cancel();
                  const voices = window.speechSynthesis.getVoices();
                  const utterance = new SpeechSynthesisUtterance("");
                  utterance.volume = 0;
                  window.speechSynthesis.speak(utterance);
                } catch (e) {
                  console.warn("Error al precargar síntesis:", e);
                }
              }
            })(),
          ]);

          // Añadir clase de interacción
          document.body.classList.add("user-interaction");

          // Remover el botón con animación
          tempButton.style.transition = "all 0.5s ease-out";
          tempButton.style.opacity = "0";
          tempButton.style.transform = "translate(-50%, -50%) scale(0.8)";

          setTimeout(() => {
            tempButton.remove();
            style.remove();
          }, 500);

          // Inicializar la aplicación y esperar a que termine
          await this.initializeApp();

          // Esperar un momento antes de mostrar el mensaje de bienvenida
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // Mostrar el mensaje de bienvenida
          await this.showWelcomeMessage();
        } catch (error) {
          console.error("Error durante la inicialización:", error);
          // Restaurar el botón en caso de error
          tempButton.disabled = false;
          tempButton.style.opacity = "1";
          tempButton.textContent = "🐕 ¡Intentar de nuevo!";
        }
      };

      document.body.appendChild(tempButton);
    };

    // Mostrar el botón temporal inmediatamente
    createTemporaryButton();
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
      throw error; // Propagar el error para que se pueda manejar en el botón
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

      onChatCleared: () => {
        // Mostrar mensaje de bienvenida después de limpiar el chat
        this.reinitWelcomeMessage();
      },
    });
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

      // En móviles, asegurarnos de que el avatar permanezca visible
      if (this.isMobile) {
        this.adjustMobileLayout();
      }

      // Obtener respuesta
      const response = await this.llmService.getResponse(userMessage);

      // Procesar respuesta
      if (response && response.trim()) {
        // Mostrar respuesta con emojis en UI
        const messageElement = this.uiService.addSystemMessage(
          response,
          false,
          true
        );

        // Limpiar emoticonos para la síntesis de voz
        const responseForSpeech = response
          .replace(
            /[\u{1F300}-\u{1F9FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F1E0}-\u{1F1FF}]|[👋🐕]/gu,
            ""
          )
          .trim();

        // Forzar scroll al final en todos los dispositivos
        this.uiService.scrollToBottom();

        // Preparamos el entorno para la síntesis
        if (window.speechSynthesis) {
          window.speechSynthesis.cancel(); // Cancelar cualquier síntesis previa
        }

        // Sintetizar voz si está disponible
        if (this.speechService) {
          console.log("INICIANDO SÍNTESIS DE VOZ PARA RESPUESTA");
          try {
            // Pequeña pausa antes de comenzar a hablar (ayuda con la sincronización)
            await new Promise((resolve) => setTimeout(resolve, 300));

            // Asegurarnos que el usuario puede ver a Scooby antes de que comience a hablar
            if (this.isMobile) {
              this.uiService.scrollToBottom();
            }

            // Mostrar el Scooby hablando visualmente
            this.uiService.showSpeakingScooby();
            this.isSpeaking = true;
            this.uiService.updateButtonStates(false, false, true);

            // Agregar visual cue (opcional) al mensaje
            if (messageElement) {
              messageElement.classList.add("current-speaking");
            }

            // Iniciar la síntesis con opciones mejoradas
            const speakingPromise = this.speechService.speak(
              responseForSpeech,
              {
                volume: 1.0,
                force: true,
                rate: 0.9, // Ligeramente más lento para mejor comprensión
              }
            );

            // Esperar a que termine la síntesis de voz
            await speakingPromise;

            // Mantener la animación un poco más antes de terminar
            await new Promise((resolve) => setTimeout(resolve, 500));

            console.log("Respuesta reproducida correctamente");
          } catch (error) {
            console.error("Error al sintetizar voz de respuesta:", error);

            // Si falla la síntesis automática, ofrecer botón para reproducir manualmente
            if (
              messageElement &&
              !messageElement.querySelector(".read-message-btn")
            ) {
              this.addManualPlayButton(messageElement, responseForSpeech);
            }
          } finally {
            // Asegurarnos de restablecer el estado correcto
            if (messageElement) {
              messageElement.classList.remove("current-speaking");
            }
            this.isSpeaking = false;
            this.uiService.showSilentScooby();
            this.uiService.updateButtonStates(false, false, false);
            console.log("Finalizada síntesis de voz de respuesta");
          }
        } else {
          console.error(
            "El servicio de voz no está disponible para síntesis de respuesta"
          );
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
      this.uiService.updateButtonStates(false, false, false);

      // Asegurar que el scroll está al final después de todo el proceso
      if (this.isMobile) {
        setTimeout(() => this.uiService.scrollToBottom(), 300);
      }
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
          console.log("INICIANDO SÍNTESIS DE VOZ PARA CONTINUACIÓN");
          try {
            // Mostrar el Scooby hablando visualmente
            this.uiService.showSpeakingScooby();
            this.isSpeaking = true;
            this.uiService.updateButtonStates(false, false, true);

            // Pequeña espera para asegurar que la UI se ha actualizado
            await new Promise((resolve) => setTimeout(resolve, 200));

            // Intentar reproducir la voz y loggear todo el proceso
            console.log(
              "Reproduciendo continuación en voz alta:",
              response.substring(0, 50) + "..."
            );

            const speakingPromise = this.speechService.speak(response);
            await speakingPromise;

            // Mantener Scooby animado un poco más
            await new Promise((resolve) => setTimeout(resolve, 500));

            console.log("Continuación reproducida correctamente");
          } catch (error) {
            console.error("Error al sintetizar voz de continuación:", error);
          } finally {
            // Asegurarnos de restablecer el estado correcto
            this.isSpeaking = false;
            this.uiService.showSilentScooby();
            this.uiService.updateButtonStates(false, false, false);
            console.log("Finalizada síntesis de voz de continuación");
          }
        } else {
          console.error(
            "El servicio de voz no está disponible para síntesis de continuación"
          );
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
