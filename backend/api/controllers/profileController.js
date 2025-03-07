//##############################################################################################\\
//																								\\
//	Auteur		: 	Bastien Erard																\\
//	Version		: 	1.0																			\\
//	Créé le		: 	05.03.2025																	\\
//	Modifié le	:	05.03.2025																	\\
//	But			:	Gère les différentes fonctions liées au profil								\\
//																								\\
//##############################################################################################\\

const db = require('../../services/database');
const crypto = require('crypto');

// Fonction pour obtenir les informations du profil utilisateur
async function getUserProfile(req, res)
{
	try
	{
		const authToken = req.cookies.authToken;

		if (!authToken)
		{
			return res.status(401).json({
				success: false,
				message: 'Non authentifié'
			})
		}

		const [userData] = await db.execute(
			`SELECT
				users.username,
				users.email,
				users.email_notifications AS emailNotifications,
				users.avatar_id AS avatarId,
				avatars.file_path AS avatar
			FROM
				users
			LEFT JOIN
				avatars ON users.avatar_id = avatars.id
			WHERE
				users.verification_token = ? AND users.is_verified = TRUE`,
			[authToken]
		);

		if (!userData[0])
		{
			return res.status(401).json({
				success: false,
				message: 'Utilisateur introuvable'
			});
		}

		return res.json({
			success: true,
			user: userData[0]
		});
	}
	catch (error)
	{
		console.error('Erreur lors de la récupération du profil:', error);
		return res.status(500).json({
			success: false,
			message: 'Erreur lors de la récupération du profil'
		});
	}
}

// Fonction pour récupérer les différents avatars disponibles
async function getAvatars(req, res)
{
	try
	{
		const [avatars] = await db.execute(
			`SELECT
				id,
				name,
				file_path
			FROM
				avatars
			ORDER BY
				id`
		);

		return res.json({
			success: true,
			avatars: avatars
		});
	}
	catch (error)
	{
		console.error('Erreur lors de la récupération des avatars:', error);
		return res.status(500).json({
			success: false,
			message: 'Erreur lors de la récupération des avatars'
		});
	}
}

// Fonction pour mettre à jour le profil de l'utilisateur
async function updateProfile(req, res)
{
	try
	{
		const authToken = req.cookies.authToken;
		const {username, email, emailNotifications, avatarId} = req.body;

		if (!authToken)
		{
			return res.status(401).json({
				success: false,
				message: 'Non authentifié'
			});
		}

		const [currentUser] = await db.execute(
			`SELECT
				id,
				username,
				email
			FROM
				users
			WHERE
				verification_token = ?`,
			[authToken]
		);

	const userId = currentUser[0].id;

	// Vérifie si le nom d'utilisateur est libre
	if (username !== currentUser[0].username)
	{
		const [existingUsername] = await db.execute(
			`SELECT
				id
			FROM
				users
			WHERE
				LOWER(username) = LOWER(?) AND id != ?`,
			[username.toLowerCase(), userId]
		);

		if (existingUsername.length > 0)
		{
			return res.json({
				success: false,
				message: 'Ce nom d\'utilisateur est déjà utilisé'
			});
		}
	}


	// Vérifie si l'e-mail est libre
	if (email !== currentUser[0].email)
	{
		const [existingEmail] = await db.execute(
			`SELECT
				id
			FROM
				users
			WHERE
				LOWER(email) = LOWER(?) AND id != ?`,
			[email.toLowerCase(), userId]
		);

		if (existingEmail.length > 0)
		{
			return res.json({
				success: false,
				message: 'Cette adresse email est déjà utilisée'
			});
		}
	}

	// Mise à jour du profil utilisateur
	await db.execute(
		`UPDATE
			users
		SET
			username = ?,
			email = ?,
			email_notifications = ?,
			avatar_id = ?
		WHERE
			id = ?`,
		[username, email, emailNotifications ? 1 : 0, avatarId, userId]
	);

	// Récupère les informations mises à jour et renvoie celles-ci sur le front
	const [updateUser] = await db.execute(
		`SELECT
			users.id,
			users.username,
			users.email,
			users.email_notifications AS emailNotifications,
			users.avatar_id AS avatarId,
			avatars.file_path AS avatar
		FROM
			users
		LEFT JOIN
			avatars ON users.avatar_id = avatars.id
		WHERE
			users.id = ?`,
		[userId]
	);

	return res.json({
		success: true,
		message: 'Profil mis à jour avec succès',
		user: updateUser[0]
	});
	}
	catch (error)
	{
		console.error('Erreur lors de la mise à jour du profil:', error);
		return res.status(500).json({
			success: false,
			message: 'Erreur lors de la mise à jour du profil'
		});
	}
}

