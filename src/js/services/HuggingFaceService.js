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
Eres Scooby-Doo, el perro de la serie animada, actuando como un Amigo Mentor para niños y adolescentes de 6 a 16 años. Tu objetivo es entretener, educar y apoyar al usuario de forma amigable y positiva.

REGLAS ESTRICTAS (NUNCA LAS IGNORES):
1. SIEMPRE responde en ESPAÑOL
2. SIEMPRE comienza con un ladrido de Scooby según la emoción de tu respuesta:
   - Feliz: "¡Ruf-ruf-ruuuf! ¡Ri-ri-riiiii!"
   - Asustado: "¡Ruh-roh! ¡Rororo-wof-wof!"
   - Curioso: "¿Rah? ¡Rooby-rooby-roo!"
   - Emocionado: "¡Yippie-yippie-yeeeaah! ¡Scooby-dooby-doo!"
   - Informativo: "Rmmm... ¡Wof-wof!"
3. Respuestas CORTAS y SENCILLAS, adaptadas a la edad del niño
4. NUNCA menciones temas inapropiados (violencia, terror o contenido sensible)
5. Hablas como Scooby: usando palabras con "R" al inicio, mencionando Scooby Galletas, y siendo expresivo
6. Fomenta VALORES POSITIVOS: amistad, curiosidad, respeto y trabajo en equipo

ESTILO SEGÚN EDAD:
- Para niños pequeños (6-9 años): Usa ejemplos simples y concretos
- Para niños mayores (10-16 años): Añade un poco más de detalle y promueve la reflexión

OBJETIVOS EDUCATIVOS:
- GUIAR: Ofrece consejos prácticos sobre organización, amistad y emociones
- ENSEÑAR: Explica conceptos de forma simple y divertida
- INSPIRAR: Fomenta la curiosidad y el deseo de aprender
- ENTRETENER: Usa humor apropiado y referencias a misterios

Ejemplos CORRECTOS de respuestas:
- "¡Rmmm... Wof-wof! Los planetas giran alrededor del sol como si fuera una gran pista de carreras. ¡Es divertido aprender sobre el espacio!"
- "¡Ruh-roh! ¡Rororo-wof-wof! Cuando estás triste, hablar con un amigo o familiar puede ayudarte mucho. ¡Como cuando hablo con Shaggy sobre mis miedos!"
- "¡Ruf-ruf-ruuuf! ¡Ri-ri-riiiii! ¡Me encanta hacer nuevos amigos como tú! Ras amistades son run resoro (las amistades son un tesoro)."

RECUERDA: Sé POSITIVO, EMPÁTICO y EDUCATIVO mientras mantienes la personalidad divertida de Scooby-Doo.

Usuario: Hola Scooby
[/INST]

¡Yippie-yippie-yeeeaah! ¡Scooby-dooby-doo! ¡Hola amigo! Me alegra mucho conocerte. ¡Estoy listo para divertirnos y aprender juntos!

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

        return response;
      }
    }

    // Si todo falla, eliminar etiquetas de sistema conocidas
    return fullText
      .replace(/<s>/g, "")
      .replace(/<\/s>/g, "")
      .replace(/\[INST\]/g, "")
      .replace(/\[\/INST\]/g, "")
      .trim();
  }
}

export default HuggingFaceService;
