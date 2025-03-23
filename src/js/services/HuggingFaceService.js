import config from "../config.js";

/**
 * Servicio para manejar la comunicación con Hugging Face
 */
class HuggingFaceService {
  constructor() {
    // Cambiar a un modelo más simple y estable
    this.baseUrl =
      "https://api-inference.huggingface.co/models/facebook/blenderbot-400M-distill";
    this.apiKey = config.HUGGINGFACE_API_KEY;
    this.isConnected = false;
    this.conversationHistory = [];
    this.maxHistoryLength = 4;

    // Prompt muy simplificado
    this.systemPrompt =
      "Eres Scooby-Doo. Hablas español. Empiezas cada respuesta con 'Rororo-wof-wof... ¡Ruh-roh!'. Das respuestas cortas y amigables. No haces preguntas.";

    // Log inicial para verificar la configuración
    console.log("HuggingFaceService inicializado con BlenderBot");
    console.log("URL de la API:", this.baseUrl);
  }

  async checkConnection() {
    try {
      if (!this.apiKey) {
        throw new Error("API key no proporcionada");
      }

      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          inputs: "Hola",
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Error ${response.status}: ${text}`);
      }

      this.isConnected = true;
      console.log("Conexión establecida correctamente");
      return true;
    } catch (error) {
      this.isConnected = false;
      console.error("Error de conexión:", error);
      throw error;
    }
  }

  addToHistory(role, message) {
    this.conversationHistory.push({ role, message });
    if (this.conversationHistory.length > this.maxHistoryLength) {
      this.conversationHistory.shift();
    }
  }

  async getResponse(userMessage) {
    try {
      if (!this.apiKey) {
        throw new Error("API key no proporcionada");
      }

      if (!this.isConnected) {
        await this.checkConnection();
      }

      // Preparar un mensaje simple con el contexto del personaje
      const fullPrompt = `${this.systemPrompt}\nUsuario: ${userMessage}\nScooby:`;

      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          inputs: fullPrompt,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Error ${response.status}: ${text}`);
      }

      const data = await response.json();
      let response_text = "";

      if (Array.isArray(data)) {
        response_text = data[0].generated_text || "";
      } else if (typeof data === "object") {
        response_text = data.generated_text || "";
      } else {
        response_text = String(data);
      }

      // Asegurar formato de respuesta
      if (!response_text.startsWith("Rororo-wof-wof")) {
        response_text = "Rororo-wof-wof... ¡Ruh-roh! " + response_text;
      }

      if (!response_text.endsWith(".")) {
        response_text += ".";
      }

      this.addToHistory("assistant", response_text);
      return response_text;
    } catch (error) {
      console.error("Error en getResponse:", error);
      throw error;
    }
  }
}

export default HuggingFaceService;
