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

    // Log inicial para verificar la configuración
    console.log("GeminiService inicializado");
    console.log("API Key configurada:", this.apiKey ? "Sí" : "No");
    console.log("URL de la API:", this.baseUrl);
  }

  /**
   * Verifica la conexión con Gemini
   */
  async checkConnection() {
    try {
      console.log("Iniciando verificación de conexión con Gemini...");

      if (!this.apiKey) {
        throw new Error(
          "No se encontró una API key válida. Por favor, añade tu API key de Gemini usando ?key=TU_API_KEY en la URL"
        );
      }

      const testMessage = "Test connection";
      console.log("Enviando mensaje de prueba a Gemini...");

      const requestData = {
        contents: [
          {
            parts: [{ text: testMessage }],
          },
        ],
        generationConfig: config.GEMINI_CONFIG,
      };

      console.log(
        "URL completa:",
        `${this.baseUrl}?key=${this.apiKey.slice(0, 4)}...${this.apiKey.slice(
          -4
        )}`
      );
      console.log(
        "Datos de la solicitud:",
        JSON.stringify(requestData, null, 2)
      );

      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      const responseText = await response.text();
      console.log("Respuesta completa del servidor:", responseText);

      if (!response.ok) {
        const errorData = JSON.parse(responseText);
        console.error("Error en la respuesta del servidor:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });

        let errorMessage = "Error desconocido al conectar con Gemini";
        if (errorData.error) {
          errorMessage = `Error: ${
            errorData.error.message || errorData.error.status
          }`;
          if (errorData.error.details) {
            errorMessage += `\nDetalles: ${JSON.stringify(
              errorData.error.details
            )}`;
          }
        }

        throw new Error(errorMessage);
      }

      const data = JSON.parse(responseText);
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

      if (!this.apiKey) {
        throw new Error("API key no válida o no proporcionada");
      }

      if (!this.isConnected && userMessage !== "Test connection") {
        console.log("No hay conexión establecida, intentando reconectar...");
        await this.checkConnection();
      }

      const requestData = {
        contents: [
          {
            parts: [{ text: this.systemPrompt + "\n\n" + userMessage }],
          },
        ],
        generationConfig: config.GEMINI_CONFIG,
      };

      console.log("Enviando solicitud a Gemini...");
      console.log(
        "URL completa:",
        `${this.baseUrl}?key=${this.apiKey.slice(0, 4)}...${this.apiKey.slice(
          -4
        )}`
      );
      console.log(
        "Datos de la solicitud:",
        JSON.stringify(requestData, null, 2)
      );

      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      const responseText = await response.text();
      console.log("Respuesta completa del servidor:", responseText);

      if (!response.ok) {
        const errorData = JSON.parse(responseText);
        console.error("Error en la respuesta del servidor:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });

        let errorMessage = "Error desconocido al procesar el mensaje";
        if (errorData.error) {
          errorMessage = `Error: ${
            errorData.error.message || errorData.error.status
          }`;
          if (errorData.error.details) {
            errorMessage += `\nDetalles: ${JSON.stringify(
              errorData.error.details
            )}`;
          }
        }

        throw new Error(errorMessage);
      }

      const data = JSON.parse(responseText);
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
