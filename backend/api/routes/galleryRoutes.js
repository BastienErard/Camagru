//##############################################################################################\\
//																								\\
//	Auteur		: 	Bastien Erard																\\
//	Version		: 	1.0																			\\
//	Créé le		: 	18.04.2025																	\\
//	Modifié le	:	18.04.2025																	\\
//	But			:	Gère les différentes routes pour la gallerie								\\
//																								\\
//##############################################################################################\\

const express = require('express');
const router = express.Router();
const galleryController = require('../controllers/galleryController');

router.get('/', galleryController.getPhotos);
router.get('/:id/comments', galleryController.getPhotoComments);
router.post('/:id/like', galleryController.likePhoto);
router.delete('/:id/like', galleryController.unlikePhoto);
router.post('/:id/comment', galleryController.addComment);

module.exports = router;