// Fonction pour modifier le mot de passe
async function	changePassword(req, res)
{
	try
	{
		const authToken = req.cookies.authToken;
		const {currentPassword, newPassword} = req.body;

		if (!authToken)
		{
			return res.status(401).json({
				success: false,
				message: 'Non authentifié'
			});
		}

		// Récupère l'utilisateur
		const [users] = await db.execute(
			`SELECT
				id,
				password,
				salt
			FROM
				users
			WHERE
				verification_token = ?`,
			[authToken]
		);

		if (users.length === 0)
		{
			return res.status(401).json({
				success: false,
				message: 'Utilisateur non trouvé'
			});
		}

		const user = users[0];

		const hashedCurrentPassword = crypto.createHash('sha256')
			.update(currentPassword + user.salt)
			.digest('hex');

		if (hashedCurrentPassword !== user.password)
		{
			return res.json({
				success: false,
				message: 'Mot de passe actuel incorrect'
			});
		}

		const hashedNewPassword = crypto.createHash('sha256')
			.update(newPassword + user.salt)
			.digest('hex');

		// Vérifie que le nouveau mdp est différent du précédent
		if (hashedNewPassword === user.password)
		{
			return res.json({
				success: false,
				message: 'Le nouveau mot de passe doit être différent de l\'ancien'
			});
		}

		await db.execute(
			`UPDATE
				users
			SET
				password = ?
			WHERE
				id = ?`,
			[hashedNewPassword, user.id]
		);

		return res.json({
			success: true,
			message: 'Mot de passe modifié avec succès'
		})
	}
	catch (error)
	{
		console.error('Erreur lors du changement de mot de passe:', error);
		return res.status(500).json({
			success: false,
			message: 'Erreur lors du changement de mot de passe'
		});
	}
}

// Fonction pour supprimer son compte
async function deleteAccount(req, res)
{
	try
	{
		const authToken = req.cookies.authToken;
		const {username, password} = req.body;

		if (!authToken) {
			return res.status(401).json({
				success: false,
				message: 'Non authentifié'
			});
		}

		const [users] = await db.execute(
			`SELECT
				id,
				username,
				password,
				salt
			FROM
				users
			WHERE
				verification_token = ?`,
			[authToken]
		);

		if (users.length === 0)
		{
			return res.status(401).json({
				success: false,
				message: 'Utilisateur non trouvé'
			});
		}

		const user = users[0];

		// Vérifier que le nom d'utilisateur correspond
		if (user.username !== username)
		{
			return res.json({
				success: false,
				message: 'Nom d\'utilisateur incorrect'
			});
		}

		// Vérifier que le mot de passe correspond
		const hashedPassword = crypto.createHash('sha256')
		.update(password + user.salt)
		.digest('hex');

		if (hashedPassword !== user.password)
		{
			return res.json({
				success: false,
				message: 'Mot de passe incorrect'
			});
		}

		// Supprime l'utilisateur et toutes les données affiliées
		await db.execute(
			`DELETE FROM
				users
			WHERE
				id = ?`,
			[user.id]
		);

		// Supprimer le cookie d'authentification
		res.clearCookie('authToken', {
			httpOnly: true,
			sameSite: 'lax'
		});

		return res.json({
			success: true,
			message: 'Compte supprimé avec succès'
		});
	}
	catch (error)
	{
		console.error('Erreur lors de la suppression du compte:', error);
		return res.status(500).json({
			success: false,
			message: 'Erreur lors de la suppression du compte'
		});
	}
}

exports.getUserProfile = getUserProfile;
exports.getAvatars = getAvatars;
exports.updateProfile = updateProfile;
exports.changePassword = changePassword;
exports.deleteAccount = deleteAccount;
