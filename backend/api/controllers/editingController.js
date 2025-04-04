//##############################################################################################\\
//																								\\
//	Auteur		: 	Bastien Erard																\\
//	Version		: 	1.0																			\\
//	Créé le		: 	28.03.2025																	\\
//	Modifié le	:	28.03.2025																	\\
//	But			:	Contrôleur pour la gestion de l'édition d'images							\\
//																								\\
//##############################################################################################\\

const db = require('../../services/database');
const  cessor = require('../../services/imageProcessor');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Récupère les différents stickers disponibles
async function	getStickers(req, res)
{
	try
	{
		const [stickers] = await db.execute(
			`SELECT
				id,
				name,
				file_path
			FROM
				stickers
			ORDER BY
				id`
		);

		return res.json({
			success: true,
			stickers : stickers
		});
	}
	catch (error)
	{
		console.error('Erreur lors de la récupération des stickers:', error);
		return res.status(500).json({
			success: false,
			message: 'Erreur lors de la récupération des stickers'
		})
	}
}

// Récupère les photos de l'utilisateur
async function getUserPhotos(req, res)
{
	try
	{
		// Récupère l'ID de l'utilisateur depuis le cookie
		const authToken = req.cookies.authToken;

		if (!authToken)
		{
			return res.status(401).json({
				success: false,
				message: 'Utilisateur non authentifié'
			});
		}

		// Récupère l'ID de l'utilisateur grâce au token
		const [users] = await db.execute(
			`SELECT
				id
			FROM
				users
			WHERE
				verification_token = ? AND is_verified = TRUE`,
			[authToken]
		);

		if (users.length === 0)
		{
			return res.status(401).json({
				success: false,
				message: 'Session invalide'
			});
		}

		const userId = users[0].id;

		// Récupère les photos de l'utilisateur via son id
		const [photos] = await db.execute(
			`SELECT
				id,
				file_path,
				thumbnail_path,
				is_gif,
				created_at
			FROM
				photos
			WHERE
				user_id = ?
			ORDER BY
				created_at DESC`,
			[userId]
		);

		return res.json({
			success: true,
			photos: photos
		});
	}
	catch (error)
	{
		console.error('Erreur lors de la récupération des images de l\'utilisateur:', error);
		return res.status(500).json({
			success: false,
			message: 'Erreur lors de la récupération des images de l\'utilisateur'
		});
	}
}

