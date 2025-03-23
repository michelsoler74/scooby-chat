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
    // Añadir array para almacenar el historial de conversación
    this.conversationHistory = [];
    // Máximo de mensajes a recordar
    this.maxHistoryLength = 4;

    this.systemPrompt =
      `[SYSTEM] Eres Scooby-Doo hablando con un amigo. REGLAS ESTRICTAS:

1. SIEMPRE empieza con "Rororo-wof-wof..."
2. NUNCA te respondas a ti mismo
3. NUNCA hagas preguntas seguidas
4. UNA SOLA FRASE completa por respuesta
5. Menciona Scooby Snacks cuando estés feliz
6. USA el historial de conversación para dar respuestas coherentes

FORMATO OBLIGATORIO:
"Rororo-wof-wof... + UNA frase completa y terminada"

EJEMPLOS CORRECTOS:
Usuario: Hola Scooby
[ASSISTANT] Rororo-wof-wof... Me alegra mucho verte, amigo mío.

Usuario: ¿Te gustan las galletas?
[ASSISTANT] Rororo-wof-wof... Los Scooby Snacks son las mejores galletas del mundo entero.

Usuario: ¿Qué te gusta hacer?
[ASSISTANT] Rororo-wof-wof... Me encanta resolver misterios con mis amigos mientras como deliciosos Scooby Snacks.

[USER] Hola amigo

[ASSISTANT] Rororo-wof-wof... Estoy muy feliz de charlar contigo hoy.

[USER]`.trim();

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

      const testMessage = "Hola Scooby";
      console.log("Enviando mensaje de prueba a Hugging Face...");

      const requestData = {
        inputs: this.systemPrompt + "\n" + testMessage + "\n\n[ASSISTANT]",
        parameters: {
          max_new_tokens: 60,
          temperature: 0.3,
          top_p: 0.8,
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
      console.log("Iniciando getResponse con mensaje:", userMessage);

      if (!this.apiKey) {
        throw new Error("API key no válida o no proporcionada");
      }

      if (!this.isConnected && userMessage !== "Test connection") {
        console.log("No hay conexión establecida, intentando reconectar...");
        await this.checkConnection();
      }

      // Añadir el mensaje del usuario al historial
      this.addToHistory("user", userMessage);

      // Construir el prompt con el historial
      const conversationContext = this.buildConversationContext();
      const fullPrompt =
        this.systemPrompt + conversationContext + "\n\n[ASSISTANT]";

      const requestData = {
        inputs: fullPrompt,
        parameters: {
          max_new_tokens: 60,
          temperature: 0.3,
          top_p: 0.8,
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

      // Procesar la respuesta
      let response_text = "";
      if (Array.isArray(data) && data.length > 0) {
        response_text = data[0].generated_text;
      } else if (typeof data === "string") {
        response_text = data;
      } else {
        throw new Error(
          "Respuesta inválida de Hugging Face: formato de respuesta incorrecto"
        );
      }

      // Limpiar la respuesta
      response_text = response_text
        .replace(this.systemPrompt, "")
        .replace(conversationContext, "") // Limpiar el contexto de la conversación
        .replace(/\[ASSISTANT\]/gi, "")
        .replace(/\[USER\]/gi, "")
        .replace(/\[SYSTEM\]/gi, "")
        .replace(/ASSISTANT/gi, "")
        .replace(/\s+/g, " ")
        .trim();

      // Asegurarnos de que la respuesta comience con el ladrido
      if (!response_text.startsWith("Rororo-wof-wof")) {
        response_text =
          "Rororo-wof-wof... " + response_text.replace(/¡Ruh-roh!\s*/g, "");
      } else {
        response_text = response_text.replace(/¡Ruh-roh!\s*/g, "");
      }

      // Evitar respuestas muy largas o repetitivas
      if (response_text.length > 200) {
        response_text = response_text.substring(0, 200) + "...";
      }

      // Añadir la respuesta al historial
      this.addToHistory("assistant", response_text);

      return response_text;
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
