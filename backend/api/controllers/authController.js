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

exports.checkStatus = checkStatus;
exports.logout = logout;
