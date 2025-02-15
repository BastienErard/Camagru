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
let authState = {
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

// Affiche un message d'erreur pendant 5 secondes sur la page de login
function	showError(message)
{
	const errorMessage = document.getElementById('errorMessage');
	errorMessage.textContent = message;
	errorMessage.classList.remove('d-none');

	setTimeout(function() {
		errorMessage.classList.add('d-none');
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
		console.log(password);
		// Hachage du mot de passe avant envoi
		const hashedPassword = await hashPassword(password);
		console.log(hashedPassword);

		const response = await fetch(`${API_URL}/login`, {
			method: 'POST',
			...fetchOptions,
			body: JSON.stringify({
				username: username,
				password: hashedPassword
			})
		});

		const data = await response.json();

		if (response.ok)
		{
			authState.isAuthenticated = true;
			authState.user = data.user;
			window.location.href = '/';
		}
		else
			showError('Nom d\'utilisateur et/ou mot de passe incorrect');
	}
	catch (error)
	{
		console.error('Erreur lors de la connexion');
		showError('Une erreur est survenue. Veuillez réessayer.');
	}
}

// Initialisation des écouteurs d'événements
document.addEventListener('DOMContentLoaded', function() {
	checkAuthStatus();

	const loginForm = document.getElementById('loginForm');
	if (loginForm)
		loginForm.addEventListener('submit', handleLogin);
});
