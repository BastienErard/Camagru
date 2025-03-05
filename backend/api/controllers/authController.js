//##############################################################################################\\
//																								\\
//	Auteur		: 	Bastien Erard																\\
//	Version		: 	1.0																			\\
//	Créé le		: 	29.01.2025																	\\
//	Modifié le	:	19.02.2025																	\\
//	But			:	Gère les différentes fonctions liées à l'authentification					\\
//																								\\
//##############################################################################################\\

const db = require('../../services/database');
const emailService = require('../../services/email');
const crypto = require('crypto');

// Mets à jour la dernière activité
async function updateUserActivity(authToken)
{
	try
	{
		await db.execute(`
			UPDATE
				users
			SET
				last_activity = CURRENT_TIMESTAMP
			WHERE
				verification_token = ?`,
			[authToken]
			);
	}
	catch (error)
	{
		console.error('Erreur lors de la mise à jour de l\'activité:', error);
	}
}

// Vérifie si l'utilisateur est connecté ou non
async function 	checkStatus(req, res)
{
	try
	{
		const authToken = req.cookies.authToken;

		if (!authToken)
		{
			return res.json({
				isAuthenticated: false,
				user: null
			});
		}

		const [userData] = await db.execute(
			`SELECT
				users.username,
				avatars.file_path as avatar_path
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
			res.clearCookie('authToken');
			return res.json({
				isAuthenticated: false,
				user: null
			});
		}

		await updateUserActivity(authToken);

		return res.json({
			isAuthenticated: true,
			user: {
				username: userData[0].username,
				avatar: userData[0].avatar_path
			}
		});
	}
	catch (error)
	{
		console.error('Erreur lors de la vérification:', error);
		return res.status(500).json({
			success: false,
			message: 'Un problème technique est survenu. Veuillez réessayer plus tard.'
		});
	}
}

// Fonction pour se déconnecter
async function	logout(req, res)
{
	try
	{
		const authToken = req.cookies.authToken;

		if (authToken)
		{
			await db.execute(
				`UPDATE users SET verification_token = NULL where verification_token = ?`,
				[authToken]
			);

			res.clearCookie('authToken', {
				httpOnly: true,
				sameSite: 'lax'
			});
		}
		return res.json({success: true});
	}
	catch (error)
	{
		console.error('Erreur lors de la vérification:', error);
		return res.status(500).json({
			success: false,
			message: 'Un problème technique est survenu. Veuillez réessayer plus tard.'
		});
	}
}

// Fonction lorsqu'un utilisateur veut se log
async function login(req, res)
{
	try
	{
		const {username, password} = req.body;

		// Vérification de l'existence des champs
		if (!username || !password)
		{
			return res.status(400).json({
				success: false,
				message: 'Tous les champs sont requis'
			});

		}

		// Récupération de l'utilisateur et de son avatar
		const [users] = await db.execute(
			`SELECT
				users.id,
				users.username,
				users.password,
				users.salt,
				avatars.file_path as avatar_path
			FROM
				users
			LEFT JOIN
				avatars ON users.avatar_id = avatars.id
			WHERE
				LOWER(users.username) = LOWER(?) AND users.is_verified = TRUE`,
			[username]
		);

		// Vérification de l'existence d'un utilisateur et envoi d'un message d'erreur si ce n'est pas le cas
		if (users.length === 0)
		{
			return res.json({
				success: false,
				message: 'Identifiants incorrects'
			});
		}

		const user = users[0];

		// Application du même hachage que côté client pour comparaison
		const hashedPassword = crypto.createHash('sha256')
			.update(password + user.salt)
			.digest('hex');

		// Vérification du mot de passe
		if (hashedPassword !== user.password)
		{
			return res.json({
				success: false,
				message: 'Identifiants incorrects'
			});
		}

		// Génération du token de session
		const sessionToken = crypto.randomBytes(32).toString('hex');

		// Insertion du token dans la db
		await db.execute(
			`UPDATE
				users
			SET
				verification_token = ? WHERE id = ?`,
			[sessionToken, user.id]
		);

		// Envoi du cookie
		res.cookie('authToken', sessionToken, {
			httpOnly: true,
			sameSite: 'lax'
		});

		// Envoi de la réponse
		return res.json({
			success: true,
			message: 'Connexion réussie',
			user: {
				username: user.username,
				avatar: user.avatar_path
			}
		});
	}
	catch (error)
	{
		console.error('Erreur serveur détaillée:', error);
		return res.status(500).json({
			success: false,
			message: 'Un problème technique est survenu. Veuillez réessayer plus tard.'
		});
	}
}

// Valide le format des différentes entrées (format, complexité, présence dans les champs,...)
function	valideRegisterForm(username, email, password)
{
	// Vérifie que tous les champs sont remplis
	if (!username || !email || !password)
		return false;

	// Validation du format de l'email
	const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
	if (!emailRegex.test(email))
		return false;

	// Validation de la longueur du nom d'utilisateur
	if (username.length < 3 || username.length > 20)
		return false;

	// Validation du format du nom d'utilisateur
	const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
	if (!usernameRegex.test(username))
		return false;

	return true;
}

// Fonction pour enregistrer un nouvel utilisateur
async function	register(req, res)
{
	try
	{
		const {username, email, password} = req.body;

		// Vérification de l'existence des champs
		if (!valideRegisterForm(username, email, password))
			{
			return res.status(400).json({
				success: false,
				message: 'Erreur dans la saisie des données de l`utilisateur'
			});
		}

		// Création des versions minuscules pour la comparaison
		const lowercaseUsername = username.toLowerCase();
		const lowercaseEmail = email.toLowerCase();

		const [existingUsers] = await db.execute(
			`SELECT
				username,
				email
			FROM
				users
			WHERE
				LOWER(username) = ? OR LOWER(email) = ?`,
			[lowercaseUsername, lowercaseEmail]
		);

		if (existingUsers.length > 0)
		{
			const user = existingUsers[0];
			if (user.username.toLowerCase() === lowercaseUsername)
			{
				return res.json({
					success: false,
					message: 'Ce nom d\'utilisateur est déjà utilisé'
				});
			}
			if (user.email.toLowerCase() === lowercaseEmail)
			{
				return res.json({
					success: false,
					message: 'Cette adresse email est déjà utilisée'
				});
			}
		}

		// Génération d'un sel unique pour le compte créé
		const salt = crypto.randomBytes(16).toString('hex');

		// Combinaison du mot de passe déjà haché avec le sel et nouveau hachage
		const finalPassword = crypto.createHash('sha256')
			.update(password + salt)
			.digest('hex');

		// Génération du token de vérification
		const verificationToken = crypto.randomBytes(32).toString('hex');

		// Insertion du nouvel utilisateur
		const [result] = await db.execute(
			`INSERT INTO
				users (username, email, password, salt, verification_token, avatar_id)
			VALUES
				(?, ?, ?, ?, ?, 1)`,
			[username, email, finalPassword, salt, verificationToken]
		);

		const emailSent = await emailService.sendVerificationEmail(email, username, verificationToken);

		if (!emailSent)
			console.warn(`Échec de l'envoi de l'email à ${email}`);

		return res.json({
			success: true,
			message: 'Compte créé avec succès. Veuillez vérifier votre email pour activer votre compte.',
			redirect: '/login?verification=pending&message=Compte%20créé%20avec%20succès.%20Veuillez%20vérifier%20votre%20email%20pour%20activer%20votre%20compte.'
		});
	}
	catch (error)
	{
		console.error('Erreur lors de la création du compte:', error);
		return res.status(500).json({
			success: false,
			message: 'Erreur lors de la création du compte'
		});
	}
}

