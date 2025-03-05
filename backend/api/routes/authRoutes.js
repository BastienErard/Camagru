//##############################################################################################\\
//																								\\
//	Auteur		: 	Bastien Erard																\\
//	Version		: 	1.0																			\\
//	Créé le		: 	29.01.2025																	\\
//	Modifié le	:	19.02.2025																	\\
//	But			:	Gère les différentes routes pour l'authentification							\\
//																								\\
//##############################################################################################\\

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.get('/status', authController.checkStatus);
router.get('/verify/:token', authController.verifyAccount);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.post('/register', authController.register);
router.post('/request-reset', authController.requestPasswordReset);
router.post('/reset-password', authController.resetPassword);
router.get('/reset-password-redirect/:token', authController.resetPasswordRedirect);

module.exports = router;
