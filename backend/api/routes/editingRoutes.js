//##############################################################################################\\
//																								\\
//	Auteur		: 	Bastien Erard																\\
//	Version		: 	1.0																			\\
//	Créé le		: 	28.03.2025																	\\
//	Modifié le	:	28.03.2025																	\\
//	But			:	Gère les différentes routes pour l'édition d'images							\\
//																								\\
//##############################################################################################\\

const express = require('express');
const router = express.Router();
const editingController = require('../controllers/editingController');

router.get('/stickers', editingController.getStickers);
router.get('/photos', editingController.getUserPhotos);
router.post('/save', editingController.savePhoto);
router.delete('/photos/:id', editingController.deletePhoto);
router.post('/create-gif', editingController.createGif);

module.exports = router;
