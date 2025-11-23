import sharp from 'sharp';

/**
 * Fetches an image, resizes it, and encodes it to AVIF using Sharp.
 * @param {string} imageUrl - The source URL
 * @param {number} width - Target width
 * @returns {Promise<Buffer>} - The processed image buffer
 */
export async function processImage(imageUrl, width) {
	const response = await fetch(imageUrl);
	if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);

	const arrayBuffer = await response.arrayBuffer();
	const inputBuffer = Buffer.from(arrayBuffer);

	const outputBuffer = await sharp(inputBuffer)
		.resize({ 
			width, 
			withoutEnlargement: true,
			fit: 'cover'
		})
		.avif({ 
			quality: 75,
			effort: 4
		})
		.toBuffer();

	return outputBuffer;
}