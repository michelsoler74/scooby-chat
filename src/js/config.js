// Configuración de la aplicación
const config = {
  // La API key se puede proporcionar mediante URL o localStorage
  GEMINI_API_KEY: (function () {
    // Primero, buscar en la URL
    const urlParams = new URLSearchParams(window.location.search);
    const urlKey = urlParams.get("key");
    if (urlKey) {
      localStorage.setItem("GEMINI_API_KEY", urlKey);
      return urlKey;
    }

    // Si no está en la URL, buscar en localStorage
    const storedKey = localStorage.getItem("GEMINI_API_KEY");
    if (storedKey) {
      return storedKey;
    }

    // Si no hay key, mostrar mensaje
    alert(
      "Por favor, proporciona tu API key de Gemini añadiendo ?key=TU_API_KEY al final de la URL"
    );
    return null;
  })(),

  // Otras configuraciones
  MAX_RETRIES: 3,
  SPEECH_LANG: "es-ES",
};

export default config;
