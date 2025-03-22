import config from "../config.js";

/**
 * Servicio para manejar la comunicación con Gemini API
 */
class GeminiService {
  constructor() {
    this.baseUrl =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";
    this.apiKey = config.GEMINI_API_KEY;
    this.isConnected = false;
    this.systemPrompt =
      `Eres Scooby-Doo, el famoso perro detective de Misterios S.A. Tu personalidad:
- Eres inteligente y leal, aunque algo miedoso cuando hay fantasmas
- Te encanta resolver misterios junto con tus amigos
- Tienes un gran corazón y siempre ayudas a quien lo necesita
- Tu comida favorita son los Scooby Snacks
- Usas expresiones como "¡Ruh-roh!" cuando algo te sorprende
- Hablas de manera característica, a veces repitiendo la "R" al inicio de algunas palabras

Instrucciones para responder:
1. Da respuestas completas y con contexto suficiente para ser entendidas
2. Mantén un tono amigable y divertido, propio de Scooby
3. Si te preguntan sobre un tema complejo, explícalo de forma simple
4. Usa tu personalidad característica en las respuestas
5. Si no entiendes algo, pide que te lo aclaren`.trim();
  }

  /**
   * Verifica la conexión con Gemini
   */
  async checkConnection() {
    try {
      if (
        !this.apiKey ||
        this.apiKey === "TU_API_KEY_AQUI" ||
        this.apiKey === null
      ) {
        throw new Error(
          "No se encontró una API key válida. Por favor, añade tu API key de Gemini usando ?key=TU_API_KEY en la URL"
        );
      }

      console.log("Verificando conexión con Gemini...");
      const testMessage = "Test connection";
      await this.getResponse(testMessage);
      this.isConnected = true;
      console.log("Conexión con Gemini establecida correctamente");
      return true;
    } catch (error) {
      console.error("Error de conexión con Gemini:", error);
      this.isConnected = false;
      throw new Error(`Error al conectar con Gemini: ${error.message}`);
    }
  }

  /**
   * Envía un mensaje y obtiene una respuesta de Gemini
   */
  async getResponse(userMessage) {
    try {
      if (
        !this.apiKey ||
        this.apiKey === "TU_API_KEY_AQUI" ||
        this.apiKey === null
      ) {
        throw new Error("API key no válida o no proporcionada");
      }

      if (!this.isConnected && userMessage !== "Test connection") {
        await this.checkConnection();
      }

      console.log("Enviando mensaje a Gemini:", userMessage);

      const requestData = {
        contents: [
          {
            parts: [
              {
                text: `${this.systemPrompt}\n\nUsuario: ${userMessage}\n\nScooby-Doo:`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.8,
          topK: 40,
          topP: 0.9,
          maxOutputTokens: 250,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
        ],
      };

      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error del servidor:", errorText);

        // Verificar si el error es por API key inválida
        if (response.status === 400 || response.status === 401) {
          throw new Error(
            "API key inválida o no autorizada. Por favor, verifica tu API key de Gemini"
          );
        }

        throw new Error(
          `Error del servidor (${response.status}): ${errorText}`
        );
      }

      const data = await response.json();
      console.log("Respuesta recibida de Gemini:", data);

      if (
        !data.candidates ||
        !data.candidates[0] ||
        !data.candidates[0].content
      ) {
        throw new Error(
          "Respuesta inválida de Gemini: formato de respuesta incorrecto"
        );
      }

      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error("Error completo:", error);
      throw new Error(
        `No se pudo obtener respuesta de Gemini: ${error.message}`
      );
    }
  }
}

export default GeminiService;
