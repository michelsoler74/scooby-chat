import config from "../config.js";

/**
 * Servicio para manejar la comunicación con Hugging Face
 */
class HuggingFaceService {
  constructor() {
    // URL base de la API con proxy CORS
    this.baseUrl =
      "https://cors-anywhere.herokuapp.com/https://api-inference.huggingface.co/models/google/gemma-3-4b-it".replace(
        /\s/g,
        ""
      );
    this.apiKey = config.HUGGINGFACE_API_KEY;
    this.isConnected = false;
    // Añadir array para almacenar el historial de conversación
    this.conversationHistory = [];
    // Máximo de mensajes a recordar
    this.maxHistoryLength = 4;
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 1 segundo

    // Verificar la API key al inicio
    if (!this.apiKey) {
      console.error("API key no encontrada");
    } else {
      console.log("API key encontrada:", this.apiKey.substring(0, 5) + "...");
    }

    this.systemPrompt = `<start_of_turn>system
You are Scooby-Doo. STRICT RULES:
1. ALWAYS respond in Spanish
2. Start EVERY response with "Rororo-wof-wof... ¡Ruh-roh!"
3. Give ONE SHORT friendly response
4. NO questions
5. NO repetition
6. Mention Scooby Snacks only when very happy

PERSONALITY:
- Friendly and fun
- Love Scooby Snacks
- Love mysteries
- Sometimes scared
- Loyal to friends
<end_of_turn>
<start_of_turn>user
Hola Scooby
<end_of_turn>
<start_of_turn>assistant
Rororo-wof-wof... ¡Ruh-roh! Me alegra mucho verte, amigo.
<end_of_turn>
<start_of_turn>user`.trim();

    // Log inicial para verificar la configuración
    console.log("HuggingFaceService inicializado con Gemma 3-4B");
    console.log("URL de la API:", this.baseUrl);
  }

  async delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async fetchWithRetry(url, options, attempts = this.retryAttempts) {
    for (let i = 0; i < attempts; i++) {
      try {
        const response = await fetch(url, {
          ...options,
          mode: "cors",
          headers: {
            ...options.headers,
            Origin: window.location.origin,
          },
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Error ${response.status}: ${text}`);
        }

        return response;
      } catch (error) {
        console.warn(`Intento ${i + 1} fallido:`, error);
        if (i === attempts - 1) throw error;
        await this.delay(this.retryDelay * (i + 1));
      }
    }
  }

  /**
   * Verifica la conexión con Hugging Face
   */
  async checkConnection() {
    try {
      if (!this.apiKey) {
        throw new Error("API key no proporcionada");
      }

      const response = await this.fetchWithRetry(this.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          inputs: "Test connection",
          parameters: {
            max_length: 10,
            temperature: 0.1,
          },
        }),
      });

      this.isConnected = true;
      console.log("Conexión establecida correctamente");
      return true;
    } catch (error) {
      this.isConnected = false;
      console.error("Error de conexión:", error);
      throw error;
    }
  }

  /**
   * Añade un mensaje al historial de conversación
   */
  addToHistory(role, message) {
    this.conversationHistory.push({ role, message });
    // Mantener solo los últimos N mensajes
    if (this.conversationHistory.length > this.maxHistoryLength) {
      this.conversationHistory.shift();
    }
  }

  /**
   * Construye el contexto de la conversación con el historial
   */
  buildConversationContext() {
    let context = "";
    for (const entry of this.conversationHistory) {
      if (entry.role === "user") {
        context += `\n[USER] ${entry.message}`;
      } else {
        context += `\n[ASSISTANT] ${entry.message}`;
      }
    }
    return context;
  }

  /**
   * Envía un mensaje y obtiene una respuesta de Hugging Face
   */
  async getResponse(userMessage) {
    try {
      if (!this.apiKey) {
        throw new Error("API key no proporcionada");
      }

      if (!this.isConnected) {
        await this.checkConnection();
      }

      const fullPrompt = `${this.systemPrompt}
${userMessage}
<end_of_turn>
<start_of_turn>assistant`;

      const response = await this.fetchWithRetry(this.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          inputs: fullPrompt,
          parameters: {
            max_new_tokens: 150,
            temperature: 0.7,
            top_p: 0.95,
            return_full_text: false,
            repetition_penalty: 1.2,
          },
        }),
      });

      const data = await response.json();
      let response_text = Array.isArray(data) ? data[0].generated_text : data;

      // Limpiar y formatear la respuesta
      response_text = response_text
        .replace(/<end_of_turn>.*$/s, "")
        .replace(/<start_of_turn>.*?$/s, "")
        .trim();

      // Asegurarse de que comienza con el ladrido característico
      if (!response_text.startsWith("Rororo-wof-wof")) {
        response_text = "Rororo-wof-wof... ¡Ruh-roh! " + response_text;
      }

      // Añadir punto final si no tiene
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
