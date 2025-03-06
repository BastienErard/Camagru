//##############################################################################################\\
//																								\\
//	Auteur		: 	Bastien Erard																\\
//	Version		: 	1.0																			\\
//	Créé le		: 	05.03.2025																	\\
//	Modifié le	:	05.03.2025																	\\
//	But			:	Gère les différentes routes pour le profil utilisateur						\\
//																								\\
//##############################################################################################\\

const express = require ('express');
const router = express.Router();
const profileController = require('../controllers/profileController');

router.get('/info', profileController.getUserProfile);
router.get('/avatars', profileController.getAvatars);
router.post('/update', profileController.updateProfile);
router.post('/change-password', profileController.changePassword);
router.post('/delete', profileController.deleteAccount);

module.exports = router;
