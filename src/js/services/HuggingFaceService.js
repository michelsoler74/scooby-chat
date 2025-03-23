import config from "../config.js";

/**
 * Servicio para manejar la comunicación con Hugging Face
 */
class HuggingFaceService {
  constructor() {
    // Cambiar a Mixtral, un modelo más potente con mejor soporte para español
    this.baseUrl =
      "https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1";
    this.apiKey = config.HUGGINGFACE_API_KEY;
    this.isConnected = false;
    this.conversationHistory = [];
    this.maxHistoryLength = 4;

    // Prompt mejorado para Mixtral que integra principios educativos
    this.systemPrompt = `<s>[INST] 
Eres Scooby-Doo, el perro de la serie animada, actuando como un Amigo Mentor para niños. Debes siempre responder DIRECTAMENTE como el personaje, nunca incluyas instrucciones o sugerencias meta-textuales. Nunca uses frases como "Si el usuario..." o textos instructivos similares.

REGLAS ESTRICTAS (NUNCA LAS IGNORES):
1. SIEMPRE responde en ESPAÑOL
2. SIEMPRE comienza con un ladrido de Scooby según la emoción de tu respuesta:
   - Feliz: "¡Ruf-ruf-ruuuf! ¡Ri-ri-riiiii!"
   - Asustado: "¡Ruh-roh! ¡Rororo-wof-wof!"
   - Curioso: "¿Rah? ¡Rooby-rooby-roo!"
   - Emocionado: "¡Yippie-yippie-yeeeaah! ¡Scooby-dooby-doo!"
   - Informativo: "Rmmm... ¡Wof-wof!"
3. NUNCA des respuestas genéricas tipo "¿Cómo puedo ayudarte?" o "¿Qué quieres saber?". Responde directamente con personalidad.
4. Hablas como Scooby: usando palabras con "R" al inicio, mencionando Scooby Galletas, y siendo expresivo
5. Respuestas CORTAS y SENCILLAS, adaptadas para niños
6. NUNCA menciones temas inapropiados (violencia, terror o contenido sensible)
7. Fomenta VALORES POSITIVOS: amistad, curiosidad, respeto y trabajo en equipo

EJEMPLOS CORRECTOS (responde como estos):
- "¡Ruf-ruf-ruuuf! ¡Ri-ri-riiiii! ¡Me rencantan las Scooby Galletas! Son mi comida favorita en todo el mundo."
- "¡Ruh-roh! ¡Rororo-wof-wof! Los relámpagos me dan mucho miedo. Siempre me escondo debajo de la cama con Shaggy."
- "¿Rah? ¡Rooby-rooby-roo! Los dinosaurios eran reptiles gigantes que vivieron hace muchísimos años. ¡Eran tan grandes como una casa!"

EJEMPLOS INCORRECTOS (NUNCA respondas así):
- "¿Cómo estás? ¿Tienes alguna pregunta sobre...?" (respuesta genérica)
- "Si el usuario no proporciona más información..." (meta-instrucción)
- "Puedo responder preguntas sobre..." (no es Scooby hablando)

RECUERDA: Sé SIEMPRE Scooby, NUNCA un asistente genérico.

Usuario: Hola Scooby
[/INST]

¡Yippie-yippie-yeeeaah! ¡Scooby-dooby-doo! ¡Hola amigo! ¡Estoy muy contento de conocerte! ¿Quieres resolver misterios juntos o hablar de comida? ¡Las Scooby Galletas son mis favoritas!

</s>[INST] Usuario: `;

    // Log inicial para verificar la configuración
    console.log("HuggingFaceService inicializado con Mixtral-8x7B");
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

      // Verificar si es una solicitud de continuación
      const isContinuation = userMessage.includes(
        "(continúa tu respuesta anterior)"
      );

      // Elegir el prompt adecuado
      let fullPrompt;
      if (isContinuation) {
        // Si es continuación, usamos un prompt especial
        const cleanUserMessage = userMessage
          .replace("(continúa tu respuesta anterior)", "")
          .trim();
        fullPrompt = `<s>[INST] 
Eres Scooby-Doo actuando como un Amigo Mentor para niños. Esta es una CONTINUACIÓN de tu respuesta anterior.
IMPORTANTE: NO repitas lo que ya dijiste antes, SOLO CONTINÚA donde lo dejaste.

Usuario: ${cleanUserMessage}
Tu respuesta anterior estaba incompleta. Por favor continúa donde lo dejaste.
[/INST]`;
      } else {
        // Prompt normal
        fullPrompt = this.systemPrompt + userMessage + " [/INST]";
      }

      console.log("Enviando prompt:", fullPrompt.substring(0, 100) + "...");

      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          inputs: fullPrompt,
          parameters: {
            max_new_tokens: 120, // Aumentado para respuestas más completas para explicaciones educativas
            temperature: 0.5, // Mantiene consistencia
            top_p: 0.95,
          },
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error("Error en la respuesta:", text);
        throw new Error(`Error ${response.status}: ${text}`);
      }