// Fonction vérifiant le token d'activation
async function	verifyAccount(req, res)
{
	try
	{
		const token = req.params.token;

		if (!token)
		{
			return res.status(400).json({
				success: false,
				message: 'Token de vérification manquant'
			});
		}

		// Vérifie si le token existe et n'est pas expiré (délai : 24h)
		const[user] = await db.execute(
			`SELECT
				id
			FROM
				users
			WHERE
				verification_token = ? AND is_verified = FALSE AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
			[token]
		);

		if (user.length === 0)
			return res.redirect(`http://localhost:${process.env.FRONTEND_PORT}/login?verification=failed&message=Token%20invalide%20ou%20expiré`);


		await db.execute(
			`UPDATE
				users
			SET
				is_verified = TRUE, verification_token = NULL
			WHERE
				id = ?`,
			[user[0].id]
		);

		return res.redirect(`http://localhost:${process.env.FRONTEND_PORT}/login?verification=success&message=Votre%20compte%20a%20été%20activé%20avec%20succès`);
	}
	catch (error)
	{
		console.error('Erreur lors de la vérification du compte:', error);
		return res.redirect(`http://localhost:${process.env.FRONTEND_PORT}/login?verification=error&message=Une%20erreur%20est%20survenue`);
	}
}

// Fonction permettant de demander une réinitialisation de mot de passe
async function requestPasswordReset(req, res)
{
	try
	{
		const email = req.body.email;

		if (!email)
		{
			return res.status(400).json({
				success: false,
				message: 'L\'adresse e-mail est requise'
			});
		}

		const lowercaseEmail = email.toLowerCase();

		const [users] = await db.execute(
			`SELECT
				id,
				username,
				email
			FROM
				users
			WHERE
				LOWER(email) = LOWER(?)`,
			[lowercaseEmail]
		);

		// Succés envoyé pour des raisons de sécurités
		if (users.length === 0)
		{
			return res.json({
				success: true,
				message: 'Si cette adresse e-mail est associée à un compte, vous recevrez un e-mail de réinitialisation.'
			});
		}

		const user = users[0];

		// Générer un token de réinitialisation
		const resetToken = crypto.randomBytes(32).toString('hex');

		await db.execute(
			`UPDATE
				users
			SET
				reset_token = ?, reset_token_expires = DATE_ADD(NOW(), INTERVAL 1 HOUR)
			WHERE
				id = ?`,
			[resetToken, user.id]
		);

		// Envoi d'un e-mail de réinitialisation
		await emailService.sendPasswordResetEmail(user.email, user.username, resetToken);

		return res.json({
			success: true,
			message: 'Si cette adresse e-mail est associée à un compte, vous recevrez un e-mail de réinitialisation.'
		});
	}
	catch (error)
	{
		console.error('Erreur lors de la demande de réinitialisation:', error);
		return res.status(500).json({
			success: false,
			message: 'Une erreur est survenue. Veuillez réessayer.'
		});
	}
}

// Fonction pour réinitialiser le mot de passe
async function resetPassword(req, res)
{
	try
	{
		const {token, password} = req.body;

		if (!token || !password)
		{
			return res.status(400).json({
				success: false,
				message: 'Token et mot de passe requis'
			});
		}

		const [users] = await db.execute(
			`SELECT
				id,
				salt,
				password AS old_password
			FROM
				users
			WHERE
				reset_token = ? AND reset_token_expires > NOW()`,
			[token]
		);

		if (users.length === 0)
		{
			return res.json({
				success: false,
				message: 'Token invalide ou expiré'
			});
		}

		const user = users[0];

		// Combiner le mot de passe déjà haché avec le sel et refaire un hachage
		const finalPassword = crypto.createHash('sha256')
			.update(password + user.salt)
			.digest('hex');

		// Vérifier si le nouveau mot de passe est identique à l'ancien
		if (finalPassword === user.old_password)
		{
			return res.json({
			success: false,
			message: 'Le nouveau mot de passe doit être différent de l\'ancien'
			});
		}

		// Mise à jour de la DB et suppression du token de réinitialisation
		await db.execute(
			`UPDATE
				users
			SET
				password = ?, reset_token = NULL, is_verified = TRUE, reset_token_expires = NULL
			WHERE
				id = ?`,
			[finalPassword, user.id]
		);

		return res.json({
			success: true,
			message: 'Mot de passe réinitialisé avec succès'
		});
	}
	catch (error)
	{
		console.error('Erreur lors de la réinitialisation du mot de passe:', error);
		return res.status(500).json({
			success: false,
			message: 'Une erreur est survenue. Veuillez réessayer.'
		});
	}
}

// Redirection suite au reset
async function resetPasswordRedirect(req, res)
{
	try
	{
		const token = req.params.token;

		if (!token)
			return res.redirect(`http://localhost:${process.env.FRONTEND_PORT}/reset-password?error=Token%20manquant`);

		// Vérifie si le token existe et est valide
		const [users] = await db.execute(
			`SELECT
				id
			FROM
				users
			WHERE
				reset_token = ? AND reset_token_expires > NOW()`,
			[token]
		);

		if (users.length === 0)
			return res.redirect(`http://localhost:${process.env.FRONTEND_PORT}/reset-password?error=Token%20invalide%20ou%20expiré`);

		return res.redirect(`http://localhost:${process.env.FRONTEND_PORT}/reset-password?token=${token}`);
	}
	catch (error)
	{
		console.error('Erreur lors de la redirection de réinitialisation:', error);
		return res.redirect(`http://localhost:${process.env.FRONTEND_PORT}/reset-password?error=Une%20erreur%20est%20survenue`);
	}
}

exports.checkStatus = checkStatus;
exports.logout = logout;
exports.login = login;
exports.register = register;
exports.verifyAccount = verifyAccount;
exports.requestPasswordReset = requestPasswordReset;
exports.resetPassword = resetPassword;
exports.resetPasswordRedirect = resetPasswordRedirect;
