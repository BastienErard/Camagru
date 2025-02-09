//##############################################################################################\\
//																								\\
//	Auteur		: 	Bastien Erard																\\
//	Version		: 	1.0																			\\
//	Créé le		: 	29.01.2025																	\\
//	Modifié le	:	29.01.2025																	\\
//	But			:	Porte d'entrée du projet													\\
//																								\\
//##############################################################################################\\

const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config()

const app = express();
const PORT = process.env.BACKEND_PORT || 4000;

// Middleware pour parser le corps des requêtes JSON
app.use(express.json());

// Servir les fichiers statiques
app.use(express.static(path.join(__dirname, '../frontend')));

// Démarrer le serveur
app.listen(PORT, '0.0.0.0', () =>
{
	console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