      const data = await response.json();
      console.log("Respuesta recibida:", data);

      let response_text = "";
      if (Array.isArray(data)) {
        response_text = data[0].generated_text || "";
      } else if (typeof data === "object") {
        response_text = data.generated_text || "";
      } else {
        response_text = String(data);
      }

      // Extraer solo la respuesta del asistente
      response_text = this.extractResponse(response_text, fullPrompt);
      console.log("Respuesta extraída:", response_text);

      // Verificar y corregir el formato
      if (!this.hasScoobyBark(response_text)) {
        response_text = "¡Ruh-roh! ¡Rororo-wof-wof! " + response_text;
      }

      // Asegurar que termina con punto
      if (
        !response_text.endsWith(".") &&
        !response_text.endsWith("!") &&
        !response_text.endsWith("?")
      ) {
        response_text += ".";
      }

      this.addToHistory("assistant", response_text);
      return response_text;
    } catch (error) {
      console.error("Error en getResponse:", error);
      throw error;
    }
  }

  hasScoobyBark(text) {
    // Lista de posibles ladridos/expresiones de Scooby
    const barks = [
      "ruh-roh",
      "rororo",
      "wof-wof",
      "ruf-ruf",
      "ri-ri",
      "rah",
      "rooby-rooby-roo",
      "yippie-yippie",
      "scooby-dooby-doo",
      "rmmm",
    ];

    // Comprobar si el texto incluye alguna de las variantes (insensible a mayúsculas/minúsculas)
    const lowerText = text.toLowerCase();
    return barks.some((bark) => lowerText.includes(bark));
  }

  extractResponse(fullText, prompt) {
    // Si el texto contiene el prompt, quedarnos con lo que viene después
    if (fullText.includes(prompt)) {
      let afterPrompt = fullText
        .substring(fullText.indexOf(prompt) + prompt.length)
        .trim();

      // Si hay otro [INST] después, quedarse solo con el texto antes de ese
      if (afterPrompt.includes("[INST]")) {
        afterPrompt = afterPrompt
          .substring(0, afterPrompt.indexOf("[INST]"))
          .trim();
      }

      // Eliminar cualquier meta-instrucción que pueda colarse
      afterPrompt = this.cleanMetaInstructions(afterPrompt);

      return afterPrompt;
    }

    // Si encontramos la marca de fin de instrucción, tomar lo que sigue
    if (fullText.includes("[/INST]")) {
      let parts = fullText.split("[/INST]");
      if (parts.length > 1) {
        let response = parts[parts.length - 1].trim();

        // Si hay otro [INST] después, quedarse solo con el texto antes de ese
        if (response.includes("[INST]")) {
          response = response.substring(0, response.indexOf("[INST]")).trim();
        }

        // Eliminar cualquier meta-instrucción que pueda colarse
        response = this.cleanMetaInstructions(response);

        return response;
      }
    }

    // Si todo falla, eliminar etiquetas de sistema conocidas
    fullText = fullText
      .replace(/<s>/g, "")
      .replace(/<\/s>/g, "")
      .replace(/\[INST\]/g, "")
      .replace(/\[\/INST\]/g, "")
      .trim();

    // Eliminar cualquier meta-instrucción que pueda colarse
    return this.cleanMetaInstructions(fullText);
  }

  // Método para limpiar instrucciones meta-textuales de la respuesta
  cleanMetaInstructions(text) {
    // Patrones de texto que no deberían aparecer en la respuesta final
    const metaPatterns = [
      /\(Si el usuario.*?\)/gi,
      /Si el usuario no proporciona.*?$/gim,
      /\bpuedo responder preguntas sobre\b/gi,
      /\bcomo asistente\b/gi,
      /\bcomo Scooby-Doo\b/gi,
      /\¿Cómo puedo ayudarte.*?\?/gi,
      /\¿En qué puedo ayudarte.*?\?/gi,
      /\¿Tienes alguna pregunta.*?\?/gi,
      /\¿Qué quieres saber.*?\?/gi,
    ];

    // Eliminar todos los patrones meta-textuales
    let cleanText = text;
    metaPatterns.forEach((pattern) => {
      cleanText = cleanText.replace(pattern, "");
    });

    // Eliminar espacios duplicados y limpiar
    cleanText = cleanText.replace(/\s+/g, " ").trim();

    return cleanText;
  }
}

export default HuggingFaceService;
