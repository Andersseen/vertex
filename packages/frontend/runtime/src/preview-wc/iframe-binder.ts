/**
 * Sets iframe.src and returns a cleanup function that resets it to 'about:blank'.
 * Keeping this tiny helper separate makes it easy to unit-test without a real iframe.
 */
export function bindUrl(iframe: { src: string }, url: string): () => void {
  iframe.src = url
  return () => {
    iframe.src = 'about:blank'
  }
}
