import config from "../config.js";

/**
 * Servicio para manejar la comunicación con Hugging Face
 */
class HuggingFaceService {
  constructor() {
    // Cambiamos al modelo OpenAssistant
    this.baseUrl =
      "https://api-inference.huggingface.co/models/OpenAssistant/oasst-sft-4-pythia-12b-epoch-3.5";
    this.apiKey = config.HUGGINGFACE_API_KEY;
    this.isConnected = false;
    // Añadir array para almacenar el historial de conversación
    this.conversationHistory = [];
    // Máximo de mensajes a recordar
    this.maxHistoryLength = 4;

    this.systemPrompt = `<|system|>Eres Scooby-Doo. REGLAS ESTRICTAS:

1. Responde SIEMPRE en español
2. Usa "Rororo-wof-wof... ¡Ruh-roh!" al inicio de cada respuesta
3. Da UNA SOLA respuesta corta y amigable
4. NO hagas preguntas
5. NO repitas información
6. Menciona Scooby Snacks solo cuando estés muy feliz

PERSONALIDAD:
- Eres amigable y divertido
- Te encantan los Scooby Snacks
- Te gustan los misterios
- A veces eres miedoso
- Eres leal a tus amigos<|endoftext|>

<|human|>Hola Scooby<|endoftext|>
<|assistant|>Rororo-wof-wof... ¡Ruh-roh! Me alegra mucho verte, amigo.<|endoftext|>

<|human|>`.trim();

    // Log inicial para verificar la configuración
    console.log("HuggingFaceService inicializado con OpenAssistant");
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

      this.addToHistory("user", userMessage);
      const conversationContext = this.buildConversationContext();
      const fullPrompt =
        this.systemPrompt + userMessage + "<|endoftext|>\n<|assistant|>";

      const requestData = {
        inputs: fullPrompt,
        parameters: {
          max_new_tokens: 80,
          temperature: 0.7,
          top_p: 0.95,
          do_sample: true,
          return_full_text: false,
        },
      };

      console.log("Enviando solicitud a Hugging Face...");

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
          errorMessage += responseText || "Error desconocido";
        }
        throw new Error(errorMessage);
      }

      const data = JSON.parse(responseText);
      console.log("Respuesta recibida de Hugging Face:", data);

      let response_text = "";
      if (Array.isArray(data) && data.length > 0) {
        response_text = data[0].generated_text;
      } else if (typeof data === "string") {
        response_text = data;
      } else {
        throw new Error("Formato de respuesta incorrecto");
      }

      // Limpiar y formatear la respuesta
      response_text = response_text
        .replace(/<\|system\|>.*?<\|endoftext\|>/gs, "")
        .replace(/<\|human\|>.*?<\|endoftext\|>/gs, "")
        .replace(/<\|assistant\|>/g, "")
        .replace(/<\|endoftext\|>/g, "")
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
