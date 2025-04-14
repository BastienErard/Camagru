//##############################################################################################\\
//																							  \\
//	Auteur		: 	Bastien Erard															  \\
//	Version		: 	1.0																		  \\
//	Créé le		: 	29.01.2025																  \\
//	Modifié le	:	15.02.2025																  \\
//	But			:	Gère tous les éléments liés à la connexion / déconnexion					  \\
//																							  \\
//##############################################################################################\\

// Configuration de l'API et des options fetch
const API_URL = 'http://localhost:3000/api/auth';
const fetchOptions = {
	headers: {
		'Content-Type': 'application/json'
	},
	credentials: 'include'
};

// Etat global de l'authentification
window.authState = {
	isAuthenticated: false,
	user: null
}

// Fonction au chargement de la page qui vérifie si l'utilisateur est connecté
async function	checkAuthStatus()
{
	try
	{
		const response = await fetch(`${API_URL}/status`, {
			method: 'GET',
			...fetchOptions
		});

		if (!response.ok)
			throw new Error('Erreur réseau');

		const data = await response.json();
		authState.isAuthenticated = data.isAuthenticated;
		authState.user = data.user;

		updateUI();
	}
	catch (error)
	{
		console.error('Erreur de vérification:', error)
		updateUI();
	}
}

// Met à jour l'interface selon l'état d'authentification
function	updateUI()
{
	const menuDiv = document.getElementById('menu');

	if (authState.isAuthenticated && authState.user)
	{
		menuDiv.innerHTML = `
			<div class="d-flex align-items-center">
				<a href="/gallery" class="btn btn-outline-light me-3">Galerie</a>
				<a href="/editing" class="btn btn-outline-light me-3">Edition</a>
				<div class="dropdown">
					<button class="btn btn-outline-light dropdown-toggle" type="button" id="userMenu" data-bs-toggle="dropdown" aria-expanded="false">
						<img src="${authState.user.avatar}"
							alt="Avatar"
							class="rounded-circle me-2"
							style="width: 30px; height: 30px;">
						Bienvenue ${authState.user.username}
					</button>
					<ul class="dropdown-menu dropdown-menu-end" aria-labelledby="userMenu">
						<li><a class="dropdown-item" href="/profile">Profil</a></li>
						<li><hr class="dropdown-divider"></li>
						<li><a class="dropdown-item" href="#" onclick="logout()">Se déconnecter</a></li>
					</ul>
				</div>
			</div>`;
	}
	else
	{
		menuDiv.innerHTML = `
			<button class="btn btn-outline-light" type="button" onclick="window.location.href='/login'">
				Se connecter
			</button>`;
	}
}

// Fonction de déconnexion
async function	logout()
{
	try
	{
		const response = await fetch(`${API_URL}/logout`, {
			method: 'POST',
			...fetchOptions
		});

		if (!response.ok)
			throw new Error('Erreur de déconnexion');

		authState.isAuthenticated = false;
		authState.user = null;
		window.location.href = '/';
	}
	catch (error)
	{
		console.error('Erreur de déconnexion:', error);
	}
}

// Variables pour stocker les timers des messages
let errorMessageTimerAuth = null;
let successMessageTimerAuth = null;

// Fonction pour cacher tous les messages
function	hideAllMessages()
{
	// Effacer les timers existants
	if (errorMessageTimerAuth)
	{
		clearTimeout(errorMessageTimerAuth);
		errorMessageTimerAuth = null;
	}
	if (successMessageTimerAuth)
	{
		clearTimeout(successMessageTimerAuth);
		successMessageTimerAuth = null;
	}

	// Cacher les messages
	const errorMessage = document.getElementById('errorMessage');
	const successMessage = document.getElementById('successMessage');

	if (errorMessage)
		errorMessage.classList.add('d-none');
	if (successMessage)
		successMessage.classList.add('d-none');
}

// Fonction pour afficher les messages d'erreur
function showError(message)
{
	hideAllMessages();

	const errorMessage = document.getElementById('errorMessage');
	errorMessage.textContent = message;
	errorMessage.classList.remove('d-none');

	// Définir un nouveau timer
	errorMessageTimerAuth = setTimeout(function() {
		errorMessage.classList.add('d-none');
		errorMessageTimerAuth = null;
	}, 5000);
}

// Fonction pour afficher les messages de succès
function showSuccess(message)
{
	hideAllMessages();

	const successMessage = document.getElementById('successMessage');
	successMessage.textContent = message;
	successMessage.classList.remove('d-none');

	successMessageTimerAuth = setTimeout(function() {
		successMessage.classList.add('d-none');
		successMessageTimerAuth = null;
	}, 5000);
}

