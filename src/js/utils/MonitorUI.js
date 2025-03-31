import MonitorService from "../services/MonitorService.js";

/**
 * Clase para manejar la interfaz de usuario del monitor
 */
class MonitorUI {
  constructor() {
    // Referencias a elementos DOM (con verificación de existencia)
    this.monitorBtn = document.getElementById("monitor-btn");
    this.monitorPanel = document.getElementById("monitor-panel");
    this.resetBtn = document.getElementById("reset-stats-btn");

    // Elementos de estadísticas
    this.totalCallsElement = document.getElementById("total-calls");
    this.chatCallsElement = document.getElementById("chat-calls");
    this.ttsCallsElement = document.getElementById("tts-calls");
    this.sttCallsElement = document.getElementById("stt-calls");
    this.tokenEstimateElement = document.getElementById("token-estimate");
    this.totalProgressElement = document.getElementById("total-progress");
    this.tokenProgressElement = document.getElementById("token-progress");

    // Instanciar servicio de monitoreo
    this.monitorService = new MonitorService();

    // Nuevo: Guardar información de errores
    this.errors = {
      stt: 0,
      tts: 0,
      chat: 0,
    };

    // Inicializar eventos solo si existen los elementos necesarios
    if (this.monitorBtn && this.monitorPanel) {
      this.initEvents();
    } else {
      console.warn("Elementos de monitoreo no encontrados en el DOM");
    }
  }

  /**
   * Inicializa los eventos del monitor
   */
  initEvents() {
    // Verificar que existen los elementos necesarios
    if (!this.monitorBtn || !this.monitorPanel) {
      console.warn(
        "No se pudieron inicializar eventos de monitoreo: elementos no disponibles"
      );
      return;
    }

    // Evento de presionar el botón
    this.monitorBtn.addEventListener("pointerdown", () => {
      this.showMonitorPanel();
    });

    // Evento de soltar el botón
    this.monitorBtn.addEventListener("pointerup", () => {
      this.hideMonitorPanel();
    });

    // También ocultar si el puntero sale del botón
    this.monitorBtn.addEventListener("pointerleave", () => {
      this.hideMonitorPanel();
    });

    // Evento para móviles (salir del panel)
    this.monitorPanel.addEventListener("pointerdown", (e) => {
      // Evitar que se cierre si haces clic dentro
      e.stopPropagation();
    });

    // Evento para reiniciar estadísticas
    if (this.resetBtn) {
      this.resetBtn.addEventListener("click", (e) => {
        e.stopPropagation(); // Evitar cierre del panel

        if (
          confirm(
            "¿Estás seguro de que quieres reiniciar todas las estadísticas?"
          )
        ) {
          this.monitorService.resetCounters();
          this.errors = { stt: 0, tts: 0, chat: 0 }; // Reiniciar errores también
          this.updateStats();
        }
      });
    }

    // Inicializar con valores actuales
    this.updateStats();
  }

