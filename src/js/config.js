// Configuración de la aplicación
const config = {
  // La API key de Gemini se puede proporcionar mediante URL o localStorage
  GEMINI_API_KEY: (function () {
    const validateApiKey = (key) => {
      // Verificar que la key tenga el formato correcto (39 caracteres, alfanuméricos)
      if (!key || typeof key !== "string" || !/^[A-Za-z0-9-_]{39}$/.test(key)) {
        return null;
      }
      return key;
    };

    // Primero, buscar en la URL
    const urlParams = new URLSearchParams(window.location.search);
    const urlKey = validateApiKey(urlParams.get("key"));
    if (urlKey) {
      localStorage.setItem("GEMINI_API_KEY", urlKey);
      return urlKey;
    }

    // Si no está en la URL, buscar en localStorage
    const storedKey = validateApiKey(localStorage.getItem("GEMINI_API_KEY"));
    if (storedKey) {
      return storedKey;
    }

    // Si no hay key válida, mostrar mensaje
    console.warn("No se encontró una API key válida");
    alert(
      "Por favor, proporciona una API key válida de Gemini añadiendo ?key=TU_API_KEY al final de la URL.\n" +
        "La API key debe tener 39 caracteres y contener solo letras, números, guiones y guiones bajos."
    );
    return null;
  })(),

  // La API key de Hugging Face se puede proporcionar mediante URL o localStorage
  HUGGINGFACE_API_KEY: (function () {
    const validateApiKey = (key) => {
      if (!key || typeof key !== "string") {
        return null;
      }
      return key;
    };

    const urlParams = new URLSearchParams(window.location.search);
    const urlKey = validateApiKey(urlParams.get("hf_key"));
    if (urlKey) {
      localStorage.setItem("HUGGINGFACE_API_KEY", urlKey);
      return urlKey;
    }

    const storedKey = validateApiKey(
      localStorage.getItem("HUGGINGFACE_API_KEY")
    );
    if (storedKey) {
      return storedKey;
    }

    console.warn("No se encontró una API key de Hugging Face válida");
    alert(
      "Por favor, proporciona una API key válida de Hugging Face añadiendo ?hf_key=TU_API_KEY al final de la URL."
    );
    return null;
  })(),

  // Otras configuraciones
  MAX_RETRIES: 3,
  SPEECH_LANG: "es-ES",

  // Configuración de la API de Gemini
  GEMINI_CONFIG: {
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 1024,
  },

  // Configuración de la API de Hugging Face
  HUGGINGFACE_CONFIG: {
    temperature: 0.7,
    top_p: 0.95,
    max_new_tokens: 1024,
    do_sample: true,
    return_full_text: false,
  },
};

export default config;
