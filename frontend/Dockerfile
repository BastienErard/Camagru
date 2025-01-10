# Utiliser une image Nginx officielle légère
FROM nginx:alpine

# Définir le répertoire de travail dans le conteneur
WORKDIR /usr/share/nginx/html

# Copier la configuration Nginx personnalisée
COPY nginx.conf /etc/nginx/conf.d/

# Copier les fichiers statiques du frontend
COPY . .

# Exposer le port utilisé par Nginx
ARG CONTAINER_PORT_FRONT
EXPOSE $CONTAINER_PORT_FRONT

# Démarrer Nginx
CMD ["nginx", "-g", "daemon off;"]
