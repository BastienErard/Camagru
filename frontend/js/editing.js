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
let ctx = canvas.getContext('2d', { willReadFrequently: true });
let stream = null;
let currentCameraIndex = 0;
let availableCameras = [];
let cameraActive = false;
let labelListener = false;

// Variables pour les stickers
let stickersContainer = document.getElementById('stickersContainer');
let stickersPreview = document.getElementById('stickersPreview');
let selectedStickers = [];
let stickers = [];
let stickerSize = document.getElementById('stickerSize');
let stickerSizeValue = document.getElementById('stickerSizeValue');
const MAX_STICKERS = 3;

// Variable pour suivre le sticker actuellement sélectionné
let currentSelectedSticker = null;

// Variables pour la rotation
let isRotating = false;
let rotationOrigin = { x: 0, y: 0 };

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

// Vérifie que l'utilisateur est connecté
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

		createGifCheckbox.disabled = true;
	}
	else
	{
		await initCamera();
		if (stream)
		{
			toggleCameraBtn.innerHTML = 'Désactiver la caméra';
			cameraActive = true;

			// Supprime l'image téléchargée si présente
			const existingImg = document.getElementById('uploadedImagePreview');
			if (existingImg)
				existingImg.remove();

			video.style.display = 'block';

			// Réinitialise l'input file
			imageUpload.value = '';
			document.querySelector('label[for="imageUpload"]').textContent = 'Ou télécharger une image';

			createGifCheckbox.disabled = false;
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

				// Si le sticker supprimé était celui sélectionné, réinitialiser currentSelectedSticker
				if (currentSelectedSticker === existingIndex)
					currentSelectedSticker = null;
				// Si le sticker supprimé était avant celui sélectionné, ajuster l'index
				else if (currentSelectedSticker !== null && currentSelectedSticker > existingIndex)
					currentSelectedSticker--;
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
					size: 30,
					rotation: 0
				});

				// Définir le nouveau sticker comme sticker actif
				currentSelectedSticker = selectedStickers.length - 1;

				// Mettre à jour l'interface
				stickerSize.value = 30;
				stickerSizeValue.textContent = "30%";

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
	{
	currentSelectedSticker = null;
	return;
	}

	selectedStickers.forEach((sticker, index) => {
		const stickerImg = document.createElement('img');
		stickerImg.src = sticker.file_path;
		stickerImg.alt = sticker.name;
		stickerImg.className = 'selected-sticker';

		if (currentSelectedSticker === index)
			stickerImg.classList.add('selected-sticker-active');

		// taille, position et rotation
		stickerImg.style.width = `${sticker.size}%`;
		stickerImg.style.left = `${sticker.x}%`;
		stickerImg.style.top = `${sticker.y}%`;
		stickerImg.style.transform = `translate(-50%, -50%) scaleX(-1) rotate(${sticker.rotation}deg)`;
		stickerImg.dataset.index = index;

		//  - Shift+glisser ou clic droit+glisser => rotation libre
		//  - clic gauche + glisser => déplacement
		stickerImg.addEventListener('mousedown', function(e) {
			e.stopPropagation();
			currentSelectedSticker = index;
			updateStickersPreview();

			// rotation
			if (e.shiftKey || e.button === 2)
			startStickerRotation(e, index);

			// déplacement
			else if (e.button === 0)
			startDrag(e, index);
		});

		// empêche le menu contextuel sur clic droit
		stickerImg.addEventListener('contextmenu', e => e.preventDefault());

		stickersPreview.appendChild(stickerImg);
	});

	// désélection quand on clique sur le fond
	stickersPreview.addEventListener('click', e => {
		if (e.target === stickersPreview)
		{
			currentSelectedSticker = null;
			updateStickersPreview();
		}
	});
}

