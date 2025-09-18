import { dev } from '$app/environment';

const widths = [80, 150, 250, 400, 800, 1200];

/**
 * Creates a src and srcset for a Vercel-optimized image
 * In development, it returns the original src to avoid 404 errors
 * @param {string} src The original image URL.
 * @returns {{src: string, srcset: string} | null} An object with the base src and the full srcset string, or null if the original src is invalid
 */
export function createImageSet(src) {
  if (!src) {
    return null;
  }

  // Vercel Image Optimization only works in production
  // In dev, return the original URL to prevent 404 errors
  if (dev) {
    return {
      src: src,
      srcset: ''
    };
  }

  const generateUrl = (width) => {
    const encodedUrl = encodeURIComponent(src);
    return `/_vercel/image?url=${encodedUrl}&w=${width}&q=75`;
  };

  const srcset = widths.map(w => `${generateUrl(w)} ${w}w`).join(', ');

  return {
    src: generateUrl(widths[1]), // Use a small default size for the base src
    srcset: srcset,
  };
}