// Valide la présence ou non des données dans les champs du login
function	validateForm(username, password)
{
	if (!username || !password)
	{
		showError('Veuillez remplir tous les champs');
		return false;
	}
	return true;
}

// Hache le mot de passe avant envoi
async function	hashPassword(password)
{
	// Crée un encodeur pour convertir la chaîne en bytes
	const encoder = new TextEncoder();

	// Convertit le mot de passe en tableau de bytes
	const data = encoder.encode(password);

	// Applique l'algorithme SHA-256 sur les bytes (chaîne de 256 bits (64 caractères hexadécimaux))
	const hash = await crypto.subtle.digest('SHA-256', data);

	// Convertit le hash en chaîne hexadécimale
	return Array.from(new Uint8Array(hash))
		.map(b => b.toString(16).padStart(2, '0'))
		.join('');
}

// Gère la soumission du formulaire de connexion
async function	handleLogin(event)
{
	event.preventDefault();

	const username = document.getElementById('username').value.trim();
	const password = document.getElementById('password').value;

	if (!validateForm(username, password))
		return;

	try
	{
		// Hachage du mot de passe avant envoi
		const hashedPassword = await hashPassword(password);

		const response = await fetch(`${API_URL}/login`, {
			method: 'POST',
			...fetchOptions,
			body: JSON.stringify({
				username: username,
				password: hashedPassword
			})
		});

		const data = await response.json();

		if (data.success)
		{
			authState.isAuthenticated = true;
			authState.user = data.user;
			window.location.href = '/';
		}
		else
		{
			showError('Nom d\'utilisateur et/ou mot de passe incorrect');
			return;
		}
	}
	catch (error)
	{
		console.error('Erreur lors de la connexion');
		showError('Une erreur est survenue. Veuillez réessayer.');
	}
}

// Valide le format des différentes entrées (format, complexité, présence dans les champs,...)
function	valideRegisterForm(username, email, password, confirmPassword)
{
	// Vérifie que tous les champs sont remplis
	if (!username || !email || !password || !confirmPassword)
	{
		showError('Veuillez remplir tous les champs');
		return false;
	}

	// Validation du format de l'email
	const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
	if (!emailRegex.test(email))
	{
		showError('Format d\'email invalide');
		return false;
	}

	// Validation de la longueur du nom d'utilisateur
	if (username.length < 3 || username.length > 20)
	{
		showError('Le nom d\'utilisateur doit contenir entre 3 et 20 caractères');
		return false;
	}

	// Validation du format du nom d'utilisateur
	const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
	if (!usernameRegex.test(username))
	{
		showError('Le nom d\'utilisateur ne doit contenir que des lettres, chiffres, tirets et underscores');
		return false;
	}

	// Validation de la longueur du mot de passe
	if (password.length < 8 || password.length > 30)
	{
		showError('Le mot de passe doit contenir entre 8 et 30 caractères');
		return false;
	}

		// Validation de la complexité du mot de passe
	const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]+$/;
	if (!passwordRegex.test(password))
	{
		showError('Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre');
		return false;
	}

	// Vérifie que les mots de passe correspondent
	if (password !== confirmPassword)
	{
		showError('Les mots de passe ne correspondent pas');
		return false;
	}

	return true;
}

// Gère l'évènement relatif à la création d'un compte sur le site
async function handleRegister(event)
{
	event.preventDefault();

	const username = document.getElementById('username').value.trim();
	const email = document.getElementById('email').value.trim();
	const password = document.getElementById('password').value;
	const confirmPassword = document.getElementById('confirmPassword').value;

	if (!valideRegisterForm(username, email, password, confirmPassword))
		return;

	try
	{
		const hashedPassword = await hashPassword(password);

		const response = await fetch(`${API_URL}/register`, {
			method: 'POST',
			...fetchOptions,
			body: JSON.stringify({
				username: username,
				email: email,
				password: hashedPassword
			})
		});

		const data = await response.json();

		if (data.success)
			window.location.href = data.redirect;
		else
			showError(data.message);
	}
	catch (error)
	{
		showError('Une erreur est survenue. Veuillez réessayer.');
	}
}

