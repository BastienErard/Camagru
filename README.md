# Camagru

<div align="center">
  <img src="frontend/media/logo.png" alt="Camagru Logo" width="200">
  <p>Une application web de capture et d'édition d'image</p>
</div>

## Description

Camagru est une application web de type Instagram permettant aux utilisateurs de prendre des photos avec leur webcam et d'y appliquer des filtres/stickers.

Les utilisateurs peuvent :
- Créer un compte avec vérification par email
- Prendre des photos via leur webcam ou télécharger des images
- Appliquer des stickers superposables aux images
- Créer des GIFs animés
- Voir une galerie de toutes les photos publiées
- Aimer et commenter les photos
- Recevoir des notifications par email

Ce projet a été développé dans le cadre du cursus de formation à l'école 42.

## 🛠️ Technologies utilisées

### Backend
- **Node.js**: Environnement d'exécution JavaScript
- **Express**: Framework web minimaliste
- **MySQL**: Base de données relationnelle
- **Nodemailer**: Service d'envoi d'emails
- **Jimp**: Bibliothèque de manipulation d'images
- **GIF-Encoder-2**: Bibliothèque pour la création de GIFs animés

### Frontend
- **HTML5/CSS3**: Structure et style de l'application
- **JavaScript**: Logique côté client
- **Bootstrap**: Framework CSS pour le design responsive
- **APIs natives du navigateur**: WebRTC, Canvas, Fetch API

### Déploiement
- **Docker/Docker Compose**: Conteneurisation de l'application
- **Nginx**: Serveur web pour le frontend

## 📦 Architecture du projet

```
.
├── Docker-compose.yml              # Configuration Docker Compose
├── README.md                       # Ce fichier
├── .env                            # Variables d'environnement
├── backend                         # Serveur API
│   ├── Dockerfile                  # Configuration Docker pour le backend
│   ├── api                         # API REST
│   │   ├── controllers             # Contrôleurs de l'API
│   │   └── routes                  # Définition des routes
│   ├── app.js                      # Point d'entrée de l'application
│   ├── package.json                # Dépendances NPM
│   └── services                    # Services (DB, email, manipulation d'images)
├── frontend                        # Interface utilisateur
│   ├── Dockerfile                  # Configuration Docker pour le frontend
│   ├── assets                      # Ressources statiques
│   │   ├── avatars                 # Avatars utilisateurs
│   │   └── stickers                # Stickers superposables
│   ├── css                         # Feuilles de style
│   ├── index.html                  # Page d'accueil (galerie)
│   ├── js                          # Scripts JavaScript
│   ├── media                       # Médias (logo, favicon)
│   └── nginx.conf                  # Configuration Nginx
└── init-scripts                    # Scripts d'initialisation
    └── 01-create-tables.sql        # Création des tables SQL
```

## 🚀 Installation et lancement

### Prérequis
- Docker et Docker Compose
- Git

### Étapes d'installation

1. Cloner le dépôt
   ```bash
   git clone https://github.com/BastienErard/camagru.git
   cd camagru
   ```

2. Créer un fichier `.env` à la racine du projet avec le contenu suivant:
   ```
   # Ports
   FRONTEND_PORT=8080
   BACKEND_PORT=3000
   FRONTEND_CONTAINER_PORT=80
   BACKEND_CONTAINER_PORT=3000
   PMA_PORT=8081

   # MySQL Configuration
   MYSQL_ROOT_PASSWORD=********
   MYSQL_DATABASE=camagru
   MYSQL_USER=********
   MYSQL_PASSWORD=********
   DB_HOST=db

   # Email Configuration
   EMAIL_USER=your_email@gmail.com
   EMAIL_APP_PASSWORD=********
   ```
   _Remplacez les valeurs marquées par des astérisques par vos propres informations_

3. Lancer l'application
   ```bash
   docker-compose up -d
   ```

4. Accéder à l'application
   - Frontend: http://localhost:8080
   - Backend API: http://localhost:3000
   - PhpMyAdmin: http://localhost:8081

### Arrêt de l'application
```bash
docker-compose down
```

## 🔍 Fonctionnalités principales

### Authentification et utilisateurs
- Inscription avec validation par email
- Connexion sécurisée
- Récupération de mot de passe
- Modification du profil et des préférences
- Déconnexion en un clic

### Édition d'images
- Capture via webcam avec sélection de caméra
- Téléchargement d'images
- Application de stickers superposables
- Déplacement et rotation des stickers
- Création de GIFs animés

