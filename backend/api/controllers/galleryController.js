//##############################################################################################\\
//																							  \\
//	Auteur		: 	Bastien Erard														      \\
//	Version		: 	1.0																	      \\
//	Créé le		: 	18.04.2025															      \\
//	Modifié le	:	18.04.2025															      \\
//	But			:	Contrôleur pour la gestion des photos dans la galerie				      \\
//																							  \\
//##############################################################################################\\

const db = require('../../services/database');
const emailService = require('../../services/email');

// Récupère toutes les photos avec pagination
async function getPhotos(req, res)
{
	try
	{
		const page = parseInt(req.query.page) || 1;
		const limit = parseInt(req.query.limit) || 5;
		const offset = (page - 1) * limit;

		// Récupére l'ID de l'utilisateur connecté (si disponible)
		let userId = null;
		if (req.cookies.authToken)
		{
			const [userRows] = await db.execute(
				`SELECT
					id
				FROM
					users
				WHERE
					verification_token = ?`,
				[req.cookies.authToken]
			);

			if (userRows.length > 0)
				userId = userRows[0].id;
		}

		let photos;

		if (userId)
		{
			// Utilisateur connecté
			const [rows] = await db.execute(`
				SELECT
					p.id,
					p.file_path,
					p.created_at,
					u.id AS user_id,
					u.username,
					a.file_path AS avatar_path,
					(SELECT COUNT(*) FROM likes WHERE photo_id = p.id) AS like_count,
					(SELECT COUNT(*) FROM comments WHERE photo_id = p.id) AS comment_count,
					(SELECT COUNT(*) > 0 FROM likes WHERE photo_id = p.id AND user_id = ?) AS is_liked
				FROM
					photos p
				JOIN
					users u ON p.user_id = u.id
				LEFT JOIN
					avatars a ON u.avatar_id = a.id
				ORDER BY
					p.created_at DESC
				LIMIT ${limit} OFFSET ${offset}
			`, [userId]);
			photos = rows;
		}
		else
		{
			// Utilisateur non connecté
			const [rows] = await db.execute(`
				SELECT
					p.id,
					p.file_path,
					p.created_at,
					u.id AS user_id,
					u.username,
					a.file_path AS avatar_path,
					(SELECT COUNT(*) FROM likes WHERE photo_id = p.id) AS like_count,
					(SELECT COUNT(*) FROM comments WHERE photo_id = p.id) AS comment_count,
					0 AS is_liked
				FROM
					photos p
				JOIN
					users u ON p.user_id = u.id
				LEFT JOIN
					avatars a ON u.avatar_id = a.id
				ORDER BY
					p.created_at DESC
				LIMIT ${limit} OFFSET ${offset}
			`);
			photos = rows;
		}

		// Pour chaque photo, récupère les 5 commentaires les plus récents
		for (const photo of photos)
		{
			const [comments] = await db.execute(`
				SELECT
					c.id,
					c.comment_text,
					c.created_at,
					u.username,
					a.file_path AS avatar_path
				FROM
					comments c
				JOIN
					users u ON c.user_id = u.id
				LEFT JOIN
					avatars a ON u.avatar_id = a.id
				WHERE
					c.photo_id = ?
				ORDER BY
					c.created_at ASC
				LIMIT 5
			`, [photo.id]);

			photo.comments = comments;
		}

		res.json({
			success: true,
			photos: photos
		});
	}
	catch (error)
	{
		console.error('Erreur lors de la récupération des photos:', error);
		res.status(500).json({
			success: false,
			message: 'Erreur lors de la récupération des photos'
		});
	}
}