// Fonction pour faire pivoter les stickers
function startStickerRotation(e, index)
{
	e.preventDefault();
	e.stopPropagation();

	// Sélectionne le sticker
	currentSelectedSticker = index;
	updateStickersPreview();

	const sticker = selectedStickers[index];
	const stickerElement = document.querySelector(`.selected-sticker[data-index="${index}"]`);
	const containerRect = stickersPreview.getBoundingClientRect();

	// Calcule le centre du sticker
	const centerX = containerRect.left + (containerRect.width * sticker.x / 100);
	const centerY = containerRect.top + (containerRect.height * sticker.y / 100);

	// Angle initial
	const initialAngle = Math.atan2(
		e.clientY - centerY,
		e.clientX - centerX
	) * (180 / Math.PI);

	// Rotation initiale
	const initialRotation = sticker.rotation;

	function onMouseMove(e)
	{
		// Calcul du nouvel angle
		const newAngle = Math.atan2(
			e.clientY - centerY,
			e.clientX - centerX
		) * (180 / Math.PI);

		// Différence d'angle
		const angleDiff = newAngle - initialAngle;

		// Appliquer la nouvelle rotation
		sticker.rotation = initialRotation + angleDiff;

		// Mettre à jour l'affichage
		stickerElement.style.transform = `translate(-50%, -50%) scaleX(-1) rotate(${sticker.rotation}deg)`;
	}

	function onMouseUp()
	{
		document.removeEventListener('mousemove', onMouseMove);
		document.removeEventListener('mouseup', onMouseUp);
	}

	document.addEventListener('mousemove', onMouseMove);
	document.addEventListener('mouseup', onMouseUp);
}

// Gestion du drag and drop pour les stickers
function startDrag(e, index)
{
	e.preventDefault();

	// Assure que l'index est défini
	const stickerIndex = (index !== undefined) ? index : parseInt(e.target.dataset.index, 10);

	// Récupère les dimensions du conteneur
	const containerRect = stickersPreview.getBoundingClientRect();

	function moveAt(clientX, clientY)
	{
		// Calcule la position relative en pourcentage
		// Inversion de l'axe X pour l'effet miroir
		const x = 100 - ((clientX - containerRect.left) / containerRect.width) * 100;
		const y = ((clientY - containerRect.top) / containerRect.height) * 100;

		// Limite la position pour que le sticker ne sorte pas du cadre
		selectedStickers[stickerIndex].x = Math.max(0, Math.min(100, x));
		selectedStickers[stickerIndex].y = Math.max(0, Math.min(100, y));

		// Met à jour la position dans le DOM
		const img = document.querySelector(`.selected-sticker[data-index="${stickerIndex}"]`);
		if (img)
		{
			img.style.left = `${selectedStickers[stickerIndex].x}%`;
			img.style.top  = `${selectedStickers[stickerIndex].y}%`;
		}
	}

	function onMouseMove(e)
	{
		moveAt(e.clientX, e.clientY);
	}

	function onMouseUp()
	{
		document.removeEventListener('mousemove', onMouseMove);
		document.removeEventListener('mouseup', onMouseUp);
	}

	document.addEventListener('mousemove', onMouseMove);
	document.addEventListener('mouseup', onMouseUp, { once: true });
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
			const lightbox = document.getElementById('lightbox');
			const lightboxImg = document.getElementById('lightbox-img');
			lightboxImg.src = photo.file_path;
			lightbox.style.display = 'flex';
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
	// Crée une confirmation inline
	const photoElement = document.querySelector(`[data-photo-id="${photoId}"]`).closest('.position-relative');

	// Sauvegarde l'état original
	const originalHTML = photoElement.innerHTML;

	// Remplace par la confirmation
	photoElement.innerHTML = `
		<div class="confirmation-delete p-2 text-center">
			<p class="small mb-2">Supprimer?</p>
			<div class="d-flex justify-content-between">
				<button class="btn btn-sm btn-secondary btn-cancel">Non</button>
				<button class="btn btn-sm btn-danger btn-confirm">Oui</button>
			</div>
		</div>
	`;

	// Ajoute les écouteurs
	photoElement.querySelector('.btn-cancel').addEventListener('click', () => {
		photoElement.innerHTML = originalHTML;
		// Réattache l'événement de suppression
		photoElement.querySelector('.delete-thumbnail').addEventListener('click', (e) => {
			e.stopPropagation();
			deletePhoto(photoId);
		});
	});

	photoElement.querySelector('.btn-confirm').addEventListener('click', async () => {
		try
		{
			const response = await fetch(`${EDITING_API_URL}/photos/${photoId}`, {
				method: 'DELETE',
				...editingFetchOptions
			});

			if (!response.ok)
				throw new Error('Erreur lors de la suppression');

			const data = await response.json();

			if (data.success)
			{
				showSuccess('Photo supprimée avec succès');
				loadUserPhotos();
			}
			else
			{
				showError(data.message || 'Impossible de supprimer la photo');
				photoElement.innerHTML = originalHTML;
			}
		}
		catch (error)
		{
			console.error('Erreur:', error);
			showError('Erreur lors de la suppression');
			photoElement.innerHTML = originalHTML;
		}
	});
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
		if (!cameraActive)
		{
			showError('La création de GIF nécessite une caméra active');
			return;
		}
		await captureGif();
		return;
	}

	// Vérifie s'il s'agit d'une image upload au lieu d'utiliser la webcam
	if (imageUpload.files[0])
	{
		await processUploadImage();
		return;
	}

	if (cameraActive)
	{
		canvas.width = video.videoWidth;
		canvas.height = video.videoHeight;

		// Dessine sur le canvas
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

		// Applique l'effet miroir
		applyMirrorEffectToCanvas();

		// Transforme le canvas en une chaine Base64
		const imageData = canvas.toDataURL('image/png');

		// Envoie au serveur
		await saveImage(imageData);
	}
}