  /**
   * Actualiza las estadísticas en la interfaz
   */
  updateStats() {
    // Obtener valores actuales
    const stats = this.monitorService.getUsageSummary();

    // Actualizar elementos de interfaz (solo si existen)
    if (this.totalCallsElement)
      this.totalCallsElement.textContent = stats.calls.total.toLocaleString();
    if (this.chatCallsElement)
      this.chatCallsElement.textContent = `${stats.calls.chat.toLocaleString()} (${
        this.errors.chat
      } errores)`;
    if (this.ttsCallsElement)
      this.ttsCallsElement.textContent = `${stats.calls.tts.toLocaleString()} (${
        this.errors.tts
      } errores)`;
    if (this.sttCallsElement)
      this.sttCallsElement.textContent = `${stats.calls.stt.toLocaleString()} (${
        this.errors.stt
      } errores)`;
    if (this.tokenEstimateElement)
      this.tokenEstimateElement.textContent =
        stats.tokens.total.toLocaleString();

    // Actualizar barras de progreso
    if (this.totalProgressElement) {
      const totalPercentage = Math.min((stats.calls.total / 1000) * 100, 100);
      this.totalProgressElement.style.width = `${totalPercentage}%`;
    }

    if (this.tokenProgressElement) {
      const tokenPercentage = Math.min(parseFloat(stats.tokens.percent), 100);
      this.tokenProgressElement.style.width = `${tokenPercentage}%`;

      // Cambiar color según el uso
      if (tokenPercentage > 80) {
        this.tokenProgressElement.className = "progress-bar danger";
      } else if (tokenPercentage > 50) {
        this.tokenProgressElement.className = "progress-bar warning";
      } else {
        this.tokenProgressElement.className = "progress-bar";
      }
    }

    // Comprobar si hay API key configurada
    const apiKey = localStorage.getItem("HUGGINGFACE_API_KEY");
    if (!apiKey) {
      // Mostrar alerta en panel si no hay API key
      const apiMessage = document.getElementById("api-key-message");
      if (apiMessage) {
        apiMessage.style.display = "block";
      }
    }

    // Actualizar estado de reconocimiento de voz si existe
    this.updateSpeechStatus();
  }

  /**
   * Actualiza la información sobre el estado del reconocimiento de voz
   */
  updateSpeechStatus() {
    const micStatus = document.getElementById("mic-status");
    if (micStatus) {
      const speechService = window.speechService; // Acceder al servicio global

      if (speechService) {
        const statusText = document.createElement("small");

        if (
          speechService.useHuggingFace === false &&
          speechService.HUGGINGFACE_API_KEY
        ) {
          statusText.className = "text-warning";
          statusText.textContent =
            "⚠️ API Hugging Face desactivada temporalmente por errores";
          micStatus.innerHTML = "";
          micStatus.appendChild(statusText);
        } else if (speechService.huggingFaceFailures > 0) {
          statusText.className = "text-warning";
          statusText.textContent = `⚠️ API Hugging Face: ${speechService.huggingFaceFailures} errores recientes`;
          micStatus.innerHTML = "";
          micStatus.appendChild(statusText);
        }
      }
    }
  }

  /**
   * Muestra el panel de monitoreo
   */
  showMonitorPanel() {
    try {
      if (this.monitorPanel) {
        // Actualizar estadísticas antes de mostrar
        this.updateStats();
        // Usar la clase 'active' en lugar de modificar el style directamente
        this.monitorPanel.classList.add("active");
      } else {
        console.warn("No se encontró el elemento panel de monitoreo");
      }
    } catch (error) {
      console.error("Error al mostrar panel de monitoreo:", error);
    }
  }

  /**
   * Oculta el panel de monitoreo
   */
  hideMonitorPanel() {
    try {
      if (this.monitorPanel) {
        // Usar la clase 'active' en lugar de modificar el style directamente
        this.monitorPanel.classList.remove("active");
      } else {
        console.warn("No se encontró el elemento panel de monitoreo");
      }
    } catch (error) {
      console.error("Error al ocultar panel de monitoreo:", error);
    }
  }

  /**
   * Registra una llamada API y actualiza estadísticas
   * @param {string} type - Tipo de llamada (chat, tts, stt)
   * @param {number} tokenCount - Cantidad estimada de tokens (solo para chat)
   */
  trackApiCall(type, tokenCount = 0) {
    this.trackCall(type);
  }

  /**
   * Registra un error en una llamada API
   * @param {string} type - Tipo de error (chat, tts, stt)
   */
  trackError(type) {
    if (!this.errors || !this.errors[type]) {
      console.warn(`Tipo de error no válido: ${type}`);
      return;
    }

    this.errors[type]++;
    this.updateStats();
  }

  // Añadir método trackCall que faltaba
  trackCall(type) {
    try {
      if (this.monitorService) {
        this.monitorService.trackCall(type);
        this.updateStats();
      }
    } catch (error) {
      console.warn("Error al registrar llamada:", error);
    }
  }
}

export default MonitorUI;
