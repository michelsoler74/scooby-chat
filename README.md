# Scooby - Tu Amigo Virtual

Scooby es un asistente virtual educativo y de entretenimiento para niños, que toma la forma del querido personaje Scooby-Doo. Diseñado para niños entre 6 y 16 años, Scooby actúa como un "Amigo Mentor" que puede responder preguntas, contar historias, proponer actividades y conversar de forma amena y educativa.

## Características principales

- 🎭 **Personalidad de Scooby-Doo**: Interactúa con la auténtica personalidad del perro detective.
- 🗣️ **Comunicación por voz**: Habla con Scooby utilizando tu micrófono y escucha sus respuestas.
- 💬 **Chat de texto**: También puedes escribir tus mensajes si prefieres no usar el micrófono.
- 📚 **Contenido educativo**: Scooby explica temas escolares de forma sencilla y divertida.
- 🧩 **Acertijos y juegos**: Propone retos mentales adaptados a diferentes edades.
- 🛡️ **Entorno seguro**: Diseñado con la seguridad infantil como prioridad.

## Actualizaciones recientes

### 🆕 Uso de Hugging Face en lugar de Azure

Hemos reemplazado los servicios de Azure por Hugging Face, permitiendo el uso completamente gratuito durante el desarrollo y después. Esto incluye:

1. **Text-to-Speech (TTS)**: Usamos el modelo `facebook/mms-tts-spa` para convertir texto a voz en español.
2. **Speech-to-Text (STT)**: Utilizamos `openai/whisper-medium` para reconocimiento de voz.
3. **Chat**: Interacción con modelo `mistralai/Mixtral-8x7B-Instruct-v0.1` para respuestas naturales.

## Configuración

### Requisitos previos

1. Navegador moderno (Chrome, Edge, Firefox)
2. Micrófono (para funcionalidad de voz)
3. Cuenta gratuita en Hugging Face

### Obtener una API Key de Hugging Face

1. Regístrate en [Hugging Face](https://huggingface.co/join)
2. Ve a tu perfil → Settings → Access Tokens
3. Crea un nuevo token con permisos de lectura

### Configurar Scooby

1. Abre la aplicación en tu navegador
2. Haz clic en el botón ⚙️ (Configuración) en la esquina superior derecha
3. Ingresa tu API Key de Hugging Face y guarda la configuración
4. Recarga la página para aplicar los cambios

## Cómo usar Scooby

1. **Hablar con Scooby**:

   - Haz clic en el botón "Hablar" para iniciar el reconocimiento de voz
   - Habla claramente al micrófono
   - Espera a que Scooby procese tu mensaje y responda

2. **Escribir mensajes**:

   - Escribe tu mensaje en el campo de texto
   - Presiona "Enviar" o la tecla Enter

3. **Controles adicionales**:
   - "Detener": Pausa la conversación y la síntesis de voz
   - "Continuar": Reanuda la conversación
   - "Limpiar chat": Elimina el historial de la conversación actual

## Desarrollo local

### Requisitos

- Node.js (v14+)
- NPM o Yarn
- Un editor de código (VS Code recomendado)

### Instalación

1. Clona este repositorio:

```bash
git clone https://github.com/tu-usuario/scooby-chat.git
cd scooby-chat
```

2. Instala las dependencias:

```bash
npm install
# o
yarn install
```

3. Corre el servidor de desarrollo:

```bash
npm start
# o
yarn start
```

4. Abre tu navegador en `http://localhost:3000`

## Solución de problemas

### Si el micrófono no funciona:

1. Verifica que has dado permisos al navegador para usar el micrófono
2. Comprueba que el micrófono está conectado y funcionando correctamente
3. Si usas Chrome o Edge, comprueba que el sitio tiene permisos HTTPS o localhost

### Si Hugging Face no responde:

1. Verifica que tu API key es válida y está correctamente configurada
2. Asegúrate de tener una conexión a internet estable
3. Comprueba si hay problemas en la [página de estado de Hugging Face](https://status.huggingface.co/)

## Contribuciones

¡Las contribuciones son bienvenidas! Si quieres mejorar Scooby, puedes:

1. Reportar errores o sugerir mejoras a través de Issues
2. Enviar Pull Requests con nuevas características o correcciones
3. Mejorar la documentación

## Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo LICENSE para detalles.

## Contacto

Si tienes alguna pregunta, puedes contactarnos a través de [tu-correo@ejemplo.com](mailto:tu-correo@ejemplo.com).

---

🐕 ¡Scooby-dooby-doo!
