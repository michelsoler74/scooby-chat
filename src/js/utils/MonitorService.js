/**
 * Servicio para monitorear el uso de APIs en la aplicación
 */
class MonitorService {
  constructor() {
    this.initializeCounters();
    this.loadFromLocalStorage();
  }

  /**
   * Inicializa los contadores para las diferentes APIs
   */
  initializeCounters() {
    this.stats = {
      totalCalls: 0,
      chatCalls: 0,
      ttsCalls: 0,
      sttCalls: 0,
      tokenCount: 0,
      lastReset: new Date().toISOString(),
    };
  }

  /**
   * Carga estadísticas previas desde localStorage si existen
   */
  loadFromLocalStorage() {
    try {
      const savedStats = localStorage.getItem("scoobyApiStats");
      if (savedStats) {
        this.stats = JSON.parse(savedStats);
      }
    } catch (error) {
      console.warn("Error al cargar estadísticas previas:", error);
      // Si hay error, mantenemos los contadores inicializados
    }
  }

  /**
   * Guarda las estadísticas actuales en localStorage
   */
  saveToLocalStorage() {
    try {
      localStorage.setItem("scoobyApiStats", JSON.stringify(this.stats));
    } catch (error) {
      console.warn("Error al guardar estadísticas:", error);
    }
  }

  /**
   * Incrementa el contador para un tipo específico de llamada API
   * @param {string} type - Tipo de llamada ('chat', 'tts', 'stt')
   * @param {number} tokenCount - Cantidad de tokens usados (solo para chat)
   */
  incrementCounter(type, tokenCount = 0) {
    // Incrementar contador total
    this.stats.totalCalls++;

    // Incrementar contador específico según el tipo
    switch (type.toLowerCase()) {
      case "chat":
        this.stats.chatCalls++;
        this.stats.tokenCount += tokenCount;
        break;
      case "tts":
        this.stats.ttsCalls++;
        break;
      case "stt":
        this.stats.sttCalls++;
        break;
      default:
        console.warn(`Tipo de llamada no reconocido: ${type}`);
    }

    // Guardar cambios
    this.saveToLocalStorage();
  }

  /**
   * Obtiene las estadísticas actuales
   * @returns {Object} Objeto con las estadísticas
   */
  getStats() {
    return { ...this.stats }; // Devolver copia para evitar modificaciones externas
  }

  /**
   * Reinicia todos los contadores
   */
  resetCounters() {
    this.initializeCounters();
    this.saveToLocalStorage();
  }

  /**
   * Estima el costo aproximado del uso de la API (función placeholder)
   * @returns {number} Costo estimado en dólares
   */
  estimateCost() {
    // Costos aproximados (estos valores deberían ajustarse según los precios reales)
    const chatCostPerToken = 0.00004;
    const ttsCostPerCall = 0.00015;
    const sttCostPerCall = 0.00025;

    return (
      this.stats.tokenCount * chatCostPerToken +
      this.stats.ttsCalls * ttsCostPerCall +
      this.stats.sttCalls * sttCostPerCall
    ).toFixed(4);
  }
}
