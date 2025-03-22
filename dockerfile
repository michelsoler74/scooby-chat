# Dockerfile para servir la aplicación Scooby con un servidor web ligero

# Utilizar una imagen base de nginx para servir archivos estáticos
FROM nginx:alpine

# Definir el directorio de trabajo en el contenedor
WORKDIR /usr/share/nginx/html

# Copiar todos los archivos de la aplicación al directorio de nginx
COPY . /usr/share/nginx/html

# Exponer el puerto en el que se ejecutará la aplicación
EXPOSE 80

# El servidor nginx se ejecuta automáticamente al iniciar el contenedor
