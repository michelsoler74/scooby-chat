let isStopped = false;
let recognition;
let speaking = false;
let audio = new Audio(); // Define audio globalmente y crea una instancia

// Verificar la compatibilidad de SpeechRecognition y el navegador
window.addEventListener("DOMContentLoaded", async function () {
  console.log("Verificando compatibilidad del navegador...");
  console.log("User Agent:", navigator.userAgent);

  // Verificar SpeechRecognition
  const speechRecoDisponible = !!(
    window.SpeechRecognition || window.webkitSpeechRecognition
  );
  console.log("SpeechRecognition disponible:", speechRecoDisponible);

  if (!speechRecoDisponible) {
    mostrarErrorMicrofono(
      "Tu navegador no soporta reconocimiento de voz. Por favor, usa Chrome o Edge."
    );
    return;
  }

  // Verificar acceso al micrófono
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    console.log("Micrófono detectado y funcionando");
    stream.getTracks().forEach((track) => track.stop());

    // Enumerar dispositivos de audio
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioDevices = devices.filter(
      (device) => device.kind === "audioinput"
    );
    console.log("Dispositivos de audio disponibles:", audioDevices);

    if (audioDevices.length === 0) {
      mostrarErrorMicrofono(
        "No se detectó ningún micrófono. Por favor, conecta uno."
      );
    } else {
      agregarMensajeAlChat(
        "Sistema",
        "✅ Micrófono detectado correctamente. Puedes empezar a hablar."
      );
    }
  } catch (error) {
    console.error("Error al acceder al micrófono:", error);
    mostrarErrorMicrofono(
      error.name === "NotAllowedError"
        ? "Necesito permiso para usar el micrófono. Por favor, permite el acceso cuando el navegador lo solicite."
        : "Error al acceder al micrófono: " + error.message
    );
  }
});

function mostrarErrorMicrofono(mensaje) {
  console.error(mensaje);
  agregarMensajeAlChat("Sistema", "❌ " + mensaje);

  // Mostrar mensaje de error en la interfaz
  const errorDiv = document.createElement("div");
  errorDiv.style.backgroundColor = "#ffebee";
  errorDiv.style.color = "#c62828";
  errorDiv.style.padding = "10px";
  errorDiv.style.margin = "10px";
  errorDiv.style.borderRadius = "5px";
  errorDiv.innerHTML = `
    <strong>Error del micrófono:</strong><br>
    ${mensaje}<br>
    <small>Mientras tanto, puedes usar el campo de texto para escribir tus mensajes.</small>
  `;
  document
    .querySelector(".container")
    .insertBefore(errorDiv, document.getElementById("chat-box"));
}

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SpeechRecognition) {
  console.error(
    "El reconocimiento de voz no es compatible con este navegador."
  );
  alert(
    "Tu navegador no soporta reconocimiento de voz. Por favor, usa Chrome o Edge."
  );
}

// Configurar idioma y voz predeterminados
const idiomaSeleccionado = "es-ES";
const vozSeleccionada = "Spanish";

const promptGuia = `
Eres un amigo virtual llamado Scooby, diseñado especialmente para niños y adolescentes entre 6 y 16 años.
Tu misión es actuar como un "Amigo Mentor" amable y entretenido, ayudándoles a aprender, resolver dudas y a disfrutar del tiempo que pasan contigo. Adapta tus respuestas a la edad de cada niño, brindando orientación en su vida diaria, fomentando la curiosidad y la creatividad, y animándolos a crecer y explorar el mundo de una manera segura y confiable.
Sugiere una pregunta relacionada con el tema para mantener la curiosidad y el interés, asegurándote de que sean preguntas breves y apropiadas para la edad del usuario, como explorar intereses, hacer preguntas sobre sus gustos o invitarlos a participar en actividades creativas.
`;

