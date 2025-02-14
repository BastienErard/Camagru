//##############################################################################################\\
//																								\\
//	Auteur		: 	Bastien Erard																\\
//	Version		: 	1.0																			\\
//	Créé le		: 	29.01.2025																	\\
//	Modifié le	:	10.02.2025																	\\
//	But			:	Gère les différentes routes pour l'authentification							\\
//																								\\
//##############################################################################################\\

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.get('/status', authController.checkStatus);
router.post('/logout', authController.logout);

module.exports = router;
