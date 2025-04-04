//##############################################################################################\\
//																								\\
//	Auteur		: 	Bastien Erard																\\
//	Version		: 	1.0																			\\
//	Créé le		: 	10.03.2025																	\\
//	Modifié le	:	25.03.2025																	\\
//	But			:	Gère les fonctionnalités d'édition et manipulation d'images					\\
//																								\\
//##############################################################################################\\

// Configuration de l'API et des options fetch
const EDITING_API_URL = 'http://localhost:3000/api/editing';
const editingFetchOptions = {
	headers: {
		'Content-Type': 'application/json'
	},
	credentials: 'include'
};

// Variables pour la caméra et la capture
let video = document.getElementById('video');
let canvas = document.getElementById('canvas');
let captureBtn = document.getElementById('captureBtn');
let toggleCameraBtn = document.getElementById('toggleCameraBtn');
let switchCameraBtn = document.getElementById('switchCameraBtn');
let imageUpload = document.getElementById('imageUpload');
let ctx = canvas.getContext('2d');
let stream = null;
let currentCameraIndex = 0;
let availableCameras = [];
let cameraActive = false;

// Variables pour les stickers
let stickersContainer = document.getElementById('stickersContainer');
let stickersPreview = document.getElementById('stickersPreview');
let selectedStickers = [];
let stickers = [];
let stickerSize = document.getElementById('stickerSize');
let stickerSizeValue = document.getElementById('stickerSizeValue');
const MAX_STICKERS = 3;

// Variables pour la création de GIF
let createGifCheckbox = document.getElementById('createGifCheckbox');
let gifControls = document.getElementById('gifControls');
let frameCount = document.getElementById('frameCount');
let frameDelay = document.getElementById('frameDelay');
let gifProgressContainer = document.getElementById('gifProgressContainer');
let gifProgress = document.getElementById('gifProgress');
let gifFrames = [];

// Variables pour les photos utilisateur
let userPhotosContainer = document.getElementById('userPhotos');
let loadingPhotos = document.getElementById('loadingPhotos');
let noPhotosMessage = document.getElementById('noPhotosMessage');

async function checkAuthentication()
{
	if (!window.authState || !window.authState.isAuthenticated)
	{
		try
		{
			await checkAuthStatus();

			if (!window.authState.isAuthenticated)
			{
				window.location.href = '/login';
				return false;
			}
		}
		catch (error)
		{
			console.error('Erreur de vérification d\'authentification:', error);
			window.location.href = '/login';
			return false;
		}
	}
	return true;
}

// Variables pour stocker les timers des messages
let errorMessageTimerEditing = null;
let successMessageTimerEditing = null;

