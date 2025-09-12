# 📚 Guía de Configuración - Scooby Chat

## Requisitos previos

1. **Cuenta de n8n** (gratuita o self-hosted)
2. **Navegador moderno** (Chrome, Firefox, Safari, Edge)
3. **Micrófono** (opcional, para funciones de voz)

## Configuración del Backend (n8n)

### Paso 1: Crear el workflow

1. Accede a tu instancia de n8n
2. Crea un nuevo workflow
3. Configura un nodo Webhook + nodo HTTP Request a Google Gemini
4. Configura las credenciales de Google Gemini
5. Para modo Beta: Crea 3 workflows idénticos con URLs diferentes

### Paso 2: Activar el webhook

1. Haz clic en el nodo "Webhook"
2. Copia la URL del webhook de producción
3. Activa el workflow

## Configuración del Frontend

### Paso 1: Acceder a la aplicación

1. Visita https://scooby-chat.netlify.app
2. Haz clic en el ícono de configuración ⚙️

### Paso 2: Configurar el webhook

1. Pega la URL del webhook copiada de n8n
2. Selecciona la etapa educativa: Primaria (6-11), Secundaria (12-17), Universidad (18+)
3. Guarda la configuración

**Nota**: En modo Beta, la configuración es automática.

## Solución de problemas

### El chat no responde

- Verifica que el workflow esté activo en n8n
- Confirma que la URL del webhook sea correcta
- Revisa la consola del navegador para errores

### El micrófono no funciona

- Asegúrate de dar permisos al navegador
- Verifica que el micrófono esté conectado
- Prueba en otro navegador

## Soporte

Si necesitas ayuda, crea un issue en [GitHub](https://github.com/michelsoler74/scooby-chat).
