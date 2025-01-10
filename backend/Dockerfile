# Utiliser une image Node.js officielle
FROM node:18

# Définir le répertoire de travail dans le conteneur
WORKDIR /app

# Copier uniquement les fichiers nécessaires pour installer les dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm install

# Copier le reste des fichiers du projet
COPY . .

# Exposer le port utilisé par l'application
ARG CONTAINER_PORT_BACK
EXPOSE $CONTAINER_PORT_BACK

# Commande pour démarrer le serveur
CMD ["node", "app.js"]