// Fonction gérant la demande de réinitialisation de mot de passe
async function	handlePasswordResetRequest(event)
{
	event.preventDefault();

	const email = document.getElementById('email').value.trim();

	// Validation du format de l'email
	const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
	if (!email || !emailRegex.test(email))
	{
		showError('Format d\'email invalide');
		return;
	}

	try
	{
		const response = await fetch(`${API_URL}/request-reset`, {
			method: 'POST',
			...fetchOptions,
			body: JSON.stringify({
				email: email
			})
		});

		const data = await response.json();

		if (data.success)
		{
			document.getElementById('email').value = '';
			showSuccess('Un e-mail de réinitialisation a été envoyé à votre adresse si elle est associée à un compte.');
		}
		else
			showError(data.message || 'Une erreur est survenue. Veuillez réessayer.');
	}
	catch (error)
	{
		console.error('Erreur lors de la demande de réinitialisation:', error);
		showError('Une erreur est survenue. Veuillez réessayer.');
	}
}

// Fonction pour valider le nouveau mot de passe
function validateNewPassword(password, confirmPassword)
{

	if (!password || !confirmPassword)
	{
		showError('Veuillez remplir tous les champs');
		return false;
	}
	// Validation de la longueur du mot de passe
	if (password.length < 8 || password.length > 30)
	{
		showError('Le mot de passe doit contenir entre 8 et 30 caractères');
		return false;
	}

		// Validation de la complexité du mot de passe
	const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]+$/;
	if (!passwordRegex.test(password))
	{
		showError('Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre');
		return false;
	}

	// Vérifie que les mots de passe correspondent
	if (password !== confirmPassword)
	{
		showError('Les mots de passe ne correspondent pas');
		return false;
	}

	return true;
}

// Fonction pour gérer la réinitialisation du mot de passe
async function handlePasswordReset(event)
{
	event.preventDefault();

	const token = document.getElementById('resetToken').value;
	const password = document.getElementById('newPassword').value;
	const confirmPassword = document.getElementById('confirmNewPassword').value;

	if (!validateNewPassword(password, confirmPassword))
		return;

	try
	{
		const hashedPassword = await hashPassword(password);

		const response = await fetch(`${API_URL}/reset-password`, {
			method: 'POST',
			...fetchOptions,
			body: JSON.stringify({
				token: token,
				password: hashedPassword
			})
		});

		const data = await response.json();

		if (data.success)
		{
			showSuccess('Votre mot de passe a été réinitialisé avec succès. Vous allez être redirigé vers la page de connexion.');
			setTimeout(() => {
				window.location.href = '/login';
			}, 3000);
		}
		else
			showError(data.message || 'Une erreur est survenue. Veuillez réessayer.');
	}
	catch (error)
	{
		console.error('Erreur lors de la réinitialisation du mot de passe:', error);
		showError('Une erreur est survenue. Veuillez réessayer.');
	}
}

// Fonction vérifiant la présence d'un token de réinitialisation dans l'URL
function	checkResetToken()
{
	const urlParams = new URLSearchParams(window.location.search);
	const token = urlParams.get('token');
	const error = urlParams.get('error');

	if (window.location.pathname === '/reset-password')
	{
		if (token)
		{
			// Afficher le formulaire de réinitialisation
			document.getElementById('requestResetForm').classList.add('d-none');
			document.getElementById('resetPasswordForm').classList.remove('d-none');
			document.getElementById('resetToken').value = token;
		}
		else if (error)
			showError(decodeURIComponent(error));
	}
}

// Initialisation des écouteurs d'événements
document.addEventListener('DOMContentLoaded', function() {
	checkAuthStatus();
	checkResetToken();

	const loginForm = document.getElementById('loginForm');
	if (loginForm)
		loginForm.addEventListener('submit', handleLogin);

	const registerForm = document.getElementById('registerForm');
	if (registerForm)
		registerForm.addEventListener('submit', handleRegister);

	const passwordResetRequestForm = document.getElementById('passwordResetRequestForm');
	if (passwordResetRequestForm)
		passwordResetRequestForm.addEventListener('submit', handlePasswordResetRequest);

	const newPasswordForm = document.getElementById('newPasswordForm');
	if (newPasswordForm)
		newPasswordForm.addEventListener('submit', handlePasswordReset);

	// Vérification des paramètres d'URL pour les messages de vérification d'email
	const urlParams = new URLSearchParams(window.location.search);
	const verification = urlParams.get('verification');
	const message = urlParams.get('message');

	if (verification && message && document.querySelector('form'))
	{
		const alertDiv = document.createElement('div');
		alertDiv.className = (verification === 'success' || verification === 'pending')
			? 'alert alert-success'
			: 'alert alert-danger';
		alertDiv.textContent = decodeURIComponent(message);

		// Insérer l'alerte au début du formulaire
		const form = document.querySelector('form');
		form.parentNode.insertBefore(alertDiv, form);
	}
});

window.updateUI = updateUI;
window.checkAuthStatus = checkAuthStatus;
