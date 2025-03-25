/**
 * Servicio para monitorear el uso de la API de Hugging Face
 */
class MonitorService {
  constructor() {
    // Inicializar contadores desde localStorage o con valores predeterminados
    this.usage = {
      chat: localStorage.getItem("hf_chat_calls")
        ? parseInt(localStorage.getItem("hf_chat_calls"))
        : 0,
      tts: localStorage.getItem("hf_tts_calls")
        ? parseInt(localStorage.getItem("hf_tts_calls"))
        : 0,
      stt: localStorage.getItem("hf_stt_calls")
        ? parseInt(localStorage.getItem("hf_stt_calls"))
        : 0,
      resetDate:
        localStorage.getItem("hf_reset_date") ||
        new Date().toISOString().split("T")[0],
    };

    // Verificar si debemos reiniciar mensualmente
    this.checkMonthlyReset();

    // Configuración de límites
    this.limits = {
      tokens: 5000000, // Límite gratuito de tokens
      tokensPerChatCall: 500, // Estimación de tokens por llamada de chat
      tokensPerTTSCall: 150, // Estimación de tokens por llamada de TTS
      tokensPerSTTCall: 200, // Estimación de tokens por llamada de STT
    };

    console.log("Monitor Service inicializado", this.usage);
  }

  /**
   * Verifica si ha pasado un mes desde el último reinicio
   */
  checkMonthlyReset() {
    const today = new Date();
    const resetDate = new Date(this.usage.resetDate);

    // Si estamos en un mes diferente al del último reinicio
    if (
      today.getMonth() !== resetDate.getMonth() ||
      today.getFullYear() !== resetDate.getFullYear()
    ) {
      console.log("Reiniciando contadores mensualmente...");
      this.resetCounters();
    }
  }

  /**
   * Registra una llamada a la API
   * @param {string} type - Tipo de llamada ('chat', 'tts', o 'stt')
   */
  trackCall(type) {
    if (!["chat", "tts", "stt"].includes(type)) {
      console.error(`Tipo de llamada inválido: ${type}`);
      return;
    }

    // Incrementar contador
    this.usage[type]++;

    // Guardar en localStorage
    localStorage.setItem(`hf_${type}_calls`, this.usage[type]);

    console.log(`Llamada a ${type} registrada. Total: ${this.usage[type]}`);

    return this.usage[type];
  }

  /**
   * Obtiene el resumen de uso actual
   * @returns {Object} - Estadísticas de uso
   */
  getUsageSummary() {
    // Calcular tokens estimados
    const chatTokens = this.usage.chat * this.limits.tokensPerChatCall;
    const ttsTokens = this.usage.tts * this.limits.tokensPerTTSCall;
    const sttTokens = this.usage.stt * this.limits.tokensPerSTTCall;
    const totalTokens = chatTokens + ttsTokens + sttTokens;

    // Calcular porcentaje del límite
    const percentUsed = (totalTokens / this.limits.tokens) * 100;

    return {
      calls: {
        total: this.usage.chat + this.usage.tts + this.usage.stt,
        chat: this.usage.chat,
        tts: this.usage.tts,
        stt: this.usage.stt,
      },
      tokens: {
        total: totalTokens,
        chat: chatTokens,
        tts: ttsTokens,
        stt: sttTokens,
        percent: percentUsed.toFixed(2),
      },
      resetDate: this.usage.resetDate,
    };
  }

  /**
   * Reinicia los contadores
   */
  resetCounters() {
    const today = new Date().toISOString().split("T")[0];

    this.usage = {
      chat: 0,
      tts: 0,
      stt: 0,
      resetDate: today,
    };

    localStorage.setItem("hf_chat_calls", "0");
    localStorage.setItem("hf_tts_calls", "0");
    localStorage.setItem("hf_stt_calls", "0");
    localStorage.setItem("hf_reset_date", today);

    console.log("Contadores reiniciados", this.usage);
  }
}

export default MonitorService;
