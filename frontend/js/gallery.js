//##############################################################################################\\
//																								\\
//	Auteur		: 	Bastien Erard																\\
//	Version		: 	1.0																			\\
//	Créé le		: 	18.04.2025																	\\
//	Modifié le	:	18.04.2025																	\\
//	But			:	Gère l'affichage des éléments de la galerie (images, commentaires,...)		\\
//																								\\
//##############################################################################################\\

// Configuration de l'API et des options fetch
const GALLERY_API_URL = 'http://localhost:3000/api/gallery';
const galleryFetchOptions = {
	headers: {
		'Content-Type': 'application/json'
	},
	credentials: 'include'
};

// Variables globales pour la pagination des photos
let currentPage = 1;
let isLoading = false;
let hasMorePhotos = true;
const PHOTOS_PER_PAGE = 5;

// Éléments DOM globaux
const galleryElement = document.getElementById('gallery');
const loadingElement = document.getElementById('loading');
const photoCardTemplate = document.getElementById('photoCardTemplate');
const commentTemplate = document.getElementById('commentTemplate');

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
	// Charge les premières photos
	loadPhotos();

	// Ajoute l'écouteur d'événement pour le scroll (pagination infinie)
	window.addEventListener('scroll', handleScroll);

	// Initialise la lightbox
	initLightbox();
});

// Fonction pour initialiser la lightbox
function initLightbox() {
	const lightbox = document.getElementById('lightbox');
	const lightboxImg = document.getElementById('lightbox-img');
	const closeBtn = document.querySelector('.close-lightbox');

	// Ferme la lightbox quand on clique sur le bouton de fermeture
	closeBtn.addEventListener('click', () => {
		lightbox.style.display = 'none';
	});

	// Ferme la lightbox quand on clique en dehors de l'image
	lightbox.addEventListener('click', (e) => {
		if (e.target === lightbox) {
			lightbox.style.display = 'none';
		}
	});
}

// Fonction pour gérer le défilement et charger plus de photos
function handleScroll()
{
	if (isLoading || !hasMorePhotos)
		return;

	const { scrollTop, scrollHeight, clientHeight } = document.documentElement;

	// Si l'utilisateur est près du bas de la page (300px avant la fin)
	if (scrollTop + clientHeight >= scrollHeight - 300)
		loadPhotos();
}

// Fonction pour charger les photos
async function loadPhotos()
{
	if (isLoading || !hasMorePhotos)
		return;

	isLoading = true;

	// Affiche le loader uniquement lors du chargement initial
	if (currentPage === 1)
		loadingElement.classList.remove('d-none');

	try
	{
		const response = await fetch(`${GALLERY_API_URL}?page=${currentPage}&limit=${PHOTOS_PER_PAGE}`, {
			method: 'GET',
			...galleryFetchOptions
		});

		if (!response.ok)
			throw new Error('Erreur lors du chargement des photos');

		const data = await response.json();

		// Masque le chargement
		loadingElement.classList.add('d-none');

		if (data.success) {
			// Affiche les photos
			displayPhotos(data.photos);

			// Vérifie s'il y a plus de photos à charger
			if (data.photos.length === PHOTOS_PER_PAGE)
				hasMorePhotos = true;
			else
				hasMorePhotos = false;

			currentPage++;
		} else {
			throw new Error(data.message || 'Erreur lors du chargement des photos');
		}
	}
	catch (error)
	{
		console.error('Erreur:', error);
		loadingElement.classList.add('d-none');
		galleryElement.innerHTML += `
			<div class="col-12">
				<div class="alert alert-danger">
					Une erreur est survenue lors du chargement des photos. Veuillez réessayer plus tard.
				</div>
			</div>
		`;
	}
	finally
	{
		isLoading = false;
	}
}

// Fonction pour afficher les photos
function displayPhotos(photos)
{
	if (photos.length === 0 && currentPage === 1)
	{
		galleryElement.innerHTML = `
			<div class="col-12">
				<div class="alert alert-info">
					Aucune photo n'a été publiée pour le moment.
				</div>
			</div>
		`;
		return;
	}

	// Supprime l'élément de chargement s'il est présent
	if (loadingElement && loadingElement.parentNode)
		loadingElement.remove();

	// Crée et ajouter les cartes de photos
	photos.forEach(photo => {
		const photoCard = createPhotoCard(photo);
		galleryElement.appendChild(photoCard);
	});
}