// Récupère les commentaires d'une photo avec pagination
async function getPhotoComments(req, res)
{
	try
	{
		const photoId = req.params.id;
		const page = parseInt(req.query.page) || 1;
		const limit = parseInt(req.query.limit) || 5;
		const offset = (page - 1) * limit;

		// Vérifie si la photo existe
		const [photos] = await db.execute(
			`SELECT
				*
			FROM
				photos
			WHERE
				id = ?`,
			[photoId]);

		if (photos.length === 0)
			return res.status(404).json({
				success: false,
				message: 'Photo non trouvée'
			});

		// Récupère les commentaires avec pagination
		const [comments] = await db.execute(`
			SELECT
				c.id,
				c.comment_text,
				c.created_at,
				u.username,
				a.file_path AS avatar_path
			FROM
				comments c
			JOIN
				users u ON c.user_id = u.id
			LEFT JOIN
				avatars a ON u.avatar_id = a.id
			WHERE
				c.photo_id = ?
			ORDER BY
				c.created_at ASC
			LIMIT ${limit} OFFSET ${offset}
		`, [photoId]);

		// Vérifie s'il y a plus de commentaires à charger
		const [countResult] = await db.execute(
			`SELECT
				COUNT(*) AS total
			FROM
				comments
			WHERE
				photo_id = ?`,
			[photoId]
		);

		const total = countResult[0].total;
		const hasMore = total > offset + comments.length;

		res.json({
			success: true,
			comments: comments,
			hasMore: hasMore,
			page: page,
			totalComments: total
		});
	}
	catch (error)
	{
		console.error('Erreur lors de la récupération des commentaires:', error);
		res.status(500).json({
			success: false,
			message: 'Erreur lors de la récupération des commentaires'
		});
	}
}

// Ajoute un like à une photo
async function likePhoto(req, res)
{
	try
	{
		// Vérifie si l'utilisateur est authentifié
		if (!req.cookies.authToken)
			return res.status(401).json({
				success: false,
				message: 'Vous devez être connecté pour liker une photo'
			});

		// Récupère l'ID de l'utilisateur
		const [userRows] = await db.execute(
			`SELECT
				id
			FROM
				users
			WHERE
				verification_token = ?`,
			[req.cookies.authToken]
		);

		if (userRows.length === 0)
			return res.status(401).json({
				success: false,
				message: 'Session invalide. Veuillez vous reconnecter.'
			});

		const userId = userRows[0].id;
		const photoId = req.params.id;

		// Vérifie si la photo existe
		const [photos] = await db.execute(
			`SELECT
				*
			FROM
				photos
			WHERE
				id = ?`,
			[photoId]);

		if (photos.length === 0)
			return res.status(404).json({
				success: false,
				message: 'Photo non trouvée'
			});

		// Vérifie si l'utilisateur a déjà liké la photo
		const [existingLikes] = await db.execute(
			`SELECT
				*
			FROM
				likes
			WHERE
				photo_id = ? AND user_id = ?`,
			[photoId, userId]
		);

		if (existingLikes.length > 0)
			return res.status(400).json({
				success: false,
				message: 'Vous avez déjà liké cette photo'
			});

		// Ajoute le like
		await db.execute(
			`INSERT INTO
				likes (photo_id, user_id)
			VALUES
				(?, ?)`,
			[photoId, userId]
		);

		// Récupére le nouveau nombre de likes
		const [likeResult] = await db.execute(
			`SELECT
				COUNT(*) AS like_count
			FROM
				likes
			WHERE
				photo_id = ?`,
			[photoId]
		);

		const likeCount = likeResult[0].like_count;

		res.json({
			success: true,
			is_liked: true,
			like_count: likeCount,
			message: 'Photo likée avec succès'
		});
	}
	catch (error)
	{
		console.error('Erreur lors de l\'ajout du like:', error);
		res.status(500).json({
			success: false,
			message: 'Erreur lors de l\'ajout du like'
		});
	}
}