### Galerie et interaction
- Affichage de toutes les photos publiées
- Pagination infinie
- Système de likes
- Commentaires en temps réel
- Notifications par email lors de nouveaux commentaires

## 📋 API REST et codes HTTP

L'API utilise les méthodes HTTP standard et renvoie les codes de statut appropriés :

| Méthode | Endpoint | Description | Codes HTTP |
|---------|----------|-------------|------------|
| GET | `/api/auth/status` | Vérifier le statut d'authentification | 200, 401 |
| POST | `/api/auth/login` | Connexion | 200, 400, 401, 500 |
| POST | `/api/auth/register` | Inscription | 200, 400, 500 |
| POST | `/api/auth/logout` | Déconnexion | 200, 500 |
| GET | `/api/auth/verify/:token` | Vérifier l'email | 200, 400, 500 |
| POST | `/api/auth/request-reset` | Demander réinitialisation de mot de passe | 200, 400, 500 |
| POST | `/api/auth/reset-password` | Réinitialiser le mot de passe | 200, 400, 500 |
| GET | `/api/profile/info` | Obtenir infos du profil | 200, 401, 500 |
| GET | `/api/profile/avatars` | Obtenir liste des avatars | 200, 500 |
| POST | `/api/profile/update` | Mettre à jour le profil | 200, 401, 500 |
| POST | `/api/profile/change-password` | Changer le mot de passe | 200, 401, 500 |
| POST | `/api/profile/delete` | Supprimer le compte | 200, 401, 500 |
| GET | `/api/editing/stickers` | Obtenir liste des stickers | 200, 500 |
| GET | `/api/editing/photos` | Obtenir photos de l'utilisateur | 200, 401, 500 |
| POST | `/api/editing/save` | Sauvegarder une photo | 200, 400, 401, 500 |
| DELETE | `/api/editing/photos/:id` | Supprimer une photo | 200, 401, 404, 500 |
| POST | `/api/editing/create-gif` | Créer un GIF | 200, 400, 401, 500 |
| GET | `/api/gallery` | Obtenir les photos de la galerie | 200, 500 |
| GET | `/api/gallery/:id/comments` | Obtenir les commentaires d'une photo | 200, 404, 500 |
| POST | `/api/gallery/:id/like` | Ajouter un like | 200, 400, 401, 404, 500 |
| DELETE | `/api/gallery/:id/like` | Supprimer un like | 200, 400, 401, 404, 500 |
| POST | `/api/gallery/:id/comment` | Ajouter un commentaire | 200, 400, 401, 404, 500 |

**Codes HTTP utilisés :**
- `200`: Succès
- `400`: Requête incorrecte (données manquantes ou invalides)
- `401`: Non autorisé (authentification requise)
- `404`: Ressource non trouvée
- `500`: Erreur interne du serveur

## 🔄 Équivalences avec la bibliothèque standard PHP

Le projet utilise Node.js pour le backend, mais chaque fonctionnalité a un équivalent dans la bibliothèque standard PHP :

| Fonctionnalité Node.js | Équivalent PHP |
|------------------------|----------------|
| Express (Routing, Middleware) | PHP Router natif, fonctions de traitement HTTP |
| mysql2 (Base de données) | mysqli, PDO |
| crypto (Hachage) | password_hash(), hash() |
| fs (Manipulation de fichiers) | file_get_contents(), file_put_contents() |
| Jimp (Manipulation d'images) | GD Library, Imagick |
| Nodemailer (Envoi d'emails) | mail(), PHPMailer |
| JWT (Authentification) | Sessions PHP, fonctions de cryptographie |
| Path (Manipulation de chemins) | dirname(), basename(), realpath() |
| Cookie-parser (Gestion des cookies) | setcookie(), $_COOKIE |

## 🌟 Fonctionnalités bonus

- **AJAX** : Communication asynchrone avec le serveur sans rechargement de page
- **Pagination infinie** : Chargement automatique des images supplémentaires au défilement
- **Création de GIFs** : Possibilité de créer des GIFs animés à partir de plusieurs captures
- **Prévisualisation en direct** : Affichage en temps réel des stickers sur l'image de la webcam
- **Interface responsive** : Adaptation complète aux appareils mobiles et tablettes

## 🔒 Sécurité

- Mots de passe hachés (SHA-256 + sel)
- Protection contre les injections SQL (requêtes préparées)
- Validation des données côté client et serveur
- Protection CSRF
- Contrôle d'accès strict aux ressources
- Tokens d'authentification sécurisés
- Expiration et nettoyage des tokens inutilisés

## 👥 Auteur

Développé par Bastien Erard pour le projet Camagru de l'école 42.