// Función para solicitar permisos de micrófono
async function solicitarPermisosMicrofono() {
  console.log("Solicitando permisos de micrófono...");

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioDevices = devices.filter(
      (device) => device.kind === "audioinput"
    );
    console.log("Dispositivos de audio disponibles:", audioDevices.length);

    if (audioDevices.length === 0) {
      throw new Error("No se encontraron dispositivos de audio");
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    console.log("Permisos de micrófono concedidos");
    console.log("Audio tracks:", stream.getAudioTracks().length);

    stream.getTracks().forEach((track) => {
      console.log("Track settings:", track.getSettings());
      track.stop();
    });

    return true;
  } catch (error) {
    console.error("Error detallado al solicitar permisos de micrófono:", error);
    let mensaje = "Error al acceder al micrófono: ";

    if (error.name === "NotAllowedError") {
      mensaje +=
        "Permiso denegado. Por favor, permite el acceso al micrófono en la configuración del navegador.";
    } else if (error.name === "NotFoundError") {
      mensaje +=
        "No se encontró ningún micrófono. Verifica que esté conectado correctamente.";
    } else {
      mensaje += error.message;
    }

    alert(mensaje);
    agregarMensajeAlChat("Sistema", "Error: " + mensaje);
    return false;
  }
}

// Función de escucha para el idioma seleccionado
async function startListening() {
  console.log("Iniciando proceso de escucha...");
  agregarMensajeAlChat("Sistema", "🎤 Iniciando reconocimiento de voz...");

  if (isStopped || speaking) {
    console.log("Estado actual - Detenido:", isStopped, "Hablando:", speaking);
    return;
  }

  try {
    recognition = new SpeechRecognition();
    recognition.lang = idiomaSeleccionado;
    recognition.continuous = false;
    recognition.interimResults = false;

    console.log("Configuración del reconocimiento de voz:");
    console.log("- Idioma:", recognition.lang);
    console.log("- Continuo:", recognition.continuous);
    console.log("- Resultados intermedios:", recognition.interimResults);

    recognition.onstart = function () {
      console.log("Reconocimiento de voz iniciado");
      document.getElementById("talk-btn").style.backgroundColor = "#ff0000";
      document.getElementById("talk-btn").textContent = "Escuchando...";
      agregarMensajeAlChat(
        "Sistema",
        "🎤 Escuchando... Di algo como 'Hola Scooby'"
      );
    };

    recognition.onerror = function (event) {
      console.error("Error en reconocimiento de voz:", event.error);
      console.error("Error completo:", event);

      let mensajeError = "";
      switch (event.error) {
        case "no-speech":
          mensajeError =
            "No se detectó ninguna voz. Por favor, habla más cerca del micrófono.";
          break;
        case "audio-capture":
          mensajeError =
            "Error al acceder al micrófono. Verifica que esté conectado y funcionando.";
          break;
        case "not-allowed":
          mensajeError =
            "Acceso al micrófono denegado. Por favor, permite el acceso en la configuración del navegador.";
          break;
        case "network":
          mensajeError = "Error de red. Verifica tu conexión a internet.";
          break;
        default:
          mensajeError = `Error desconocido: ${event.error}`;
      }

      console.error(mensajeError);
      agregarMensajeAlChat("Sistema", "❌ Error: " + mensajeError);

      document.getElementById("talk-btn").style.backgroundColor = "#4caf50";
      document.getElementById("talk-btn").textContent = "Hablar con Scooby";
    };

    recognition.onend = function () {
      console.log("El reconocimiento de voz ha terminado");
      if (!isStopped && !speaking) {
        console.log("Reiniciando reconocimiento de voz...");
        startListening();
      }
      document.getElementById("talk-btn").style.backgroundColor = "#4caf50";
      document.getElementById("talk-btn").textContent = "Hablar con Scooby";
    };

    recognition.onresult = function (event) {
      if (isStopped) return;
      const userMessage = event.results[0][0].transcript;
      console.log("Mensaje reconocido:", userMessage);
      console.log(
        "Confianza del reconocimiento:",
        event.results[0][0].confidence
      );
      enviarAlChatbot(userMessage);
    };

    recognition.start();
  } catch (error) {
    console.error("Error detallado al iniciar reconocimiento:", error);
    mostrarErrorMicrofono(
      "Error al iniciar el reconocimiento de voz: " + error.message
    );
  }
}

