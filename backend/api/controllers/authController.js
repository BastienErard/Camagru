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
const crypto = require('crypto');

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
		console.error('Erreur serveur détaillée:', error);
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
		console.error('Erreur serveur détaillée:', error);
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

	// // Validation de la longueur du mot de passe
	// if (password.length < 8 || password.length > 30)
	// 	return false;

	// 	// Validation de la complexité du mot de passe
	// const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]+$/;
	// if (!passwordRegex.test(password))
	// 	return false;

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

		return res.json({
			success: true,
			message: 'Compte créé avec succès. Veuillez vérifier votre email pour activer votre compte.'
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

exports.checkStatus = checkStatus;
exports.logout = logout;
exports.login = login;
exports.register = register;