// Fonction pour créer une carte de photo
function createPhotoCard(photo)
{
	// Clone le template
	const card = photoCardTemplate.content.cloneNode(true);

	// Récupére les éléments de la carte
	const cardElement = card.querySelector('.photo-card');
	const imgElement = card.querySelector('.photo-img');
	const avatarElement = card.querySelector('.avatar-mini');
	const usernameElement = card.querySelector('.username');
	const dateElement = card.querySelector('.photo-date');
	const likeBtn = card.querySelector('.like-btn');
	const likeIcon = card.querySelector('.like-icon');
	const likeCount = card.querySelector('.like-count');
	const commentCount = card.querySelector('.comment-count');
	const authAlert = card.querySelector('.auth-alert');
	const commentsList = card.querySelector('.comments-list');
	const loadMoreCommentsContainer = card.querySelector('.load-more-comments-container');
	const loadMoreCommentsBtn = card.querySelector('.load-more-comments-btn');
	const commentForm = card.querySelector('.comment-form');
	const commentInput = card.querySelector('.comment-input');

	// Définis les attributs et le contenu
	cardElement.id = `photo-${photo.id}`;
	imgElement.src = photo.file_path;
	imgElement.alt = `Photo de ${photo.username}`;
	avatarElement.src = photo.avatar_path;
	usernameElement.textContent = photo.username;
	dateElement.textContent = formatDate(photo.created_at);
	likeCount.textContent = photo.like_count || 0;
	commentCount.textContent = `${photo.comment_count || 0} commentaire${photo.comment_count !== 1 ? 's' : ''}`;

	// Configurations spécifiques à la photo
	const photoData = {
		id: photo.id,
		commentPage: 1,
		hasMoreComments: photo.comment_count > 5,
		commentsLoaded: false
	};

	// Gére l'état du bouton de like
	if (photo.is_liked)
	{
		likeBtn.classList.add('liked');
		likeIcon.innerHTML = '<path fill-rule="evenodd" d="M8 1.314C12.438-3.248 23.534 4.735 8 15-7.534 4.736 3.562-3.248 8 1.314"/>';
	}

	// Charge les premiers commentaires s'il y en a
	if (photo.comments && photo.comments.length > 0)
	{
		photoData.commentsLoaded = true;
		photo.comments.forEach(comment => {
			const commentElement = createCommentElement(comment);
			commentsList.appendChild(commentElement);
		});

		// Affiche le bouton "Charger plus" si nécessaire
		if (photoData.hasMoreComments)
			loadMoreCommentsContainer.classList.remove('d-none');
	}

	// Afficher l'image en grand dans la lightbox lorsqu'on clique dessus
	imgElement.addEventListener('click', () => {
		const lightbox = document.getElementById('lightbox');
		const lightboxImg = document.getElementById('lightbox-img');
		lightboxImg.src = photo.file_path;
		lightbox.style.display = 'flex';
	});

	// Like/Unlike
	likeBtn.addEventListener('click', async () => {
		// Vérifie si l'utilisateur est connecté
		if (!window.authState || !window.authState.isAuthenticated)
		{
			authAlert.classList.remove('d-none');
			setTimeout(() => {
				authAlert.classList.add('d-none');
			}, 3000);
			return;
		}

		try
		{
			const isLiked = likeBtn.classList.contains('liked');
			const method = isLiked ? 'DELETE' : 'POST';
			const response = await fetch(`${GALLERY_API_URL}/${photo.id}/like`, {
				method: method,
				...galleryFetchOptions
			});

			if (!response.ok)
				throw new Error('Erreur lors de l\'ajout/suppression du like');

			const data = await response.json();

			if (data.success) {
				// Mets à jour l'interface
				likeCount.textContent = data.like_count;

				if (data.is_liked)
				{
					likeBtn.classList.add('liked');
					likeIcon.innerHTML = '<path fill-rule="evenodd" d="M8 1.314C12.438-3.248 23.534 4.735 8 15-7.534 4.736 3.562-3.248 8 1.314"/>';
				}
				else
				{
					likeBtn.classList.remove('liked');
					likeIcon.innerHTML = '<path d="m8 2.748-.717-.737C5.6.281 2.514.878 1.4 3.053c-.523 1.023-.641 2.5.314 4.385.92 1.815 2.834 3.989 6.286 6.357 3.452-2.368 5.365-4.542 6.286-6.357.955-1.886.838-3.362.314-4.385C13.486.878 10.4.28 8.717 2.01zM8 15C-7.333 4.868 3.279-3.04 7.824 1.143c.06.055.119.112.176.171a3.12 3.12 0 0 1 .176-.17C12.72-3.042 23.333 4.867 8 15"/>';
				}
			} else {
				throw new Error(data.message || 'Erreur lors de l\'ajout/suppression du like');
			}
		}
		catch (error)
		{
			console.error('Erreur:', error);
		}
	});

	// Charge plus de commentaires
	loadMoreCommentsBtn.addEventListener('click', async () => {
		try
		{
			photoData.commentPage++;

			const response = await fetch(`${GALLERY_API_URL}/${photo.id}/comments?page=${photoData.commentPage}&limit=5`, {
				method: 'GET',
				...galleryFetchOptions
			});

			if (!response.ok)
				throw new Error('Erreur lors du chargement des commentaires');

			const data = await response.json();

			if (data.success) {
				// Ajoute les nouveaux commentaires
				data.comments.forEach(comment => {
					const commentElement = createCommentElement(comment);
					commentsList.appendChild(commentElement);
				});

				// Vérifie s'il y a plus de commentaires à charger
				photoData.hasMoreComments = data.hasMore;

				// Masque le bouton "Charger plus" s'il n'y a plus de commentaires
				if (!photoData.hasMoreComments)
					loadMoreCommentsContainer.classList.add('d-none');
			} else {
				throw new Error(data.message || 'Erreur lors du chargement des commentaires');
			}
		}
		catch (error)
		{
			console.error('Erreur:', error);
		}
	});

	// Ajoute un commentaire
	commentForm.addEventListener('submit', async (e) => {
		e.preventDefault();

		// Vérifie si l'utilisateur est connecté
		if (!window.authState || !window.authState.isAuthenticated)
		{
			authAlert.classList.remove('d-none');
			setTimeout(() => {
				authAlert.classList.add('d-none');
			}, 3000);
			return;
		}

		const commentText = commentInput.value.trim();

		if (!commentText)
			return;

		try
		{
			const response = await fetch(`${GALLERY_API_URL}/${photo.id}/comment`, {
				method: 'POST',
				...galleryFetchOptions,
				body: JSON.stringify({ commentText })
			});

			if (!response.ok)
				throw new Error('Erreur lors de l\'ajout du commentaire');

			const data = await response.json();

			if (data.success) {
				// Ajoute le commentaire à la liste
				const newComment = createCommentElement({
					id: data.comment.id,
					username: window.authState.user.username,
					avatar_path: window.authState.user.avatar,
					comment_text: commentText,
					created_at: new Date().toISOString()
				});

				commentsList.appendChild(newComment);

				// Mets à jour le compteur de commentaires
				const currentCount = parseInt(commentCount.textContent.split(' ')[0], 10);
				const newCount = currentCount + 1;
				commentCount.textContent = `${newCount} commentaire${newCount !== 1 ? 's' : ''}`;

				// Réinitialise le formulaire
				commentInput.value = '';

				// Fais défiler jusqu'au nouveau commentaire
				commentsList.scrollTop = commentsList.scrollHeight;
			} else {
				throw new Error(data.message || 'Erreur lors de l\'ajout du commentaire');
			}
		}
		catch (error)
		{
			console.error('Erreur:', error);
		}
	});

	// Désactive le formulaire de commentaire si l'utilisateur n'est pas connecté
	if (!window.authState || !window.authState.isAuthenticated)
		commentInput.placeholder = 'Connectez-vous pour commenter';

	return card.firstElementChild;
}

