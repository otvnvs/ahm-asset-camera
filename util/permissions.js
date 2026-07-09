// ./util/permissions.js

/**
 * Checks for hardware presence and requests explicit permission 
 * for video (camera) and optional audio (microphone).
 * @param {boolean} requireAudio - Toggle to dictate if microphone access is strict.
 * @returns {Promise<boolean>} True if clearance is obtained, false otherwise.
 */
export async function requestCameraClearance(requireAudio = true) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.error('Media devices API not supported in this environment.');
    return false;
  }

  try {
    // Attempt standard optimal stream constraints query
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: true, 
      audio: requireAudio 
    });
    
    // Immediately stop tracks to release hardware lock after clearance verification
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (err) {
    console.warn(`Initial media clearance failed: ${err.message}`);
    
    // Fallback logic path: attempt video-only clearance if audio was blocked/unavailable
    if (requireAudio) {
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
        fallbackStream.getTracks().forEach(track => track.stop());
        return true;
      } catch (fallbackErr) {
        console.error(`Absolute camera clearance denied: ${fallbackErr.message}`);
        return false;
      }
    }
    return false;
  }
}