// Fonction pour cacher tous les messages
function hideAllMessages()
{
	// Effacer les timers existants
	if (errorMessageTimerEditing)
	{
		clearTimeout(errorMessageTimerEditing);
		errorMessageTimerEditing = null;
	}
	if (successMessageTimerEditing)
	{
		clearTimeout(successMessageTimerEditing);
		successMessageTimerEditing = null;
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
	errorMessageTimerEditing = setTimeout(function() {
		errorMessage.classList.add('d-none');
		errorMessageTimerEditing = null;
	}, 5000);
}

// Fonction pour afficher les messages de succès
function showSuccess(message)
{
	hideAllMessages();

	const successMessage = document.getElementById('successMessage');
	successMessage.textContent = message;
	successMessage.classList.remove('d-none');

	successMessageTimerEditing = setTimeout(function() {
		successMessage.classList.add('d-none');
		successMessageTimerEditing = null;
	}, 5000);
}

// Active / Désactive la caméra
async function toggleCamera()
{
	if (cameraActive)
	{
		if (stream)
		{
			stream.getTracks().forEach(track => track.stop());
			stream = null;
		}
		video.srcObject = null;
		toggleCameraBtn.innerHTML = 'Activer la caméra';
		cameraActive = false;
	}
	else
	{
		await initCamera();
		if (stream)
		{
			toggleCameraBtn.innerHTML = 'Désactiver la caméra';
			cameraActive = true;
		}
	}
}

// Initialisation de la webcam
async function initCamera()
{
	try
	{
		// récupère les différentes caméras disponibles
		const devices = await navigator.mediaDevices.enumerateDevices();
		availableCameras = devices.filter(device => device.kind === 'videoinput');

		// Si aucune caméra n'est disponible
		if (availableCameras.length === 0)
		{
			toggleCameraBtn.disabled = true;
			showError("Aucune caméra détectée. Vous pouvez télécharger une image à la place.");
			return;
		}

		// Active ou désactive le bouton de changement de caméra
		switchCameraBtn.disabled = availableCameras.length <= 1;

		// Récupère le flux de la caméra
		stream = await navigator.mediaDevices.getUserMedia({
			video: {
				deviceId: availableCameras[currentCameraIndex]?.deviceId ? { exact: availableCameras[currentCameraIndex].deviceId } : undefined,
				width: { ideal: 640 },
				height: { ideal: 480 }
			},
			audio: false
		});

		// Assigne le flux à l'élément vidéo
		video.srcObject = stream;
		cameraActive = true;

		// Définit les dimensions du canvas selon la vidéo
		video.onloadedmetadata = () => {
			canvas.width = video.videoWidth;
			canvas.height = video.videoHeight;
		};
	}
	catch (error)
	{
		console.error("Erreur d'accès à la caméra:", error);
		showError("Impossible d'accéder à la caméra. Vous pouvez télécharger une image à la place.");
		toggleCameraBtn.disabled = true;
	}
}

// Fonction pour changer la caméra
async function switchCamera()
{
	// Arrête la caméra actuelle
	if (stream)
		stream.getTracks().forEach(track => track.stop());

	// Passe à la caméra suivante
	currentCameraIndex = (currentCameraIndex + 1) % availableCameras.length;

	// Initialise avec la nouvelle caméra
	await initCamera();
}

// Charge les stickers disponibles
async function loadStickers()
{
	try
	{
		const response = await fetch(`${EDITING_API_URL}/stickers`, {
			method: 'GET',
			...editingFetchOptions
		});

		if (!response.ok)
			throw new Error('Erreur lors du chargement des stickers');

		const data = await response.json();

		if (data.success)
		{
			stickers = data.stickers;
			displayStickers();
		}
		else
			showError(data.message || 'Impossible de charger les stickers');
	}
	catch (error)
	{
		console.error('Erreur:', error);
		showError('Une erreur est survenue lors du chargement des stickers');
	}
}

// Affiche les stickers dans le conteneur
function displayStickers()
{
	stickersContainer.innerHTML = '';

	stickers.forEach(sticker => {
		const stickerElement = document.createElement('div');
		stickerElement.className = 'mb-2 me-2';
		stickerElement.innerHTML = `
			<img src="${sticker.file_path}"
				alt="${sticker.name}"
				class="img-thumbnail"
				width="60"
				height="60"
				style="opacity: 0.7; cursor: pointer; transition: all 0.2s ease;"
				data-sticker-id="${sticker.id}">
		`;

		const img = stickerElement.querySelector('img');

		img.addEventListener('click', () => {
			// Si on a déjà atteint le nombre max de stickers et que ce n'est pas un sticker déjà sélectionné
			const existingIndex = selectedStickers.findIndex(s => s.id === sticker.id);
			if (selectedStickers.length >= MAX_STICKERS && existingIndex === -1)
			{
				showError(`Vous ne pouvez pas sélectionner plus de ${MAX_STICKERS} stickers à la fois`);
				return;
			}

			// Si le sticker est déjà sélectionné, on le retire
			if (existingIndex !== -1)
			{
				selectedStickers.splice(existingIndex, 1);
				img.style.opacity = '0.7';
				img.classList.remove('sticker-selected');
			}
			else
			{
				// Sinon on l'ajoute avec des propriétés par défaut
				selectedStickers.push({
					id: sticker.id,
					file_path: sticker.file_path,
					name: sticker.name,
					x: 50,
					y: 50,
					size: parseInt(stickerSize.value),
					rotation: 0
				});
				img.style.opacity = '1';
				img.classList.add('sticker-selected');
			}

			// Mise à jour de l'aperçu
			updateStickersPreview();
		});

		stickersContainer.appendChild(stickerElement);
	});
}

// Permet d'avoir un aperçu des stickers
function updateStickersPreview()
{
	stickersPreview.innerHTML = '';

	if (selectedStickers.length === 0)
		return;

	selectedStickers.forEach((sticker, index) => {
		const stickerImg = document.createElement('img');
		stickerImg.src = sticker.file_path;
		stickerImg.alt = sticker.name;
		stickerImg.className = 'selected-sticker';
		stickerImg.style.width = `${sticker.size}%`;
		stickerImg.style.left = `${sticker.x - sticker.size/2}%`;
		stickerImg.style.top = `${sticker.y - sticker.size/2}%`;
		stickerImg.style.transform = `rotate(${sticker.rotation}deg)`;
		stickerImg.dataset.index = index;

		// Drag and drop pour déplacer le sticker
		stickerImg.addEventListener('mousedown', startDrag);

		// Double-clic pour ouvrir le menu de rotation
		stickerImg.addEventListener('dblclick', function(e) {
			e.preventDefault();
			const degrees = prompt(`Rotation du sticker "${sticker.name}" (en degrés):`, sticker.rotation);
			if (degrees !== null) {
				const deg = parseInt(degrees) || 0;
				selectedStickers[index].rotation = deg;
				updateStickersPreview();
			}
		});

		stickersPreview.appendChild(stickerImg);
	});
}

// Gestion du drag and drop pour les stickers
function startDrag(e)
{
	e.preventDefault();

	const img = e.target;
	const index = parseInt(img.dataset.index);

	// Récupère les dimensions du conteneur
	const containerRect = stickersPreview.getBoundingClientRect();

	// Fonction de déplacement
	function moveAt(clientX, clientY)
	{
		// Calcule la position relative en pourcentage
		const x = ((clientX - containerRect.left) / containerRect.width) * 100;
		const y = ((clientY - containerRect.top) / containerRect.height) * 100;

		// Limite la position pour que le sticker ne sorte pas du cadre
		selectedStickers[index].x = Math.max(0, Math.min(100, x));
		selectedStickers[index].y = Math.max(0, Math.min(100, y));

		// Met à jour directement la position du sticker en tenant compte de sa taille
		img.style.left = `${selectedStickers[index].x - selectedStickers[index].size/2}%`;
		img.style.top = `${selectedStickers[index].y - selectedStickers[index].size/2}%`;
	}

	function onMouseMove(e)
	{
		moveAt(e.clientX, e.clientY);
	}

	document.addEventListener('mousemove', onMouseMove);

	document.addEventListener('mouseup', function() {
		document.removeEventListener('mousemove', onMouseMove);
	}, { once: true });
}

// Charge les photos de l'utilisateur
async function loadUserPhotos()
{
	try
	{
		loadingPhotos.classList.remove('d-none');
		noPhotosMessage.classList.add('d-none');
		userPhotosContainer.innerHTML = '';

		const response = await fetch(`${EDITING_API_URL}/photos`, {
			method: 'GET',
			...editingFetchOptions
		});

		if (!response.ok)
			throw new Error('Erreur lors du chargement des photos');

		const data = await response.json();

		loadingPhotos.classList.add('d-none');

		if (data.success)
		{
			if (data.photos.length === 0)
			{
				noPhotosMessage.classList.remove('d-none');
				return;
			}
			displayUserPhotos(data.photos);
		}
		else
			showError(data.message || 'Impossible de charger vos photos');
	}
	catch (error)
	{
		loadingPhotos.classList.add('d-none');
		console.error('Erreur:', error);
		showError('Une erreur est survenue lors du chargement des photos');
	}
}

// Affiche les photos de l'utilisateur
function displayUserPhotos(photos)
{
	userPhotosContainer.innerHTML = '';

	photos.forEach(photo => {
		const thumbnailElement = document.createElement('div');
		thumbnailElement.className = 'col';
		thumbnailElement.innerHTML = `
			<div class="position-relative" style="height: 100px; cursor: pointer;">
				<img src="${photo.thumbnail_path}"
					alt="Photo"
					class="img-thumbnail h-100 w-100 object-fit-cover"
					data-photo-id="${photo.id}"
					${photo.is_gif ? 'data-is-gif="true"' : ''}>
				<div class="delete-thumbnail" title="Supprimer" data-photo-id="${photo.id}">✕</div>
			</div>
		`;

		const img = thumbnailElement.querySelector('img');

		// Si c'est un GIF, utiliser le fichier original pour la miniature
		if (photo.is_gif)
			img.src = photo.file_path;

		// Ajouter l'événement de clic pour voir l'image en grand
		img.addEventListener('click', () => {
			window.open(photo.file_path, '_blank');
		});

		// Ajouter l'événement de clic pour supprimer l'image
		thumbnailElement.querySelector('.delete-thumbnail').addEventListener('click', (e) => {
			e.stopPropagation();
			deletePhoto(photo.id);
		});

		userPhotosContainer.appendChild(thumbnailElement);
	});
}

// Supprime une photo
async function deletePhoto(photoId)
{
	if (!confirm('Êtes-vous sûr de vouloir supprimer cette photo ?'))
		return;

	try
	{
		const response = await fetch(`${EDITING_API_URL}/photos/${photoId}`, {
			method: 'DELETE',
			...editingFetchOptions
		});

		if (!response.ok)
			throw new Error('Erreur lors de la suppression de la photo');

		const data = await response.json();

		if (data.success)
		{
			showSuccess('Photo supprimée avec succès');
			loadUserPhotos();
		}
		else
			showError(data.message || 'Impossible de supprimer la photo');
	}
	catch (error)
	{
		console.error('Erreur:', error);
		showError('Une erreur est survenue lors de la suppression de la photo');
	}
}

// Prend une photo avec la webcam ou via un téléchargement
async function capturePhoto()
{
	// Vérifie la présence d'une image via la caméra ou via un upload
	if (!cameraActive && !imageUpload.files[0])
	{
		showError('Activez votre caméra ou téléchargez une image');
		return;
	}

	// Vérifie s'il s'agit d'un GIF via la checkbox
	if (createGifCheckbox.checked)
	{
		await captureGif();
		return;
	}

	// Vérifie s'il s'agit d'une image upload au lieu d'utiliser la webcam
	if (imageUpload.files[0])
	{
		await processUploadImage();
		return;
	}

	// En dernier recours, utilise la webcam avec une seule image
	// CTX => contexte 2D du <canvas>
	ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

	// Transforme le canvas en une chaine Base64, tout en gardant la transparence
	const imageData = canvas.toDataURL('image/png');

	// Envoie de l'image au serveur
	await saveImage(imageData);
}

// Traite une image téléchargée par l'utilisateur
async function processUploadImage()
{
	const file = imageUpload.files[0];

	if (!file)
	{
		showError('Veuillez sélectionner une image');
		return;
	}

	return new Promise((resolve, reject) => {
		// Utilisé pour lire le fichier en Base64
		const reader = new FileReader();

		reader.onload = async function(e) {
			const img = new Image();

			img.onload = async function() {
				try {
					// Redimensionne l'image si nécessaire
					const maxWidth = 640;
					const maxHeight = 480;
					let width = img.width;
					let height = img.height;

					if (width > maxWidth)
					{
						height = height * (maxWidth / width);
						width = maxWidth;
					}
					if (height > maxHeight)
					{
						width = width * (maxHeight / height);
						height = maxHeight;
					}

					canvas.width = width;
					canvas.height = height;

					// CTX => contexte 2D du <canvas>
					ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

					// Convertit l'image en base64
					const imageData = canvas.toDataURL('image/png');

					// Envoie l'image au serveur
					await saveImage(imageData);

					// Réinitialise l'input file
					imageUpload.value = '';
					document.querySelector('label[for="imageUpload"]').textContent = 'Ou télécharger une image';

					resolve();
				}
				catch (error)
				{
					reject(error);
				}
			};

			// Affiche un aperçu immédiat de l'image téléchargée avant l'envoi.
			img.src = e.target.result;
		};

		reader.onerror = reject;

		// Permet d'afficher une prévisualisation de l'image sans requête serveur
		reader.readAsDataURL(file);
	});
}

// Envoie l'image au serveur
async function saveImage(imageData)
{
	try
	{
		// Convertit les stickers sélectionnés en format pour le backend
		const stickerData = selectedStickers.map(sticker => ({
			id: sticker.id,
			x: sticker.x / 100, // Convertit le pourcentage en valeur entre 0 et 1
			y: sticker.y / 100,
			scale: sticker.size / 100,
			rotation: sticker.rotation
		}));

		const response = await fetch(`${EDITING_API_URL}/save`, {
			method: 'POST',
			...editingFetchOptions,
			body: JSON.stringify({
				imageData: imageData,
				stickers: stickerData
			})
		});

		if (!response.ok)
			throw new Error('Erreur lors de la sauvegarde de l\'image');

		const data = await response.json();

		if (data.success)
		{
			showSuccess('Image sauvegardée avec succès');
			loadUserPhotos();
		}
		else
			showError(data.message || 'Impossible de sauvegarder l\'image');
	}
	catch (error)
	{
		console.error('Erreur:', error);
		showError('Une erreur est survenue lors de la sauvegarde de l\'image');
	}
}

// Fonction pour valider les entrées numériques
function validateNumericInput(input, min, max)
{
	let value = parseInt(input.value);

	// Si la valeur est inférieure au minimum
	if (value < min)
	{
		input.value = min;
		return min;
	}

	// Si la valeur est supérieure au maximum
	if (value > max)
	{
		input.value = max;
		return max;
	}

	return value;
}

// Capture plusieurs images pour créer un GIF
async function captureGif()
{
	if (!cameraActive)
	{
		showError('Activez votre caméra pour créer un GIF');
		return;
	}

	// Valider les entrées avant utilisation
	const frameCountValue = validateNumericInput(frameCount, 2, 10);
	const frameDelayValue = validateNumericInput(frameDelay, 100, 1000);

	// Réinitialise les frames
	gifFrames = [];

	// Affiche la barre de progression
	gifProgressContainer.classList.remove('d-none');
	gifProgress.style.width = '0%';

	// Désactive le bouton de capture pendant l'enregistrement
	captureBtn.disabled = true;

	try
	{
		// Capture les frames
		for (let i = 0; i < frameCountValue; i++)
		{
			await new Promise(resolve => setTimeout(resolve, frameDelayValue));

			// Dessine l'image sur le canvas
			ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

			// Convertit l'image en base 64
			const imageData = canvas.toDataURL('image/png');

			// Ajoute l'image aux frames
			gifFrames.push(imageData);

			// Met à jour la barre de progression
			const progress = ((i + 1) / frameCountValue) * 100;
			gifProgress.style.width = `${progress}%`;
		}

		// Convertit les stickers sélectionnés en format pour le backend
		const stickerData = selectedStickers.map(sticker => ({
			id: sticker.id,
			x: sticker.x / 100, // Convertit le pourcentage en valeur entre 0 et 1
			y: sticker.y / 100,
			scale: sticker.size / 100,
			rotation: sticker.rotation
		}));

		const response = await fetch(`${EDITING_API_URL}/create-gif`, {
			method: 'POST',
			...editingFetchOptions,
			body: JSON.stringify({
				frames: gifFrames,
				frameDelay: frameDelayValue,
				stickers: stickerData
			})
		});

		if (!response.ok)
			throw new Error('Erreur lors de la création du GIF');

		const data = await response.json();

		if (data.success)
		{
			showSuccess('GIF créé avec succès');
			loadUserPhotos();
		}
		else
			showError(data.message || 'Impossible de créer le GIF');

		// Ces opérations sont exécutées même si une erreur se produit
		gifProgressContainer.classList.add('d-none');
		captureBtn.disabled = false;
	}
	catch (error)
	{
		console.error('Erreur:', error);
		showError('Une erreur est survenue lors de la création du GIF');

		// Ces opérations sont exécutées même si une erreur se produit
		gifProgressContainer.classList.add('d-none');
		captureBtn.disabled = false;
	}
}

// Initialisation des écouteurs d'événements
document.addEventListener('DOMContentLoaded', async function() {
	// Vérifie si l'utilisateur est authentifié
	const isAuthenticated = await checkAuthentication();
	if (!isAuthenticated)
		return;

	// Initialise la webcam
	await initCamera();

	// Charge les stickers
	await loadStickers();

	// Charge les images de l'utilisateur
	await loadUserPhotos();

	// Événements des boutons
	captureBtn.addEventListener('click', capturePhoto);
	toggleCameraBtn.addEventListener('click', toggleCamera);
	switchCameraBtn.addEventListener('click', switchCamera);

	// Événement pour le changement de taille du sticker
	stickerSize.addEventListener('input', function() {
		const value = stickerSize.value;
		stickerSizeValue.textContent = `${value}%`;

		// Met à jour la taille du dernier sticker sélectionné ou de tous les stickers
		if (selectedStickers.length > 0)
		{
			// Si des stickers sont sélectionnés, met à jour leur taille
			selectedStickers.forEach(sticker => {
				sticker.size = parseInt(value);
			});
			updateStickersPreview();
		}
	});

	// Événement pour le téléchargement d'image
	imageUpload.addEventListener('change', function() {
		if (imageUpload.files.length > 0)
		{
			// Affiche le nom du fichier sélectionné
			const fileName = imageUpload.files[0].name;
			document.querySelector('label[for="imageUpload"]').textContent = `Image: ${fileName}`;
		}
		else
			document.querySelector('label[for="imageUpload"]').textContent = 'Ou télécharger une image';
	});

	frameCount.addEventListener('change', function() {
		validateNumericInput(frameCount, 2, 10);
	});

	frameDelay.addEventListener('change', function() {
		validateNumericInput(frameDelay, 100, 1000);
	});

	// Vous pouvez également valider lors de la perte de focus
	frameCount.addEventListener('blur', function() {
		validateNumericInput(frameCount, 2, 10);
	});

	frameDelay.addEventListener('blur', function() {
		validateNumericInput(frameDelay, 100, 1000);
	});

	// Événement pour la création de GIF
	createGifCheckbox.addEventListener('change', function() {
		if (createGifCheckbox.checked)
			gifControls.classList.remove('d-none');
		else
			gifControls.classList.add('d-none');
	});
});
