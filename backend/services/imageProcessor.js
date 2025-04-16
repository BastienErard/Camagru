//##############################################################################################\\
//																								\\
//	Auteur		: 	Bastien Erard																\\
//	Version		: 	1.0																			\\
//	Créé le		: 	04.04.2025																	\\
//	Modifié le	:	04.04.2025																	\\
//	But			:	Service pour le traitement des images et création de GIF					\\
//																								\\
//##############################################################################################\\

const Jimp = require('jimp');
const GifEncoder = require('gif-encoder-2');
const fs = require('fs');
const path = require('path');
const { createWriteStream } = require('fs');

// Sauvegarde une image à partir d'une chaîne base64
async function saveImage(imageData, filePath)
{
	try
	{
		const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
		const buffer = Buffer.from(base64Data, 'base64');

		const image = await Jimp.read(buffer);

		const targetWidth = 640;
		const targetHeight = 480;

		// Crée une nouvelle image noire pour le fond
		const newImage = new Jimp(targetWidth, targetHeight, '#000000'); // fond noir

		// Redimensionne l'image pour s'adapter proportionnellement au canvas
		image.contain(targetWidth, targetHeight, Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE);

		// Composite l'image originale sur le fond noir pour centrer correctement
		newImage.composite(image, 0, 0);

		await newImage.writeAsync(filePath);

		return filePath;
	}
	catch (error)
	{
		console.error('Erreur lors de la sauvegarde de l\'image:', error);
		throw error;
	}
}

// Charge une image depuis une URL data ou un chemin de fichier
async function loadImage(source)
{
	try
	{
		if (typeof source === 'string' && source.startsWith('data:'))
		{
			const base64Data = source.replace(/^data:image\/\w+;base64,/, '');
			const buffer = Buffer.from(base64Data, 'base64');
			return await Jimp.read(buffer);
		}
		else
		{
			return await Jimp.read(source);
		}
	}
	catch (error)
	{
		console.error('Erreur lors du chargement de l\'image:', error);
		throw error;
	}
}

// Crée une miniature d'une image
async function createThumbnail(imageData, thumbnailPath, size = 100)
{
	try
	{
		// Charge l'image
		const image = await loadImage(imageData);

		// Calcule les dimensions proportionnelles
		const width = image.getWidth();
		const height = image.getHeight();
		const ratio = Math.min(size / width, size / height);
		const newWidth = Math.round(width * ratio);
		const newHeight = Math.round(height * ratio);

		// Redimensionne l'image
		const thumbnail = image.clone().resize(newWidth, newHeight);

		// Crée le répertoire si nécessaire
		const directory = path.dirname(thumbnailPath);
		if (!fs.existsSync(directory))
			fs.mkdirSync(directory, { recursive: true });

		// Sauvegarde la miniature
		await thumbnail.writeAsync(thumbnailPath);

		return thumbnailPath;
	}
	catch (error)
	{
		console.error('Erreur lors de la création de la miniature:', error);
		throw error;
	}
}

// Fusionne une image avec des stickers
async function mergeImagesWithStickers(imageData, stickers)
{
	try
	{
		const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
		const buffer = Buffer.from(base64Data, 'base64');
		let image = await Jimp.read(buffer);

		const targetWidth = 640;
		const targetHeight = 480;

		// Nouvelle image avec fond noir pour garantir dimensions fixes
		const finalImage = new Jimp(targetWidth, targetHeight, '#000000');

		// Adapter image principale aux dimensions fixes en conservant proportions
		image.contain(targetWidth, targetHeight, Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE);

		// Fusionne l'image originale centrée sur l'image noire
		finalImage.composite(image, 0, 0);

		// Traite chaque sticker
		for (const sticker of stickers)
		{
			const stickerImage = await Jimp.read(sticker.path);

			// Taille relative du sticker en fonction du canvas standardisé
			const stickerWidth = Math.round(targetWidth * sticker.scale);
			const stickerHeight = Math.round((stickerImage.getHeight() / stickerImage.getWidth()) * stickerWidth);

			// Redimensionne et pivote le sticker selon paramètres
			stickerImage.resize(stickerWidth, stickerHeight);
			if (sticker.rotation !== 0)
				stickerImage.rotate(sticker.rotation);

			// Calcul des coordonnées en tenant compte de l'effet miroir
			const x = Math.round(targetWidth * (1 - sticker.x) - stickerWidth / 2);
			const y = Math.round(targetHeight * sticker.y - stickerHeight / 2);

			finalImage.composite(stickerImage, x, y);
		}

		// Convertit l'image fusionnée en base64
		const finalBuffer = await finalImage.getBufferAsync(Jimp.MIME_PNG);
		return `data:image/png;base64,${finalBuffer.toString('base64')}`;
	}
	catch (error)
	{
		console.error('Erreur lors de la fusion des images:', error);
		throw error;
	}
}

