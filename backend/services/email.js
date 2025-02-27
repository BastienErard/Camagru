//##############################################################################################\\
//																							  \\
//	Auteur		: 	Bastien Erard															  \\
//	Version		: 	1.0																		  \\
//	Créé le		: 	24.02.2025																  \\
//	Modifié le	:	24.02.2025																  \\
//	But			:	Gestion de l'envoi des emails											  \\
//																							  \\
//##############################################################################################\\

const nodemailer = require('nodemailer');

// Créer un transporteur SMTP
const transporter = nodemailer.createTransport({
	host: 'smtp.gmail.com',
	port: 587,
	secure: false,
	auth: {
		user: process.env.EMAIL_USER,
		pass: process.env.EMAIL_APP_PASSWORD
	}
});

async function sendVerificationEmail(email, username, token)
{
	const verificationUrl = `http://localhost:${process.env.BACKEND_PORT}/api/auth/verify/${token}`;

	try
	{
		const info = await transporter.sendMail({
			from: `"Camagru" <${process.env.EMAIL_USER}>`,
			to: email,
			subject: 'Vérification de votre compte Camagru',
			text: `Bonjour ${username},

			Pour activer votre compte, veuillez cliquer sur le lien suivant :
			${verificationUrl}

			Ce lien expire dans 24 heures.`,
					html: `<p>Bonjour ${username},</p>
					<p>Pour activer votre compte, veuillez cliquer sur le lien suivant :</p>
					<p><a href="${verificationUrl}" style="display: inline-block; background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Valider mon compte</a></p>
					<p>Ce lien expire dans 24 heures.</p>`
				});

		console.log('Email envoyé: %s', info.messageId);
		return true;
	}
	catch (error)
	{
		console.error('Erreur lors de l\'envoi de l\'email:', error);
		return false;
	}
}

exports.sendVerificationEmail = sendVerificationEmail;
