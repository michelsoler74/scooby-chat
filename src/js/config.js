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
    console.warn("No se encontró una API key válida para Gemini");
    return null;
  })(),

  // La API key de Hugging Face se puede proporcionar mediante URL o localStorage
  HUGGINGFACE_API_KEY: (function () {
    // Función para validar una API key de Hugging Face (menos estricta)
    const validateApiKey = (key) => {
      if (!key || typeof key !== "string" || key.trim().length < 5) {
        return null;
      }
      return key.trim();
    };

    // Buscar en todos los parámetros posibles y en localStorage
    const urlParams = new URLSearchParams(window.location.search);

    // Opciones de parámetros (para mayor flexibilidad)
    const paramOptions = [
      "hf_key",
      "hfkey",
      "huggingface_key",
      "huggingfacekey",
      "key",
    ];

    // Buscar en URL con diferentes nombres de parámetro
    for (const param of paramOptions) {
      const urlKey = validateApiKey(urlParams.get(param));
      if (urlKey) {
        console.log(
          `API key de Hugging Face encontrada en parámetro URL: ${param}`
        );
        localStorage.setItem("HUGGINGFACE_API_KEY", urlKey);
        return urlKey;
      }
    }

    // Buscar en localStorage con diferentes nombres posibles
    const storageOptions = ["HUGGINGFACE_API_KEY", "HF_API_KEY", "HF_KEY"];
    for (const key of storageOptions) {
      const storedKey = validateApiKey(localStorage.getItem(key));
      if (storedKey) {
        console.log(
          `API key de Hugging Face encontrada en localStorage: ${key}`
        );
        // Normalizar el almacenamiento
        localStorage.setItem("HUGGINGFACE_API_KEY", storedKey);
        return storedKey;
      }
    }

    // Si no se encontró la key, buscar en la URL completa (para casos donde se pasa en el fragmento)
    const urlSearch = window.location.search + window.location.hash;
    if (urlSearch.includes("key=")) {
      const keyMatch = urlSearch.match(/key=([^&]+)/);
      if (keyMatch && keyMatch[1]) {
        const potentialKey = validateApiKey(keyMatch[1]);
        if (potentialKey) {
          console.log("API key encontrada en fragmento URL");
          localStorage.setItem("HUGGINGFACE_API_KEY", potentialKey);
          return potentialKey;
        }
      }
    }

    // Si llegamos aquí, no se encontró key válida
    console.warn("No se encontró una API key de Hugging Face válida");
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