// Sauvegarde une photo dans la base de données
async function savePhoto(req, res)
{
	try
	{
		// Récupère l'ID de l'utilisateur depuis le cookie
		const authToken = req.cookies.authToken;

		if (!authToken)
		{
			return res.status(401).json({
				success: false,
				message: 'Non authentifié'
			});
		}

		// Récupère l'ID de l'utilisateur
		const [users] = await db.execute(
			`SELECT
				id
			FROM
				users
			WHERE
				verification_token = ? AND is_verified = TRUE`,
			[authToken]
		);

		// Vérifie que l'utilisateur existe
		if (users.length === 0)
		{
			return res.status(401).json({
				success: false,
				message: 'Session invalide'
			});
		}

		const userId = users[0].id;
		const { imageData, stickers } = req.body;

		if (!imageData)
		{
			return res.status(400).json({
				success: false,
				message: 'Données d\'image manquantes'
			});
		}

		// Génère un nom de fichier unique
		const fileName = `${crypto.randomBytes(16).toString('hex')}.png`;
		const thumbnailName = `thumb_${fileName}`;

		// Définit les chemins des fichiers
		const uploadDir = path.join(__dirname, '../../../frontend/uploads/photos');
		const thumbnailDir = path.join(__dirname, '../../../frontend/uploads/thumbnails');

		// Crée les répertoires s'ils n'existent pas
		if (!fs.existsSync(uploadDir))
			fs.mkdirSync(uploadDir, { recursive: true });
		if (!fs.existsSync(thumbnailDir))
			fs.mkdirSync(thumbnailDir, { recursive: true });

		const filePath = path.join(uploadDir, fileName);
		const thumbnailPath = path.join(thumbnailDir, thumbnailName);

		// Chemins relatifs pour la base de données
		const relativeFilePath = `/uploads/photos/${fileName}`;
		const relativeThumbnailPath = `/uploads/thumbnails/${thumbnailName}`;

		// Si des stickers sont sélectionnés, fusionne les images
		let finalImageData = imageData;
		if (stickers && stickers.length > 0)
		{
			// Convertit les informations des stickers pour le traitement
			const stickerObjets = await Promise.all(stickers.map(async sticker => {
				// Récupère le chemin du sticker
				const [stickerResult] = await db.execute(
					`SELECT
						file_path
					FROM
						stickers
					WHERE
						id = ?`,
					[sticker.id]
				);

				if (stickerResult.length === 0)
					throw new Error(`Sticker avec l'ID ${sticker.id} non trouvé`);

				// Chemin absolu du sticker
				const stickerPath = path.join(__dirname, '../../../frontend', stickerResult[0].file_path);

				return {
					path: stickerPath,
					x: sticker.x,
					y: sticker.y,
					scale: sticker.scale,
					rotation: sticker.rotation
				};
			}));

			// Fusionne l'image avec les stickers
			finalImageData = await imageProcessor.mergeImagesWithStickers(imageData, stickerObjets);
		}

		// Sauvegarde l'image
		await imageProcessor.saveImage(finalImageData, filePath);

		// Crée et sauvegarde la miniature
		await imageProcessor.createThumbnail(finalImageData, thumbnailPath);

		// Enregistre les informations dans la base de données
		const [result] = await db.execute(
			`INSERT INTO
				photos (user_id, file_path, thumbnail_path, is_gif)
			VALUES
				(?, ?, ?, FALSE)`,
			[userId, relativeFilePath, relativeThumbnailPath]
		);

		return res.json({
			success: true,
			message: 'Photo sauvegardée avec succès',
			photoId: result.insertId,
			path: relativeFilePath
		});
	}
	catch (error)
	{
		console.error('Erreur lors de la sauvegarde de la photo:', error);
		return res.status(500).json({
			success: false,
			message: 'Erreur lors de la sauvegarde de la photo'
		});
	}
}

// supprime une photo
async function deletePhoto(req, res)
{
	try
	{
		// Récupère l'ID de l'utilisateur depuis le cookie
		const authToken = req.cookies.authToken;

		if (!authToken) {
			return res.status(401).json({
				success: false,
				message: 'Non authentifié'
			});
		}

		// Récupère l'ID de l'utilisateur
		const [users] = await db.execute(
			`SELECT
				id
			FROM
				users
			WHERE
				verification_token = ? AND is_verified = TRUE`,
			[authToken]
		);

		// Vérifie que l'utilisateur existe
		if (users.length === 0)
		{
			return res.status(401).json({
				success: false,
				message: 'Session invalide'
			});
		}

		const userId = users[0].id;
		const photoId = req.params.id;

		const [photos] = await db.execute(
			`SELECT
				file_path,
				thumbnail_path
			FROM
				photos
			WHERE
				id = ? AND user_id = ?`,
			[photoId, userId]
		);

		if (photos.length === 0)
		{
			return res.status(404).json({
				success: false,
				message: 'Photo non trouvée ou accès non autorisé'
			});
		}

		const photo = photos[0];

		// Prend le chemin d'accès au fichier et sa miniature
		const filePath = path.join(__dirname, '../../../frontend', photo.file_path);
		const thumbnailPath = path.join(__dirname, '../../../frontend', photo.thumbnail_path);

		// Supprime le fichier principal s'il existe
		if (fs.existsSync(filePath))
			fs.unlinkSync(filePath);
		// Supprime la miniature si elle existe
		if (fs.existsSync(thumbnailPath))
			fs.unlinkSync(thumbnailPath);

		// Supprime l'entrée dans la base de données
		await db.execute(
			`DELETE FROM
				photos
			WHERE
				id = ?`,
			[photoId]
		);

		return res.json({
			success: true,
			message: 'Photo supprimée avec succès'
		});
	}
	catch (error)
	{
		console.error('Erreur lors de la suppression de la photo:', error);
		return res.status(500).json({
			success: false,
			message: 'Erreur lors de la suppression de la photo'
		});
	}
}

