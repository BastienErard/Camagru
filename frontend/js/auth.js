//##############################################################################################\\
//																								\\
//	Auteur		: 	Bastien Erard																\\
//	Version		: 	1.0																			\\
//	Créé le		: 	29.01.2025																	\\
//	Modifié le	:	14.02.2025																	\\
//	But			:	Gère tous les éléments liés à la connexion / déconnexion					\\
//																								\\
//##############################################################################################\\

// Etat global de l'authentification
let authState = {
	isAuthenticated: false,
	user: null
}

// Fonction au chargement de la page qui vérifie si l'utilisateur est connecté
async function checkAuthStatus()
{
	try
	{
		const response = await fetch('http://localhost:3000/api/auth/status', {
			method : 'GET',
			credentials: 'include'
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
async function logout()
{
	try
	{
		const response = await fetch('http://localhost:4000/api/auth/logout', {
			method: 'POST',
			credentials: 'include'
		});

		if (!response.ok)
			throw new Error('Erreur de déconnexion');

		authState.isAuthenticated = false;
		authState.user = null;
		updateUI();
		window.location.href = '/';
	}
	catch (error)
	{
		console.error('Erreur de déconnexion:', error);
	}
}

// Vérifier l'authentification au chargement de la page
document.addEventListener('DOMContentLoaded', checkAuthStatus);

