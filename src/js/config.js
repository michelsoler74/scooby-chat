// Configuración de la aplicación
const config = {
  // La API key de Hugging Face se puede proporcionar mediante URL o localStorage
  HUGGINGFACE_API_KEY: (function () {
    // Función para validar una API key de Hugging Face
    const validateApiKey = (key) => {
      if (!key || typeof key !== "string" || key.trim().length < 5) {
        return null;
      }
      return key.trim();
    };

    // Buscar primero en localStorage
    const storedKey = validateApiKey(
      localStorage.getItem("HUGGINGFACE_API_KEY")
    );
    if (storedKey) {
      console.log("API key de Hugging Face encontrada en localStorage");
      return storedKey;
    }

    // Si no está en localStorage, buscar en URL
    const urlParams = new URLSearchParams(window.location.search);
    const urlKey = validateApiKey(urlParams.get("key"));
    if (urlKey) {
      console.log("API key de Hugging Face encontrada en URL");
      localStorage.setItem("HUGGINGFACE_API_KEY", urlKey);
      return urlKey;
    }

    console.warn("No se encontró una API key de Hugging Face válida");
    return null;
  })(),

  // Configuraciones generales
  MAX_RETRIES: 3,
  SPEECH_LANG: "es-ES",

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
