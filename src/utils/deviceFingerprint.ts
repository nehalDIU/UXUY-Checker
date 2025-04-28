/**
 * Simple device fingerprinting utility that's less likely to be blocked by ad blockers
 */

export async function generateDeviceFingerprint(): Promise<string> {
  const components: string[] = [];
  
  // Browser information
  components.push(navigator.userAgent);
  components.push(navigator.language || 'unknown');
  
  // Screen properties
  components.push(`${window.screen.width}x${window.screen.height}`);
  components.push(`${window.screen.colorDepth}`);
  
  // Timezone
  components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);
  
  // Browser capabilities
  components.push(`${navigator.cookieEnabled}`);
  components.push(`${!!window.localStorage}`);
  components.push(`${!!window.sessionStorage}`);
  
  // Canvas fingerprinting (less aggressive - typically not blocked)
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Draw a simple shape with a gradient
      canvas.width = 200;
      canvas.height = 50;
      
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = '#000000';
      ctx.font = '14px Arial';
      ctx.fillText('Device ID', 15, 15);
      
      // Use a generic name for the data URL
      const dataUrl = canvas.toDataURL('image/png').slice(0, 100);
      components.push(dataUrl);
    }
  } catch (e) {
    components.push('canvas-error');
  }
  
  // Create a hash of all components
  const fingerprintString = components.join('###');
  
  // Simple hash function
  const hash = await simpleHash(fingerprintString);
  return hash;
}

// Simple hashing function using SubtleCrypto when available (falls back to simple string manipulation)
async function simpleHash(str: string): Promise<string> {
  // Try to use SubtleCrypto if available (more secure)
  if (window.crypto && window.crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(str);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      // Fall back to simple hashing
    }
  }
  
  // Simple fallback hash function
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
} 