export function createImageSet(src) {
  if (!src) return null;

  return {
    src: src,
    srcset: ''
  };
}
