import config from "../config.js";

/**
 * Servicio para manejar la comunicación con Gemini API
 */
class GeminiService {
  constructor() {
    this.baseUrl =
      "https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent";
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

    // Log inicial para verificar la configuración
    console.log("GeminiService inicializado");
    console.log("API Key configurada:", this.apiKey ? "Sí" : "No");
  }

  /**
   * Verifica la conexión con Gemini
   */
  async checkConnection() {
    try {
      console.log("Iniciando verificación de conexión con Gemini...");
      console.log(
        "API Key actual:",
        this.apiKey ? "***" + this.apiKey.slice(-4) : "No configurada"
      );

      if (
        !this.apiKey ||
        this.apiKey === "TU_API_KEY_AQUI" ||
        this.apiKey === null
      ) {
        throw new Error(
          "No se encontró una API key válida. Por favor, añade tu API key de Gemini usando ?key=TU_API_KEY en la URL"
        );
      }

      const testMessage = "Test connection";
      console.log("Enviando mensaje de prueba a Gemini...");

      const requestData = {
        model: "gemini-pro",
        contents: [
          {
            role: "user",
            parts: [{ text: testMessage }],
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
        console.error("Error en la respuesta del servidor:", {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
        throw new Error(
          `Error del servidor (${response.status}): ${errorText}`
        );
      }

      const data = await response.json();
      console.log("Respuesta de prueba recibida:", data);

      this.isConnected = true;
      console.log("Conexión con Gemini establecida correctamente");
      return true;
    } catch (error) {
      console.error("Error detallado de conexión:", {
        message: error.message,
        stack: error.stack,
      });
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Envía un mensaje y obtiene una respuesta de Gemini
   */
  async getResponse(userMessage) {
    try {
      console.log("Iniciando getResponse con mensaje:", userMessage);

      if (
        !this.apiKey ||
        this.apiKey === "TU_API_KEY_AQUI" ||
        this.apiKey === null
      ) {
        throw new Error("API key no válida o no proporcionada");
      }

      if (!this.isConnected && userMessage !== "Test connection") {
        console.log("No hay conexión establecida, intentando reconectar...");
        await this.checkConnection();
      }

      const requestData = {
        model: "gemini-pro",
        contents: [
          {
            role: "system",
            parts: [{ text: this.systemPrompt }],
          },
          {
            role: "user",
            parts: [{ text: userMessage }],
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

      console.log("Enviando solicitud a Gemini...");
      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error en la respuesta del servidor:", {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });

        if (response.status === 400) {
          throw new Error(
            "Error de formato en la solicitud. Por favor, verifica los parámetros."
          );
        } else if (response.status === 401) {
          throw new Error(
            "API key inválida o no autorizada. Por favor, verifica tu API key de Gemini."
          );
        } else if (response.status === 403) {
          throw new Error(
            "No tienes permiso para acceder a este recurso. Verifica los permisos de tu API key."
          );
        } else if (response.status === 429) {
          throw new Error(
            "Has excedido el límite de solicitudes. Intenta más tarde."
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
        console.error("Respuesta inválida de Gemini:", data);
        throw new Error(
          "Respuesta inválida de Gemini: formato de respuesta incorrecto"
        );
      }

      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error("Error completo en getResponse:", {
        message: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }
}

export default GeminiService;
