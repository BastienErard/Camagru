//##############################################################################################\\
//																							  \\
//	Auteur		: 	Bastien Erard															  \\
//	Version		: 	1.0																		  \\
//	Créé le		: 	24.02.2025																  \\
//	Modifié le	:	24.02.2025																  \\
//	But			:	Gestion de l'envoi des emails											  \\
//																							  \\
//##############################################################################################\\

const {exec} = require('child_process');

async function	sendVerificationEmail(email, username, token)
{
	const 	verificationUrl = `http://localhost:${process.env.FRONTEND_PORT}/verify/${token}`;
	const 	emailContent= `
		To: ${email}
		From: no-reply@camagru.com
		Subject: Vérification de votre compte Camagru

		Bonjour ${username},

		Pour activer votre compte, veuillez cliquer sur le lien suivant :
		${verificationUrl}

		Ce lien expire dans 24 heures.
		`;

	return new Promise(function(resolve)
	{
		// Exécute la commande shell pour envoyer l'email
		const 	sendMail = exec(`echo "${emailContent}" | sendmail -t`);

		// Quand la commande est terminée
		sendMail.on('close', function(code) {
			resolve(code === 0);
		});

		sendMail.on('error', function(error) {
			console.error('Erreur sendmail:', error);
			resolve(false);
		});
	});
}

exports.sendVerificationEmail = sendVerificationEmail;