// Botones para controlar la conversación
document
  .getElementById("talk-btn")
  .addEventListener("click", async function () {
    isStopped = false;
    console.log("Iniciando nueva conversación...");

    // Primero verificamos la conexión con LM Studio
    const lmStudioConectado = await verificarConexionLMStudio();
    if (!lmStudioConectado) {
      agregarMensajeAlChat(
        "Sistema",
        "❌ Error: No se pudo conectar con LM Studio. Verifica que esté ejecutándose."
      );
      return;
    }

    // Agregamos un campo de texto temporal para pruebas
    if (!document.getElementById("texto-temporal")) {
      const divTemp = document.createElement("div");
      divTemp.style.margin = "20px";
      divTemp.innerHTML = `
      <input type="text" id="texto-temporal" placeholder="Escribe tu mensaje aquí" style="width: 300px; padding: 10px;">
      <button id="enviar-texto" style="padding: 10px; margin-left: 10px;">Enviar</button>
      <p style="color: #666; margin-top: 10px;">Modo temporal: Usa este campo mientras solucionamos el reconocimiento de voz</p>
    `;
      document
        .querySelector(".container")
        .insertBefore(divTemp, document.getElementById("chat-box"));

      // Agregamos el evento al botón de enviar
      document
        .getElementById("enviar-texto")
        .addEventListener("click", function () {
          const texto = document.getElementById("texto-temporal").value;
          if (texto.trim()) {
            enviarAlChatbot(texto);
            document.getElementById("texto-temporal").value = "";
          }
        });

      // También permitimos enviar con Enter
      document
        .getElementById("texto-temporal")
        .addEventListener("keypress", function (e) {
          if (e.key === "Enter") {
            const texto = this.value;
            if (texto.trim()) {
              enviarAlChatbot(texto);
              this.value = "";
            }
          }
        });
    }

    // Intentamos iniciar el reconocimiento de voz en paralelo
    try {
      await startListening();
    } catch (error) {
      console.error("Error al iniciar el reconocimiento de voz:", error);
      agregarMensajeAlChat(
        "Sistema",
        "⚠️ El reconocimiento de voz no está disponible. Por favor, usa el campo de texto temporal."
      );
    }
  });

document.getElementById("stop-btn").addEventListener("click", function () {
  isStopped = true;
  speaking = false;
  console.log("Conversación detenida.");

  if (recognition) {
    recognition.stop();
    console.log("Reconocimiento de voz detenido.");
  }

  window.speechSynthesis.cancel();

  if (!audio.paused) {
    audio.pause();
    audio.currentTime = 0;
    console.log("Audio TTS detenido.");
  }

  mostrarScoobyCallado();
});

document.getElementById("resume-btn").addEventListener("click", function () {
  isStopped = false;
  console.log("Conversación reanudada.");
  startListening();
});

// Función para verificar la conexión con LM Studio
async function verificarConexionLMStudio() {
  try {
    console.log("Intentando conectar con LM Studio...");

    const response = await fetch("http://localhost:1234/v1/models", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      mode: "cors",
    });

    if (!response.ok) {
      throw new Error(
        `Error de conexión: ${response.status} - ${response.statusText}`
      );
    }

    const data = await response.json();
    console.log("Modelos disponibles en LM Studio:", data);

    // Verificar si el modelo que necesitamos está disponible
    const modeloDisponible = data.data.some(
      (model) => model.id === "gemma-3-12b-it"
    );
    if (!modeloDisponible) {
      throw new Error("El modelo gemma-3-12b-it no está cargado en LM Studio");
    }

    console.log("Conexión con LM Studio establecida correctamente");
    agregarMensajeAlChat("Sistema", "✅ Conectado a LM Studio correctamente");
    return true;
  } catch (error) {
    console.error("Error detallado al conectar con LM Studio:", error);
    let mensajeError = "";

    if (error.message.includes("Failed to fetch")) {
      mensajeError =
        "No se pudo conectar con LM Studio. Por favor, verifica que:\n" +
        "1. LM Studio esté abierto y ejecutándose\n" +
        "2. La API esté habilitada en el puerto 1234\n" +
        "3. El modelo Gemma esté cargado correctamente";
    } else {
      mensajeError = `Error al conectar con LM Studio: ${error.message}`;
    }

    agregarMensajeAlChat("Sistema", "❌ " + mensajeError);
    alert(mensajeError);
    return false;
  }
}