// Crée un GIF animé à partir d'un tableau de frames
async function createGif(frames, outputPath, delay = 200, stickers = [])
{
	try
	{
		if (frames.length === 0)
			throw new Error('Aucune frame fournie');

		// Charge la première frame pour obtenir les dimensions
		const firstFrame = await loadImage(frames[0]);
		const width = firstFrame.getWidth();
		const height = firstFrame.getHeight();

		// Crée le répertoire si nécessaire
		const directory = path.dirname(outputPath);
		if (!fs.existsSync(directory))
			fs.mkdirSync(directory, { recursive: true });

		// Crée un encodeur GIF
		const encoder = new GifEncoder(width, height);
		const outputStream = createWriteStream(outputPath);
		encoder.createReadStream().pipe(outputStream);

		// Configure le GIF
		encoder.setDelay(delay);
		encoder.setRepeat(0); // 0 = boucle infinie
		encoder.setQuality(10);
		encoder.start();

		// Traite chaque frame
		for (const frameData of frames)
		{
			// Charge la frame
			let frame = await loadImage(frameData);

			// Applique les stickers à chaque frame si nécessaire
			if (stickers.length > 0)
			{
				for (const sticker of stickers)
				{
					// Charge le sticker
					const stickerImage = await Jimp.read(sticker.path);

					// Calcule les dimensions du sticker en fonction de l'échelle
					const stickerWidth = Math.round(width * sticker.scale);
					const stickerHeight = Math.round((stickerImage.getHeight() / stickerImage.getWidth()) * stickerWidth);

					// Redimensionne le sticker
					const resizedSticker = stickerImage.clone().resize(stickerWidth, stickerHeight);

					// Calcule la position du sticker (centré sur le point x,y)
					const x = Math.round(width * sticker.x - stickerWidth / 2);
					const y = Math.round(height * sticker.y - stickerHeight / 2);

					// Applique la rotation si nécessaire
					if (sticker.rotation !== 0)
						resizedSticker.rotate(sticker.rotation);

					// Colle le sticker sur l'image
					frame.composite(resizedSticker, x, y, {
						mode: Jimp.BLEND_SOURCE_OVER,
						opacitySource: 1,
						opacityDest: 1
					});
				}
			}

			// Convertit l'image Jimp en tableau de pixels pour le GIF
			const frameBuffer = await frame.getBufferAsync(Jimp.MIME_PNG);
			const frameImg = await Jimp.read(frameBuffer);
			const pixels = new Uint8Array(width * height * 4);

			let pixelIndex = 0;
			frameImg.scan(0, 0, width, height, function(x, y, idx) {
				pixels[pixelIndex++] = this.bitmap.data[idx + 0]; // R
				pixels[pixelIndex++] = this.bitmap.data[idx + 1]; // G
				pixels[pixelIndex++] = this.bitmap.data[idx + 2]; // B
				pixels[pixelIndex++] = this.bitmap.data[idx + 3]; // A
			});

			// Ajoute la frame au GIF
			encoder.addFrame(pixels);
		}

		// Finalise le GIF
		encoder.finish();

		return new Promise((resolve, reject) => {
			outputStream.on('finish', () => resolve(outputPath));
			outputStream.on('error', reject);
		});
	}
	catch (error)
	{
		console.error('Erreur lors de la création du GIF:', error);
		throw error;
	}
}

module.exports = {
	saveImage,
	createThumbnail,
	mergeImagesWithStickers,
	createGif
};
