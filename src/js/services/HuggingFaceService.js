import config from "../config.js";

/**
 * Servicio para manejar la comunicación con Hugging Face
 */
class HuggingFaceService {
  constructor() {
    // Cambiar a Mixtral, un modelo más potente con mejor soporte para español
    this.baseUrl =
      "https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1";
    this._apiKey = null;
    this.isConnected = false;
    this.conversationHistory = [];
    this.maxHistoryLength = 6;
    this.isMobile = window.innerWidth <= 768 || "ontouchstart" in window;

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
8. SÉ CONSISTENTE en tus respuestas: no cambies información ya proporcionada

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
    console.log(`Tipo de dispositivo: ${this.isMobile ? "móvil" : "desktop"}`);
  }

  // Getter y setter para la API key
  get apiKey() {
    return this._apiKey;
  }

  set apiKey(value) {
    if (!value) {
      console.warn("Se intentó establecer una API key vacía");
      return;
    }
    this._apiKey = value;
    console.log("API key configurada correctamente");
  }

  // Método para verificar si tenemos una API key válida
  hasValidApiKey() {
    return Boolean(this._apiKey);
  }

  async checkConnection() {
    try {
      if (!this.hasValidApiKey()) {
        throw new Error("Se requiere una API key válida para usar el servicio");
      }

      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this._apiKey}`,
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
    if (!message || message.trim().length < 3) return;

    this.conversationHistory.push({ role, message, timestamp: Date.now() });

    const maxHistory = this.isMobile ? 4 : this.maxHistoryLength;

    if (this.conversationHistory.length > maxHistory) {
      this.conversationHistory.shift();
    }

    console.log(
      `Historia actualizada (${this.conversationHistory.length} mensajes)`
    );
  }

  getRecentConversationSummary() {
    if (this.conversationHistory.length === 0) return "";

    const recentMessages = this.conversationHistory.slice(-3);
    return recentMessages
      .map(
        (msg) =>
          `${msg.role === "assistant" ? "Scooby:" : "Usuario:"} ${msg.message}`
      )
      .join("\n");
  }

  async getResponse(userMessage) {
    try {
      if (!this.hasValidApiKey()) {
        throw new Error("Se requiere una API key válida para usar el servicio");
      }

      if (!this.isConnected) {
        await this.checkConnection();
      }

      this.addToHistory("user", userMessage);

      const isContinuation = userMessage.includes(
        "(continúa tu respuesta anterior)"
      );

      let fullPrompt;
      if (isContinuation) {
        const cleanUserMessage = userMessage
          .replace("(continúa tu respuesta anterior)", "")
          .trim();

        const lastMessages = this.conversationHistory.slice(-3);
        const previousContext =
          lastMessages.length > 0
            ? lastMessages
                .map(
                  (msg) =>
                    `${msg.role === "assistant" ? "Scooby: " : "Usuario: "}${
                      msg.message
                    }`
                )
                .join("\n")
            : "";

        fullPrompt = `<s>[INST] 
Eres Scooby-Doo actuando como un Amigo Mentor para niños. Esta es una CONTINUACIÓN DIRECTA de tu respuesta anterior.

CONTEXTO PREVIO:
${previousContext}

IMPORTANTE:
1. NO repitas lo que ya dijiste antes
2. SIGUE EXACTAMENTE desde donde dejaste la explicación anterior
3. Mantén el MISMO TEMA y TONO que estabas usando
4. Recuerda TODAS las reglas de Scooby (ladridos, personalidad, etc.)
5. NO digas frases como "Continuando con lo que decía..." o "Como te estaba explicando..."
6. SÉ COMPLETAMENTE CONSISTENTE con lo que ya has dicho antes
7. DEBES continuar con el MISMO razonamiento y datos, sin cambiar opinión

Usuario: ${cleanUserMessage}
Por favor continúa tu explicación anterior.
[/INST]`;
      } else {
        const conversationContext = this.getRecentConversationSummary();
        const contextSection = conversationContext
          ? `CONTEXTO DE CONVERSACIÓN RECIENTE:
${conversationContext}

`
          : "";

        fullPrompt = `<s>[INST] 
Eres Scooby-Doo, el perro de la serie animada, actuando como un Amigo Mentor para niños.

${contextSection}REGLAS ESTRICTAS:
1. SIEMPRE responde en ESPAÑOL
2. SIEMPRE comienza con un ladrido de Scooby
3. Hablas como Scooby usando palabras con "R" al inicio
4. Respuestas CORTAS y SENCILLAS, para niños
5. SÉ CONSISTENTE con tus respuestas anteriores
6. Sé SIEMPRE Scooby, NUNCA un asistente genérico

Usuario: ${userMessage}
[/INST]`;
      }

      console.log(
        `Enviando prompt (dispositivo: ${this.isMobile ? "móvil" : "desktop"}):`
      );
      console.log(fullPrompt.substring(0, 100) + "...");

      const tokenLimit = this.isMobile ? 200 : 150;
      const baseTokens = isContinuation ? tokenLimit + 50 : tokenLimit;

      const temperature = this.isMobile ? 0.4 : 0.5;

      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this._apiKey}`,
        },
        body: JSON.stringify({
          inputs: fullPrompt,
          parameters: {
            max_new_tokens: baseTokens,
            temperature: temperature,
            top_p: 0.95,
            repetition_penalty: 1.1,
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

      response_text = this.extractResponse(response_text, fullPrompt);
      console.log("Respuesta extraída:", response_text);

      response_text = this.formatScoobyResponse(response_text);

      this.addToHistory("assistant", response_text);

      // Registrar llamada a la API
      if (window.monitorUI) {
        window.monitorUI.trackCall("chat");
      }

      return response_text;
    } catch (error) {
      console.error("Error en getResponse:", error);
      throw error;
    }
  }

  formatScoobyResponse(text) {
    if (!this.hasScoobyBark(text)) {
      text = "¡Ruh-roh! ¡Rororo-wof-wof! " + text;
    }

    if (!text.endsWith(".") && !text.endsWith("!") && !text.endsWith("?")) {
      text += ".";
    }

    text = text.replace(/\s+/g, " ").trim();

    if (this.isMobile && text.length > 800) {
      const lastPeriod = Math.max(
        text.lastIndexOf(". ", 700),
        text.lastIndexOf("! ", 700),
        text.lastIndexOf("? ", 700)
      );

      if (lastPeriod > 300) {
        text = text.substring(0, lastPeriod + 1);
      }
    }

    return text;
  }

  hasScoobyBark(text) {
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

    const lowerText = text.toLowerCase();
    return barks.some((bark) => lowerText.includes(bark));
  }

  extractResponse(fullText, prompt) {
    if (fullText.includes(prompt)) {
      let afterPrompt = fullText
        .substring(fullText.indexOf(prompt) + prompt.length)
        .trim();

      if (afterPrompt.includes("[INST]")) {
        afterPrompt = afterPrompt
          .substring(0, afterPrompt.indexOf("[INST]"))
          .trim();
      }

      afterPrompt = afterPrompt.replace(/<\/s>/g, "").trim();

      afterPrompt = this.cleanMetaInstructions(afterPrompt);

      return afterPrompt;
    }

    if (fullText.includes("[/INST]")) {
      let parts = fullText.split("[/INST]");
      if (parts.length > 1) {
        let response = parts[parts.length - 1].trim();

        if (response.includes("[INST]")) {
          response = response.substring(0, response.indexOf("[INST]")).trim();
        }

        response = response.replace(/<\/s>/g, "").trim();

        response = this.cleanMetaInstructions(response);

        return response;
      }
    }

    fullText = fullText
      .replace(/<s>/g, "")
      .replace(/<\/s>/g, "")
      .replace(/\[INST\]/g, "")
      .replace(/\[\/INST\]/g, "")
      .trim();

    return this.cleanMetaInstructions(fullText);
  }

  cleanMetaInstructions(text) {
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
      /\bcontinuando con lo que decía\b/gi,
      /\bcomo te estaba explicando\b/gi,
      /\bcomo mencioné anteriormente\b/gi,
    ];

    let cleanText = text;
    metaPatterns.forEach((pattern) => {
      cleanText = cleanText.replace(pattern, "");
    });

    cleanText = cleanText.replace(/\s+/g, " ").trim();

    return cleanText;
  }
}

export default HuggingFaceService;