// Función para enviar el mensaje al modelo en LM Studio
async function enviarAlChatbot(userMessage) {
  if (!userMessage.trim()) {
    agregarMensajeAlChat("Sistema", "❌ El mensaje no puede estar vacío");
    return;
  }

  agregarMensajeAlChat("Usuario", userMessage);
  agregarMensajeAlChat("Sistema", "💭 Procesando tu mensaje...");

  try {
    console.log("Enviando mensaje a LM Studio:", userMessage);

    const response = await fetch("http://localhost:1234/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      mode: "cors",
      body: JSON.stringify({
        model: "gemma-3-12b-it",
        messages: [
          { role: "system", content: promptGuia },
          { role: "user", content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Error del servidor: ${response.status} - ${response.statusText}`
      );
    }

    const data = await response.json();
    console.log("Respuesta completa de LM Studio:", data);

    if (!data.choices?.[0]?.message?.content) {
      throw new Error("Respuesta inválida del servidor");
    }

    const responseText = data.choices[0].message.content;
    agregarMensajeAlChat("Scooby", responseText);
    speakResponse(responseText);
  } catch (error) {
    console.error("Error detallado al procesar mensaje:", error);
    const mensajeError = error.message.includes("Failed to fetch")
      ? "No se pudo conectar con LM Studio. Verifica que esté ejecutándose correctamente."
      : `Error: ${error.message}`;

    agregarMensajeAlChat("Sistema", `❌ ${mensajeError}`);
    mostrarScoobyCallado();
  }
}

// Función para sintetizar la respuesta usando SpeechSynthesis
function speakResponse(responseText) {
  if (isStopped) return;

  speaking = true;
  mostrarScoobyHablando();

  const utterance = new SpeechSynthesisUtterance(responseText);
  utterance.lang = idiomaSeleccionado;
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.volume = 1;

  console.log(
    "Usando TTS del navegador como fallback en idioma:",
    utterance.lang
  );
  window.speechSynthesis.speak(utterance);

  utterance.onend = function () {
    mostrarScoobyCallado();
    speaking = false;
    console.log("Respuesta completada, Scooby está callado.");
  };
}

// Funciones auxiliares para visualización
function mostrarScoobyHablando() {
  document.getElementById("scooby-callado").classList.add("d-none");
  document.getElementById("scooby-hablando").classList.remove("d-none");
}

function mostrarScoobyCallado() {
  document.getElementById("scooby-hablando").classList.add("d-none");
  document.getElementById("scooby-callado").classList.remove("d-none");
}

function agregarMensajeAlChat(remitente, mensaje) {
  const chatBox = document.getElementById("conversation");
  if (!chatBox) {
    console.error("No se encontró el elemento del cuadro de conversación.");
    return;
  }

  const mensajeElemento = document.createElement("div");
  mensajeElemento.classList.add("mensaje");

  // Agregar estilos según el remitente
  if (remitente === "Sistema") {
    mensajeElemento.style.backgroundColor = "#f8f9fa";
    mensajeElemento.style.color = "#666";
    mensajeElemento.style.fontStyle = "italic";
  } else if (remitente === "Usuario") {
    mensajeElemento.style.backgroundColor = "#e3f2fd";
    mensajeElemento.style.textAlign = "right";
  } else if (remitente === "Scooby") {
    mensajeElemento.style.backgroundColor = "#f1f8e9";
  }

  mensajeElemento.innerHTML = `<strong>${remitente}:</strong> ${mensaje}`;
  chatBox.appendChild(mensajeElemento);
  mensajeElemento.scrollIntoView({ behavior: "smooth", block: "end" });
}
