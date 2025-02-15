//##############################################################################################\\
//																								\\
//	Auteur		: 	Bastien Erard																\\
//	Version		: 	1.0																			\\
//	Créé le		: 	29.01.2025																	\\
//	Modifié le	:	13.02.2025																	\\
//	But			:	Gère les différentes fonctions liées à l'authentification					\\
//																								\\
//##############################################################################################\\

const db = require('../../services/database');
const crypto = require('crypto');

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
		console.error('Error in checkStatus', error);
		res.status(500).json({
			error: 'Erreur interne du serveur'
		});
	}
}

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
		console.error('Error in logout:', error);
		res.status(500).json({
			error: 'Erreur interne du serveur'
		});
	}
}

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
				avatars.file_path as avatar_path
			FROM
				users
			LEFT JOIN
				avatars ON users.avatar_id = avatars.id
			WHERE
				users.username = ? AND users.is_verified = TRUE`,
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
			.update(password)
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
			user: {
				username: user.username,
				avatar: user.avatar_path
			}
		});
	}
	catch (error)
	{
		return res.status(500).json({
			success: false,
			message: 'Erreur interne du serveur'
		});
	}
}

exports.checkStatus = checkStatus;
exports.logout = logout;
exports.login = login;
