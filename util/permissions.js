// ./util/permissions.js

/**
 * Validates security clearance via server API gateway, then verifies local browser hardware availability.
 * @param {string} facingMode - The active camera facing mode context ('user' or 'environment').
 * @returns {Promise<{success: boolean, stream: MediaStream|null, error: string}>}
 */
export async function requestCameraClearance(facingMode = 'user') {
  // 1. Dispatch structural verification request payload to your server API endpoint
  try {
    const apiResponse = await fetch('/api/permissions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requestedScope: 'video_capture',
        timestamp: Date.now()
      })
    });

    if (!apiResponse.ok) {
      const errorPayload = await apiResponse.json().catch(() => ({}));
      return {
        success: false,
        stream: null,
        error: errorPayload.message || 'Server rejected application permission scope.'
      };
    }
  } catch (apiErr) {
    console.error(`[ERROR] API permission gateway unreachable: ${apiErr.message}`);
    return {
      success: false,
      stream: null,
      error: 'Security verification failed. Network error.'
    };
  }

  // 2. Server clearance passed successfully; attempt to obtain optimal device stream
  try {
    const constraints = { 
      video: { facingMode }, 
      audio: true 
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    return { success: true, stream, error: '' };
    
  } catch (err) {
    console.warn(`[WARNING] Primary stream allocation failed: ${err.message}`);
    
    // If the browser explicitly blocked permission, fail immediately
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      return { success: false, stream: null, error: 'Access denied. Check browser app system settings.' };
    }
    
    // Resource busy or video source error: Attempt absolute fallback (video-only)
    try {
      const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
      return { success: true, stream: fallbackStream, error: 'fallback_no_audio' };
    } catch (fallbackErr) {
      console.error(`Absolute media lock failed: ${fallbackErr.message}`);
      
      let errorMsg = 'Access denied. Check browser app system settings.';
      if (fallbackErr.name === 'NotReadableError' || fallbackErr.message.includes('source')) {
        errorMsg = 'Camera resource is locked by another process.';
      }
      
      return { success: false, stream: null, error: errorMsg };
    }
  }
}

