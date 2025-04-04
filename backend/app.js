//##############################################################################################\\
//																								\\
//	Auteur		: 	Bastien Erard																\\
//	Version		: 	1.0																			\\
//	Créé le		: 	29.01.2025																	\\
//	Modifié le	:	13.02.2025																	\\
//	But			:	Porte d'entrée du projet													\\
//																								\\
//##############################################################################################\\

const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const tokenCleaner = require('./services/tokenCleaner');
dotenv.config()

const app = express();
const PORT = process.env.BACKEND_PORT || 4000;

// Middleware pour parser le corps des requêtes JSON
app.use(cookieParser());
app.use(express.json());
app.use(cors({
	origin: `http://localhost:${process.env.FRONTEND_PORT}`,
	credentials: true
}));

// Routes
const authRoutes = require('./api/routes/authRoutes');
const profileRoutes = require('./api/routes/profileRoutes');
const editingRoutes = require('./api/routes/editingRoutes');
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/editing', editingRoutes);

// Servir les fichiers statiques si absence de Nginx
app.use(express.static(path.join(__dirname, '../frontend')));

// Healthcheck
app.get('/health', (req, res) => {
	console.log('Health check endpoint called');
	res.status(200).send("OK");
});

// Nettoie les tokens expirés toutes les heures
setInterval(() => {
	tokenCleaner.cleanExpiredVerifTokens();
	tokenCleaner.cleanInactiveSessionTokens();
	tokenCleaner.cleanExpiredResetTokens();
}, 360000); // 3600000 ms = 1 heure

// Démarrer le serveur
app.listen(PORT, '0.0.0.0', () =>
{
	console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