// Applique l'effet miroir au canvas pour correspondre à la prévisualisation
function applyMirrorEffectToCanvas()
{
	ctx.save();

	// Création d'une copie de l'image actuelle
	const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	// Applique un effet miroir
	ctx.scale(-1, 1);
	ctx.translate(-canvas.width, 0);

	// Création d'un canva temporaire
	const tempCanvas = document.createElement('canvas');
	tempCanvas.width = canvas.width;
	tempCanvas.height = canvas.height;
	const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
	tempCtx.putImageData(imgData, 0, 0);

	// Dessin sur le canva définitif
	ctx.drawImage(tempCanvas, 0, 0);

	ctx.restore();
}

// Fonction pour afficher le contenu du canvas sur la vidéo
function displayCanvasOnVideo()
{
	// Crée une image temporaire pour afficher le canvas
	const tempImg = document.createElement('img');
	tempImg.src = canvas.toDataURL('image/png');
	tempImg.style.width = '100%';
	tempImg.style.height = '100%';
	tempImg.style.objectFit = 'contain';
	tempImg.id = 'uploadedImagePreview';

	// Supprimer l'image précédente si elle existe
	const existingImg = document.getElementById('uploadedImagePreview');
	if (existingImg)
		existingImg.remove();

	// Ajouter l'image au conteneur vidéo
	video.style.display = 'none';
	videoContainer.insertBefore(tempImg, stickersPreview);
}

