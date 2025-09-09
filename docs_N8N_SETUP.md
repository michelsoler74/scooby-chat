# 🔧 Configuración de n8n para Scooby Chat

## Paso 1: Configurar n8n

Si no tienes n8n, puedes:

- Usar [n8n.cloud](https://n8n.cloud) (versión gratuita disponible)
- Self-hostear con Docker
- Usar n8n desktop

## Paso 2: Importar el Workflow

1. Copia el archivo `Scooby Chat Backend.json`
2. En n8n, crea un nuevo workflow
3. Importa el JSON

## Paso 3: Configurar Google Gemini

1. Obtén una API key de [Google AI Studio](https://makersuite.google.com/app/apikey)
2. En n8n, ve a Credentials
3. Crea nueva credencial de Google Gemini
4. Pega tu API key

## Paso 4: Activar el Webhook

1. En el nodo Webhook, copia la URL de producción
2. Activa el workflow
3. Esta URL la usarás en el frontend

## Paso 5: Probar

Puedes probar el webhook con:

```bash
curl -X POST https://tu-n8n.com/webhook/scooby-chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hola Scooby"}'
```