// Crée un GIF animé
async function createGif(req, res)
{
	try
	{
		// Récupère l'ID de l'utilisateur depuis le cookie
		const authToken = req.cookies.authToken;

		if (!authToken) {
			return res.status(401).json({
				success: false,
				message: 'Non authentifié'
			});
		}

		// Récupère l'ID de l'utilisateur
		const [users] = await db.execute(
			`SELECT
				id
			FROM
				users
			WHERE
				verification_token = ? AND is_verified = TRUE`,
			[authToken]
		);

		// Vérifie que l'utilisateur existe
		if (users.length === 0)
		{
			return res.status(401).json({
				success: false,
				message: 'Session invalide'
			});
		}

		const userId = users[0].id;
		const {frames, frameDelay, stickers} = req.body;

		if (!frames || frames.length < 2)
		{
			return res.status(400).json({
				success: false,
				message: 'Au moins deux frames sont nécessaires pour créer un GIF'
			});
		}

		// Génère un nom de fichier unique
		const fileName = `${crypto.randomBytes(16).toString('hex')}.gif`;
		const thumbnailName = `thumb_${fileName.replace('.gif', '.png')}`;

		// Définit les chemins des fichiers
		const uploadDir = path.join(__dirname, '../../../frontend/uploads/photos');
		const thumbnailDir = path.join(__dirname, '../../../frontend/uploads/thumbnails');

		// Crée les répertoires s'ils n'existent pas
		if (!fs.existsSync(uploadDir))
			fs.mkdirSync(uploadDir, { recursive: true });
		if (!fs.existsSync(thumbnailDir))
			fs.mkdirSync(thumbnailDir, { recursive: true });

		const filePath = path.join(uploadDir, fileName);
		const thumbnailPath = path.join(thumbnailDir, thumbnailName);

		// Chemins relatifs pour la base de données
		const relativeFilePath = `/uploads/photos/${fileName}`;
		const relativeThumbnailPath = `/uploads/thumbnails/${thumbnailName}`;

		// Traite les stickers
		const stickerObjets = [];
		if (stickers && stickers.length > 0)
		{
			// Convertit les informations des stickers pour le traitement
			for (const sticker of stickers)
			{
				// Récupère le chemin du sticker
				const [stickerResult] = await db.execute(
					`SELECT
						file_path
					FROM
						stickers
					WHERE
						id = ?`,
					[sticker.id]
				);

				if (stickerResult.length > 0)
				{
					// Chemin absolu du sticker
					const stickerPath = path.join(__dirname, '../../../frontend', stickerResult[0].file_path);

					stickerObjets.push({
						path: stickerPath,
						x: sticker.x,
						y: sticker.y,
						scale: sticker.scale,
						rotation: sticker.rotation
					});
				}
			}
		}

		// Crée le GIF
		await imageProcessor.createGif(frames, filePath, frameDelay, stickerObjets);

		// Crée la miniature à partir de la première frame
		await imageProcessor.createThumbnail(frames[0], thumbnailPath);

		// Enregistre les informations dans la base de données
		const [result] = await db.execute(
			`INSERT INTO
				photos (user_id, file_path, thumbnail_path, is_gif)
			VALUES
				(?, ?, ?, TRUE)`,
			[userId, relativeFilePath, relativeThumbnailPath]
		);

		return res.json({
			success: true,
			message: 'GIF créé avec succès',
			photoId: result.insertId,
			path: relativeFilePath
		});
	}
	catch (error)
	{
		console.error('Erreur lors de la création du GIF:', error);
		return res.status(500).json({
			success: false,
			message: 'Erreur lors de la création du GIF'
		});
	}
}

module.exports = {
	getStickers,
	getUserPhotos,
	savePhoto,
	deletePhoto,
	createGif
};