// Fonction pour prévisualiser l'image téléchargée
function previewUploadedImage()
{
	const file = imageUpload.files[0];
	if (!file)
		return;

	const reader = new FileReader();
	reader.onload = function(e) {
		const img = new Image();
		img.onload = function() {
			const canvasWidth = 640;
			const canvasHeight = 480;

			canvas.width = canvasWidth;
			canvas.height = canvasHeight;

			// Calcule l'échelle proportionnelle pour éviter les déformations
			let scale = Math.min(canvasWidth / img.width, canvasHeight / img.height);

			// Calcule les coordonnées pour centrer l'image sur le canvas
			let x = (canvasWidth / 2) - (img.width / 2) * scale;
			let y = (canvasHeight / 2) - (img.height / 2) * scale;

			// Remplit le canvas en noir pour avoir des bandes noires autour si nécessaire
			ctx.fillStyle = 'black';
			ctx.fillRect(0, 0, canvasWidth, canvasHeight);

			// Dessine l'image centrée et redimensionnée proportionnellement
			ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

			// Affiche le canvas comme prévisualisation
			displayCanvasOnVideo();

			// Désactive l'option GIF quand on utilise une image uploadée
			createGifCheckbox.disabled = true;
			createGifCheckbox.checked = false;
			gifControls.classList.add('d-none');
		};
		img.src = e.target.result;
	};
	reader.readAsDataURL(file);
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
				try
				{
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

					// Réinitialise complètement l'input file pour permettre de sélectionner le même fichier à nouveau
					imageUpload.value = '';
					const uploadLabel = document.querySelector('label[for="imageUpload"]');
					if (uploadLabel)
						uploadLabel.childNodes[0].nodeValue = 'Ou télécharger une image ';

					// Supprimer la prévisualisation après sauvegarde
					const existingImg = document.getElementById('uploadedImagePreview');
					if (existingImg)
						existingImg.remove();

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
			rotation: -sticker.rotation
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

			// Réinitialise la sélection des stickers
			selectedStickers = [];
			currentSelectedSticker = null;

			// Mets à jour l'affichage des stickers dans le conteneur
			const stickerImgs = document.querySelectorAll('#stickersContainer img');
			stickerImgs.forEach(img => {
				img.style.opacity = '0.7';
				img.classList.remove('sticker-selected');
			});

			// Mets à jour l'aperçu (vide les stickers de la prévisualisation)
			updateStickersPreview();
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
	if (value < min || isNaN(value))
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

			// Applique l'effet miroir au canvas
			applyMirrorEffectToCanvas();

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
			x: sticker.x / 100,
			y: sticker.y / 100,
			scale: sticker.size / 100,
			rotation: -sticker.rotation
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

			// Réinitialise la sélection des stickers
			selectedStickers = [];
			currentSelectedSticker = null;

			// Mets à jour l'affichage des stickers dans le conteneur
			const stickerImgs = document.querySelectorAll('#stickersContainer img');
			stickerImgs.forEach(img => {
				img.style.opacity = '0.7';
				img.classList.remove('sticker-selected');
			});

			// Mets à jour l'aperçu (vide les stickers de la prévisualisation)
			updateStickersPreview();
		}
		else
			showError(data.message || 'Impossible de créer le GIF');

		gifProgressContainer.classList.add('d-none');
		captureBtn.disabled = false;
	}
	catch (error)
	{
		console.error('Erreur:', error);
		showError('Une erreur est survenue lors de la création du GIF');

		gifProgressContainer.classList.add('d-none');
		captureBtn.disabled = false;
	}
}

// Initialisation des écouteurs d'événements
document.addEventListener('DOMContentLoaded', async function()
{
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

		// Met à jour la taille du sticker sélectionné uniquement
		if (currentSelectedSticker !== null && selectedStickers[currentSelectedSticker])
		{
			selectedStickers[currentSelectedSticker].size = parseInt(value);
			updateStickersPreview();
		}
	});

	// Concerne la prévisualisation de l'image de la galerie
	document.querySelector('.close-lightbox').addEventListener('click', () => {
		document.getElementById('lightbox').style.display = 'none';
	});

	// Ferme dans le cas où on clique en dehors
	document.getElementById('lightbox').addEventListener('click', (e) => {
		if (e.target === document.getElementById('lightbox'))
			document.getElementById('lightbox').style.display = 'none';
	});

	// Événement pour le téléchargement d'image
	imageUpload.addEventListener('change', function() {
		if (imageUpload.files.length > 0)
		{
			// Affiche le nom du fichier sélectionné
			const fileName = imageUpload.files[0].name;
			const uploadLabel = document.querySelector('label[for="imageUpload"]');
			if (uploadLabel)
				uploadLabel.childNodes[0].nodeValue = `Image: ${fileName} `;

			// Désactive la caméra si elle est active
			if (cameraActive)
				toggleCamera();

			// Prévisualise l'image
			previewUploadedImage();
		}
		else
		{
			const uploadLabel = document.querySelector('label[for="imageUpload"]');
			if (uploadLabel)
				uploadLabel.childNodes[0].nodeValue = 'Ou télécharger une image ';
		}
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
