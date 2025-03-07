//##############################################################################################\\
//																								\\
//	Auteur		: 	Bastien Erard																\\
//	Version		: 	1.0																			\\
//	Créé le		: 	05.03.2025																	\\
//	Modifié le	:	05.03.2025																	\\
//	But			:	Gestion du profil utilisateur												\\
//																								\\
//##############################################################################################\\

// Configuration de l'API et des options fetch
const PROFILE_API_URL = 'http://localhost:3000/api/profile';
const profileFetchOptions = {
	headers: {
		'Content-Type': 'application/json'
	},
	credentials: 'include'
};

// Références aux différentes vues
const profileView = document.getElementById('profileView');
const editProfileView = document.getElementById('editProfileView');
const changePasswordView = document.getElementById('changePasswordView');
const deleteAccountView = document.getElementById('deleteAccountView');

// Références aux formulaires
const profileForm = document.getElementById('profileForm');
const editProfileForm = document.getElementById('editProfileForm');
const changePasswordForm = document.getElementById('changePasswordForm');
const deleteAccountForm = document.getElementById('deleteAccountForm');

// Références aux boutons
const editProfileBtn = document.getElementById('editProfileBtn');
const changePasswordBtn = document.getElementById('changePasswordBtn');
const deleteAccountBtn = document.getElementById('deleteAccountBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const cancelPasswordBtn = document.getElementById('cancelPasswordBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');

// Données de l'utilisateur
let userData = null;
let availableAvatars = [];

// Variables pour stocker les timers des messages
let errorMessageTimer = null;
let successMessageTimer = null;

// Fonction pour cacher tous les messages
function	hideAllMessages()
{
	// Effacer les timers existants
	if (errorMessageTimer)
	{
		clearTimeout(errorMessageTimer);
		errorMessageTimer = null;
	}
	if (successMessageTimer)
	{
		clearTimeout(successMessageTimer);
		successMessageTimer = null;
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
	errorMessageTimer = setTimeout(function() {
		errorMessage.classList.add('d-none');
		errorMessageTimer = null;
	}, 5000);
}

// Fonction pour afficher les messages de succès
function showSuccess(message)
{
	hideAllMessages();

	const successMessage = document.getElementById('successMessage');
	successMessage.textContent = message;
	successMessage.classList.remove('d-none');

	successMessageTimer = setTimeout(function() {
		successMessage.classList.add('d-none');
		successMessageTimer = null;
	}, 5000);
}

// Fonction pour basculer entre les différentes vues
function showView(viewToShow)
{
	hideAllMessages();
	// Cacher toutes les vues
	profileView.classList.add('d-none');
	editProfileView.classList.add('d-none');
	changePasswordView.classList.add('d-none');
	deleteAccountView.classList.add('d-none');

	// Afficher la vue demandée
	viewToShow.classList.remove('d-none');
}

// Fonction pour charger les données du profil de l'utilisateur
async function loadUserProfile()
{
	try
	{
		const response = await fetch(`${PROFILE_API_URL}/info`, {
			method: 'GET',
			...profileFetchOptions
		});

		if (!response.ok)
		{
			// Si l'utilisateur n'est pas authentifié, rediriger vers la page de connexion
			if (response.status === 401)
			{
				window.location.href = '/login';
				return;
			}
			throw new Error('Erreur lors du chargement du profil');
		}

		const data = await response.json();

		if (data.success)
		{
			userData = data.user;
			displayUserProfile();
		}
		else
		{
			showError(data.message || 'Impossible de charger les informations du profil');
		}
	}
	catch (error)
	{
		console.error('Erreur:', error);
		showError('Une erreur est survenue lors du chargement du profil');
	}
}

// Fonction pour charger les avatars disponibles
async function loadAvatars()
{
	try
	{
		const response = await fetch(`${PROFILE_API_URL}/avatars`, {
			method: 'GET',
			...profileFetchOptions
		});

		if (!response.ok)
		{
			throw new Error('Erreur lors du chargement des avatars');
		}

		const data = await response.json();

		if (data.success)
		{
			availableAvatars = data.avatars;
			// Mettre à jour la galerie d'avatars dans la vue d'édition
			populateAvatarGallery();
		}
		else
		{
			console.error('Erreur:', data.message);
		}
	}
	catch (error)
	{
		console.error('Erreur:', error);
	}
}

// Fonction pour afficher les informations du profil
function displayUserProfile()
{
	if (!userData)
		return;

	// Mettre à jour les champs de la vue principale
	document.getElementById('username').value = userData.username;
	document.getElementById('email').value = userData.email;
	document.getElementById('emailNotifications').checked = userData.emailNotifications;
	document.getElementById('avatarPreview').src = userData.avatar;

	// Mettre à jour également les champs du formulaire d'édition
	document.getElementById('editUsername').value = userData.username;
	document.getElementById('editEmail').value = userData.email;
	document.getElementById('editEmailNotifications').checked = userData.emailNotifications;
	document.getElementById('editAvatarPreview').src = userData.avatar;
	document.getElementById('selectedAvatarId').value = userData.avatarId || 1;
}

// Fonction pour peupler la galerie d'avatars
function populateAvatarGallery()
{
	const gallery = document.getElementById('editAvatarGallery');
	gallery.innerHTML = '';

	// Vérifier si un avatar est actuellement sélectionné
	const currentAvatarId = parseInt(userData.avatarId) || 1;

	availableAvatars.forEach(avatar => {
		const avatarElement = document.createElement('div');
		avatarElement.className = 'avatar-option';
		avatarElement.innerHTML = `
			<img src="${avatar.file_path}"
				 alt="${avatar.name}"
				class="img-thumbnail avatar-thumbnail ${parseInt(avatar.id) === currentAvatarId ? 'selected' : ''}"
				 style="width: 60px; height: 60px; object-fit: cover; cursor: pointer;"
				 data-avatar-id="${avatar.id}">
		`;

		// Ajouter l'écouteur d'événement pour la sélection
		avatarElement.querySelector('img').addEventListener('click', function() {
			// Retirer la classe 'selected' de tous les avatars
			document.querySelectorAll('.avatar-thumbnail').forEach(img => {
				img.classList.remove('selected');
			});

			// Ajouter la classe 'selected' à l'avatar cliqué
			this.classList.add('selected');

			// Mettre à jour la prévisualisation et l'ID sélectionné
			document.getElementById('editAvatarPreview').src = this.src;
			document.getElementById('selectedAvatarId').value = this.dataset.avatarId;
		});

		gallery.appendChild(avatarElement);
	});

	// S'assurer qu'un avatar est toujours sélectionné
	if (document.querySelectorAll('.avatar-thumbnail.selected').length === 0 && availableAvatars.length > 0) {
		const firstAvatar = document.querySelector('.avatar-thumbnail');
		if (firstAvatar) {
			firstAvatar.classList.add('selected');
			document.getElementById('editAvatarPreview').src = firstAvatar.src;
			document.getElementById('selectedAvatarId').value = firstAvatar.dataset.avatarId;
		}
	}
}

// Fonction pour mettre à jour le profil
async function	updateProfile(event)
{
	event.preventDefault();

	const username = document.getElementById('editUsername').value.trim();
	const email = document.getElementById('editEmail').value.trim();
	const emailNotifications = document.getElementById('editEmailNotifications').checked;
	const avatarId = parseInt(document.getElementById('selectedAvatarId').value);

	// Validation simple du formulaire
	if (!username || !email)
	{
		showError('Tous les champs sont obligatoires');
		return;
	}

	if (username.length < 3 || username.length > 20)
	{
		showError('Le nom d\'utilisateur doit contenir entre 3 et 20 caractères');
		return;
	}

	const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
	if (!usernameRegex.test(username))
	{
		showError('Le nom d\'utilisateur ne doit contenir que des lettres, chiffres, tirets et underscores');
		return;
	}

	const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
	if (!emailRegex.test(email))
	{
		showError('Format d\'email invalide');
		return;
	}

	try
	{
		const response = await fetch(`${PROFILE_API_URL}/update`, {
			method: 'POST',
			...profileFetchOptions,
			body: JSON.stringify({
				username,
				email,
				emailNotifications,
				avatarId
			})
		});

		const data = await response.json();

		if (data.success)
		{
			userData = data.user;
			displayUserProfile();
			showView(profileView);
			showSuccess('Votre profil a été mis à jour avec succès');
			if (window.authState)
			{
				window.authState.user = {
					username: userData.username,
					avatar: userData.avatar
				};
				window.updateUI();
			}
		}
		else
		{
			showError(data.message || 'Erreur lors de la mise à jour du profil');
		}
	}
	catch (error)
	{
		console.error('Erreur:', error);
		showError('Une erreur est survenue lors de la mise à jour du profil');
	}
}

// Fonction pour changer le mot de passe
async function changePassword(event)
{
	event.preventDefault();

	const currentPassword = document.getElementById('currentPassword').value;
	const newPassword = document.getElementById('newPassword').value;
	const confirmNewPassword = document.getElementById('confirmNewPassword').value;

	// Validation simple
	if (!currentPassword || !newPassword || !confirmNewPassword)
	{
		showError('Tous les champs sont obligatoires');
		return;
	}

	if (newPassword !== confirmNewPassword)
	{
		showError('Les mots de passe ne correspondent pas');
		return;
	}

	if (newPassword.length < 8 || newPassword.length > 30)
	{
		showError('Le mot de passe doit contenir entre 8 et 30 caractères');
		return;
	}

	const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]+$/;
	if (!passwordRegex.test(newPassword))
	{
		showError('Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre');
		return;
	}

	try
	{
		// Hachage des mots de passe avant envoi (utilise la fonction hashPassword de auth.js)
		const hashedCurrentPassword = await hashPassword(currentPassword);
		const hashedNewPassword = await hashPassword(newPassword);

		const response = await fetch(`${PROFILE_API_URL}/change-password`, {
			method: 'POST',
			...profileFetchOptions,
			body: JSON.stringify({
				currentPassword: hashedCurrentPassword,
				newPassword: hashedNewPassword
			})
		});

		const data = await response.json();

		if (data.success)
		{
			// Réinitialiser le formulaire
			changePasswordForm.reset();
			showView(profileView);
			showSuccess('Votre mot de passe a été modifié avec succès');
		} else
		{
			showError(data.message || 'Erreur lors de la modification du mot de passe');
		}
	}
	catch (error)
	{
		console.error('Erreur:', error);
		showError('Une erreur est survenue lors de la modification du mot de passe');
	}
}

// Fonction pour supprimer le compte
async function deleteAccount(event)
{
	event.preventDefault();

	const confirmUsername = document.getElementById('confirmUsername').value.trim();
	const confirmPassword = document.getElementById('confirmPassword').value;

	// Vérifier que le nom d'utilisateur correspond
	if (confirmUsername !== userData.username)
	{
		showError('Le nom d\'utilisateur ne correspond pas');
		return;
	}

	try
	{
		// Hacher le mot de passe avant envoi
		const hashedPassword = await hashPassword(confirmPassword);

		const response = await fetch(`${PROFILE_API_URL}/delete`, {
			method: 'POST',
			...profileFetchOptions,
			body: JSON.stringify({
				username: confirmUsername,
				password: hashedPassword
			})
		});

		const data = await response.json();

		if (data.success)
		{
			showSuccess('Votre compte a été supprimé avec succès. Vous allez être redirigé...');
			setTimeout(() => {
				window.location.href = '/';
			}, 2000);
		}
		else
		{
			showError(data.message || 'Erreur lors de la suppression du compte');
		}
	}
	catch (error)
	{
		console.error('Erreur:', error);
		showError('Une erreur est survenue lors de la suppression du compte');
	}
}

// Initialisation: ajouter les écouteurs d'événements
document.addEventListener('DOMContentLoaded', async function() {
	// Charger le profil de l'utilisateur au chargement de la page
	await loadUserProfile();
	// Charger les avatars disponibles
	await loadAvatars();

	// Boutons pour afficher les différentes vues
	editProfileBtn.addEventListener('click', function() {
		showView(editProfileView);
	});

	changePasswordBtn.addEventListener('click', function() {
		showView(changePasswordView);
	});

	deleteAccountBtn.addEventListener('click', function() {
		showView(deleteAccountView);
	});

	// Boutons d'annulation pour revenir à la vue du profil
	cancelEditBtn.addEventListener('click', function() {
		displayUserProfile(); // Réinitialiser les valeurs du formulaire d'édition
		showView(profileView);
	});

	cancelPasswordBtn.addEventListener('click', function() {
		changePasswordForm.reset();
		showView(profileView);
	});

	cancelDeleteBtn.addEventListener('click', function() {
		deleteAccountForm.reset();
		showView(profileView);
	});

	// Soumission des formulaires
	editProfileForm.addEventListener('submit', updateProfile);
	changePasswordForm.addEventListener('submit', changePassword);
	deleteAccountForm.addEventListener('submit', deleteAccount);

	// Style pour les avatars sélectionnés
	document.head.insertAdjacentHTML('beforeend', `
		<style>
			.avatar-thumbnail.selected {
				border: 3px solid #007bff !important;
			}
		</style>
	`);
});