// Fonction pour créer un élément de commentaire
function createCommentElement(comment)
{
	// Clone le template
	const commentElement = commentTemplate.content.cloneNode(true);

	// Récupére les éléments du commentaire
	const avatarElement = commentElement.querySelector('.avatar-mini');
	const usernameElement = commentElement.querySelector('.comment-username');
	const dateElement = commentElement.querySelector('.comment-date');
	const textElement = commentElement.querySelector('.comment-text');

	// Définis les attributs et le contenu
	avatarElement.src = comment.avatar_path;
	usernameElement.textContent = comment.username;
	dateElement.textContent = formatDate(comment.created_at);
	textElement.textContent = comment.comment_text;

	return commentElement;
}

// Fonction pour formater les dates en français
function formatDate(dateString)
{
	const date = new Date(dateString);
	const now = new Date();
	const diffTime = Math.abs(now - date);
	const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

	// Formate les heures et minutes
	const heures = date.getHours().toString().padStart(2, '0');
	const minutes = date.getMinutes().toString().padStart(2, '0');

	if (diffDays === 0)
		return `Aujourd'hui à ${heures}:${minutes}`;
	else if (diffDays === 1)
		return `Hier à ${heures}:${minutes}`;
	else if (diffDays < 7)
	{
		const jours = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
		return `${jours[date.getDay()]} à ${heures}:${minutes}`;
	}
	else
	{
		// Plus d'une semaine
		const jour = date.getDate().toString().padStart(2, '0');
		const mois = (date.getMonth() + 1).toString().padStart(2, '0');
		const annee = date.getFullYear();
		return `${jour}/${mois}/${annee} à ${heures}:${minutes}`;
	}
}
