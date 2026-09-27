/**
 * Utility function to safely copy text to clipboard.
 * Uses the modern Clipboard API with a fallback to the legacy execCommand method.
 * This prevents "The operation is insecure" errors in browsers that block the Clipboard API.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Try the modern Clipboard API first (requires HTTPS + user gesture)
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to legacy method
    }
  }

  // Fallback: legacy execCommand approach (works in more environments)
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;

    // Make the textarea out of viewport
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '-9999px';
    textArea.style.opacity = '0';
    textArea.setAttribute('readonly', '');

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  } catch {
    return false;
  }
}
