import config from "../config.js";

/**
 * Servicio para manejar la comunicación con Hugging Face
 */
class HuggingFaceService {
  constructor() {
    // Asegurarnos que usamos el modelo 2b
    this.baseUrl =
      "https://api-inference.huggingface.co/models/BSC-LT/salamandra-2b-instruct";
    this.apiKey = config.HUGGINGFACE_API_KEY;
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
    console.log("HuggingFaceService inicializado");
    console.log("API Key configurada:", this.apiKey ? "Sí" : "No");
    console.log("URL de la API:", this.baseUrl);
  }

  /**
   * Verifica la conexión con Hugging Face
   */
  async checkConnection() {
    try {
      console.log("Iniciando verificación de conexión con Hugging Face...");

      if (!this.apiKey) {
        throw new Error(
          "No se encontró una API key válida. Por favor, añade tu API key de Hugging Face usando ?hf_key=TU_API_KEY en la URL"
        );
      }

      // Verificar formato del API key
      if (!/^hf_[a-zA-Z0-9]+$/.test(this.apiKey)) {
        throw new Error(
          "El formato de la API key no es válido. Debe comenzar con 'hf_' seguido de caracteres alfanuméricos"
        );
      }

      const testMessage = "Test connection";
      console.log("Enviando mensaje de prueba a Hugging Face...");

      const requestData = {
        inputs: testMessage,
        parameters: {
          max_new_tokens: 250,
          temperature: 0.7,
          top_p: 0.95,
          do_sample: true,
          return_full_text: false,
        },
      };

      console.log(
        "Datos de la solicitud:",
        JSON.stringify(requestData, null, 2)
      );

      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestData),
      });

      const responseText = await response.text();
      console.log("Respuesta completa del servidor:", responseText);

      if (!response.ok) {
        let errorMessage = "Error al conectar con Hugging Face: ";
        try {
          const errorData = JSON.parse(responseText);
          if (response.status === 401) {
            errorMessage += "API key no válida o sin permisos suficientes";
          } else if (response.status === 503) {
            errorMessage +=
              "El modelo está cargando, por favor espera unos momentos";
          } else {
            errorMessage += errorData.error || "Error desconocido";
          }
        } catch (e) {
          if (responseText.includes("Failed to fetch")) {
            errorMessage +=
              "No se pudo conectar con el servidor. Verifica tu conexión a internet";
          } else {
            errorMessage += responseText || "Error desconocido";
          }
        }
        throw new Error(errorMessage);
      }

      const data = JSON.parse(responseText);
      console.log("Respuesta de prueba recibida:", data);

      this.isConnected = true;
      console.log("Conexión con Hugging Face establecida correctamente");
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
   * Envía un mensaje y obtiene una respuesta de Hugging Face
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
        inputs: this.systemPrompt + "\n\n" + userMessage,
        parameters: {
          max_new_tokens: 250,
          temperature: 0.7,
          top_p: 0.95,
          do_sample: true,
          return_full_text: false,
        },
      };

      console.log("Enviando solicitud a Hugging Face...");
      console.log(
        "Datos de la solicitud:",
        JSON.stringify(requestData, null, 2)
      );

      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestData),
      });

      const responseText = await response.text();
      console.log("Respuesta completa del servidor:", responseText);

      if (!response.ok) {
        let errorMessage = "Error al procesar el mensaje: ";
        try {
          const errorData = JSON.parse(responseText);
          if (response.status === 401) {
            errorMessage += "API key no válida o sin permisos suficientes";
          } else if (response.status === 503) {
            errorMessage +=
              "El modelo está cargando, por favor espera unos momentos";
          } else {
            errorMessage += errorData.error || "Error desconocido";
          }
        } catch (e) {
          if (responseText.includes("Failed to fetch")) {
            errorMessage +=
              "No se pudo conectar con el servidor. Verifica tu conexión a internet";
          } else {
            errorMessage += responseText || "Error desconocido";
          }
        }
        throw new Error(errorMessage);
      }

      const data = JSON.parse(responseText);
      console.log("Respuesta recibida de Hugging Face:", data);

      // La respuesta de este modelo viene en un formato diferente
      if (Array.isArray(data) && data.length > 0) {
        return data[0].generated_text.replace(this.systemPrompt, "").trim();
      } else if (typeof data === "string") {
        return data.replace(this.systemPrompt, "").trim();
      } else {
        throw new Error(
          "Respuesta inválida de Hugging Face: formato de respuesta incorrecto"
        );
      }
    } catch (error) {
      console.error("Error completo en getResponse:", {
        message: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }
}

export default HuggingFaceService;
