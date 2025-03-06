//##############################################################################################\\
//																								\\
//	Auteur		: 	Bastien Erard																\\
//	Version		: 	1.0																			\\
//	Créé le		: 	27.02.2025																	\\
//	Modifié le	:	27.02.2025																	\\
//	But			:	Service de nettoyage des tokens expirés										\\
//																								\\
//##############################################################################################\\

const db = require('./database');

// Nettoie les tokens de vérifications expirés (délai fixé à 24h)
async function	cleanExpiredVerifTokens()
{
	try
	{
		const [result] = await db.execute(`
			UPDATE
				users
			SET
				verification_token = NULL
			WHERE
				is_verified = FALSE AND created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR) AND verification_token IS NOT NULL
			`);

		if (result.affectedRows > 0)
				console.log(`${result.affectedRows} tokens de vérification expirés ont été supprimés.`);
	}
	catch (error)
	{
		console.error('Erreur lors du nettoyage des tokens expirés:', error);
	}
}

// Nettoie les tokens de session inactifs (délai fixé à 24h)
async function cleanInactiveSessionTokens()
{
	try
	{
		const [result] = await db.execute(`
			UPDATE
				users
			SET
				verification_token = NULL
			WHERE
				is_verified = TRUE AND last_activity < DATE_SUB(NOW(), INTERVAL 24 HOUR) AND verification_token IS NOT NULL
			`);
		if (result.affectedRows > 0)
			console.log(`${result.affectedRows} tokens de vérification expirés ont été supprimés.`);
	}
	catch (error)
	{
		console.error('Erreur lors du nettoyage des sessions inactives:', error);
	}
}

// Nettoie les tokens de réinitialisation (délai fixé à 01h00)
async function	cleanExpiredResetTokens()
{
	try
	{
		const [result] = await db.execute(`
			UPDATE
				users
			SET
				reset_token = NULL,
				reset_token_expires = NULL
			WHERE
				reset_token IS NOT NULL and reset_token_expires < NOW()
			`);
		if (result.affectedRows > 0)
			console.log(`${result.affectedRows} tokens de réinitialisation expirés ont été supprimés.`);
	}
	catch (error)
	{
		console.error('Erreur lors du nettoyage des tokens de réinitialisation expirés:', error);
	}
}
exports.cleanExpiredVerifTokens = cleanExpiredVerifTokens;
exports.cleanInactiveSessionTokens = cleanInactiveSessionTokens;
exports.cleanExpiredResetTokens = cleanExpiredResetTokens;
