import MonitorService from "../services/MonitorService.js";

/**
 * Clase para manejar la interfaz de usuario del monitor
 */
class MonitorUI {
  constructor() {
    // Referencias a elementos DOM
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

    // Inicializar eventos
    this.initEvents();
  }

  /**
   * Inicializa los eventos del monitor
   */
  initEvents() {
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

    // Inicializar con valores actuales
    this.updateStats();
  }

  /**
   * Muestra el panel de monitoreo
   */
  showMonitorPanel() {
    // Actualizar estadísticas antes de mostrar
    this.updateStats();

    // Mostrar el panel
    this.monitorPanel.style.display = "block";
    this.monitorPanel.style.opacity = "1";
  }

  /**
   * Oculta el panel de monitoreo
   */
  hideMonitorPanel() {
    this.monitorPanel.style.opacity = "0";

    // Retraso para la animación
    setTimeout(() => {
      if (this.monitorPanel.style.opacity === "0") {
        this.monitorPanel.style.display = "none";
      }
    }, 300);
  }

  /**
   * Actualiza las estadísticas en el panel
   */
  updateStats() {
    const stats = this.monitorService.getUsageSummary();

    // Actualizar contadores
    this.totalCallsElement.textContent = stats.calls.total.toLocaleString();
    this.chatCallsElement.textContent = stats.calls.chat.toLocaleString();
    this.ttsCallsElement.textContent = stats.calls.tts.toLocaleString();
    this.sttCallsElement.textContent = stats.calls.stt.toLocaleString();

    // Formatear tokens con separadores de miles
    this.tokenEstimateElement.textContent = stats.tokens.total.toLocaleString();

    // Actualizar barras de progreso
    const tokenPercent = parseFloat(stats.tokens.percent);
    this.tokenProgressElement.style.width = `${tokenPercent}%`;

    // Cambiar color según el uso
    if (tokenPercent > 80) {
      this.tokenProgressElement.className = "progress-bar danger";
    } else if (tokenPercent > 50) {
      this.tokenProgressElement.className = "progress-bar warning";
    } else {
      this.tokenProgressElement.className = "progress-bar";
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
   * Registra una llamada a la API
   * @param {string} type - Tipo de llamada ('chat', 'tts', o 'stt')
   */
  trackCall(type) {
    this.monitorService.trackCall(type);
  }

  /**
   * Registra un error en las llamadas a la API
   * @param {string} type - Tipo de error ('chat', 'tts', o 'stt')
   */
  trackError(type) {
    if (this.errors[type] !== undefined) {
      this.errors[type]++;
      console.log(`Error en ${type} registrado. Total: ${this.errors[type]}`);
    }
  }
}

export default MonitorUI;