// Supprime un like d'une photo
async function unlikePhoto(req, res)
{
	try
	{
		// Vérifie si l'utilisateur est authentifié
		if (!req.cookies.authToken)
			return res.status(401).json({
				success: false,
				message: 'Vous devez être connecté pour retirer un like'
			});

		// Récupère l'ID de l'utilisateur
		const [userRows] = await db.execute(
			`SELECT
				id
			FROM
				users
			WHERE
				verification_token = ?`,
			[req.cookies.authToken]
		);

		if (userRows.length === 0)
			return res.status(401).json({
				success: false,
				message: 'Session invalide. Veuillez vous reconnecter.'
			});

		const userId = userRows[0].id;
		const photoId = req.params.id;

		// Vérifie si la photo existe
		const [photos] = await db.execute(
			`SELECT
				*
			FROM
				photos
			WHERE
				id = ?`,
			[photoId]);

		if (photos.length === 0)
			return res.status(404).json({
				success: false,
				message: 'Photo non trouvée'
			});

		// Vérifie si l'utilisateur a liké la photo
		const [existingLikes] = await db.execute(
			`SELECT
				*
			FROM
				likes
			WHERE
				photo_id = ? AND user_id = ?`,
			[photoId, userId]
		);

		if (existingLikes.length === 0)
			return res.status(400).json({
				success: false,
				message: 'Vous n\'avez pas liké cette photo'
			});

		// Supprime le like
		await db.execute(
			`DELETE FROM
				likes
			WHERE
				photo_id = ? AND user_id = ?`,
			[photoId, userId]
		);

		// Récupère le nouveau nombre de likes
		const [likeResult] = await db.execute(
			`SELECT
				COUNT(*) AS like_count
			FROM
				likes
			WHERE
				photo_id = ?`,
			[photoId]
		);

		const likeCount = likeResult[0].like_count;

		res.json({
			success: true,
			is_liked: false,
			like_count: likeCount,
			message: 'Like retiré avec succès'
		});
	}
	catch (error)
	{
		console.error('Erreur lors de la suppression du like:', error);
		res.status(500).json({
			success: false,
			message: 'Erreur lors de la suppression du like'
		});
	}
}

// Ajoute un commentaire à une photo
async function addComment(req, res)
{
	try
	{
		// Vérifie si l'utilisateur est authentifié
		if (!req.cookies.authToken)
			return res.status(401).json({
				success: false,
				message: 'Vous devez être connecté pour commenter une photo'
			});

		// Récupère l'ID de l'utilisateur
		const [userRows] = await db.execute(
			`SELECT
				id
			FROM
				users
			WHERE
				verification_token = ?`,
			[req.cookies.authToken]
		);

		if (userRows.length === 0)
			return res.status(401).json({
				success: false,
				message: 'Session invalide. Veuillez vous reconnecter.'
			});

		const userId = userRows[0].id;
		const photoId = req.params.id;
		const { commentText } = req.body;

		if (!commentText || commentText.trim() === '')
			return res.status(400).json({
				success: false,
				message: 'Le commentaire ne peut pas être vide'
			});

		// Vérifie si la photo existe et récupère les infos du propriétaire
		const [photos] = await db.execute(`
			SELECT
				p.*,
				u.id AS owner_id,
				u.username AS owner_username,
				u.email AS owner_email,
				u.email_notifications
			FROM
				photos p
			JOIN
				users u ON p.user_id = u.id
			WHERE
				p.id = ?
		`, [photoId]);

		if (photos.length === 0)
			return res.status(404).json({
				success: false,
				message: 'Photo non trouvée'
			});

		const photo = photos[0];

		// Ajoute le commentaire
		const [result] = await db.execute(
			`INSERT INTO
				comments (photo_id, user_id, comment_text)
			VALUES
				(?, ?, ?)`,
			[photoId, userId, commentText]
		);

		const commentId = result.insertId;

		// Récupère les informations de l'utilisateur qui commente
		const [users] = await db.execute(`
			SELECT
				u.username,
				a.file_path AS avatar_path
			FROM
				users u
			LEFT JOIN
				avatars a ON u.avatar_id = a.id
			WHERE
				u.id = ?
		`, [userId]);

		const user = users[0];

		// Envoie une notification par email au propriétaire de la photo si les notifications sont activées
		if (photo.owner_id !== userId && photo.email_notifications)
		{
			const emailSent = await emailService.sendCommentNotification(
				photo.owner_email,
				user.username,
				photo.owner_username
			);

			console.log(`Email de notification envoyé au propriétaire: ${emailSent ? 'Succès' : 'Échec'}`);
		}

		// Retourne le commentaire créé
		res.json({
			success: true,
			message: 'Commentaire ajouté avec succès',
			comment: {
				id: commentId,
				comment_text: commentText,
				created_at: new Date().toISOString(),
				username: user.username,
				avatar_path: user.avatar_path
			}
		});
	}
	catch (error)
	{
		console.error('Erreur lors de l\'ajout du commentaire:', error);
		res.status(500).json({
			success: false,
			message: 'Erreur lors de l\'ajout du commentaire'
		});
	}
}

module.exports = {
	getPhotos,
	getPhotoComments,
	likePhoto,
	unlikePhoto,
	addComment
};
