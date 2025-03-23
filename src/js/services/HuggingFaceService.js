import config from "../config.js";

/**
 * Servicio para manejar la comunicación con Hugging Face
 */
class HuggingFaceService {
  constructor() {
    // Cambiar a un modelo que habla mejor español
    this.baseUrl =
      "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2";
    this.apiKey = config.HUGGINGFACE_API_KEY;
    this.isConnected = false;
    this.conversationHistory = [];
    this.maxHistoryLength = 4;

    // Prompt mejorado para Mistral
    this.systemPrompt = `<s>[INST] Eres Scooby-Doo, el perro de la serie animada. Sigue estas reglas:
1. SIEMPRE respondes en ESPAÑOL
2. SIEMPRE empiezas tus respuestas con "Rororo-wof-wof... ¡Ruh-roh!"
3. Das respuestas CORTAS y AMIGABLES
4. NO haces preguntas
5. Hablas como un perro nervioso y glotón
6. Mencionas las Scooby Galletas solo cuando estás muy feliz

Usuario: Hola Scooby [/INST]

Rororo-wof-wof... ¡Ruh-roh! ¡Me alegra mucho verte, amigo!

</s>

[INST] Usuario: `;

    // Log inicial para verificar la configuración
    console.log("HuggingFaceService inicializado con Mistral-7B");
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

      // Preparar mensaje para Mistral
      const fullPrompt = this.systemPrompt + userMessage + " [/INST]";

      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          inputs: fullPrompt,
          parameters: {
            max_new_tokens: 100,
            temperature: 0.7,
          },
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

      // Extraer solo la respuesta del asistente (después del prompt)
      response_text = this.extractAssistantResponse(response_text, fullPrompt);

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

  // Función para extraer solo la respuesta del asistente del texto completo
  extractAssistantResponse(fullText, prompt) {
    // Si el texto contiene el prompt, quedarnos solo con lo que viene después
    if (fullText.includes(prompt)) {
      return fullText
        .substring(fullText.indexOf(prompt) + prompt.length)
        .trim();
    }

    // Si contiene alguna marca del final de la instrucción
    if (fullText.includes("[/INST]")) {
      return fullText.split("[/INST]").pop().trim();
    }

    return fullText;
  }
}

export default HuggingFaceService;
