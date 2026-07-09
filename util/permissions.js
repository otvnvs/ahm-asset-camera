// ./util/permissions.js

/**
 * Utility helper to pause execution loop blocks asynchronously.
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Verifies if the browser client is running inside the application's native wrapper environment.
 */
const checkIsNativeEnvironment = async () => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);
    const response = await fetch('/api/app/device-status', { 
      method: 'GET', 
      signal: controller.signal 
    });
    clearTimeout(timeoutId);
    if (!response.ok) return false;
    const data = await response.json();
    return data.status === 'active';
  } catch (e) {
    return false;
  }
};

/**
 * Native-Aware Permission Clearance Pipeline for the Media Capture Engine.
 * Direct lifecycle implementation that gracefully handles webview thread freezing.
 * 
 * @param {string} facingMode - The active camera lens target alignment context ('user'|'environment').
 * @param {Ref} messageRef - Vue reactive text string tracker reference to push UI step warnings to.
 * @returns {Promise<{success: boolean, stream: MediaStream|null, error: string}>}
 */
export async function requestCameraClearance(facingMode = 'user', messageRef = null) {
  const cameraPermission = 'android.permission.CAMERA';
  const payloadData = { permissions: [cameraPermission] };

  // Helper inside the scope to check the database status matrix
  const checkStatusMatrix = async () => {
    try {
      const response = await fetch('/api/permissions/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadData)
      });
      if (response.ok) {
        const matrixData = await response.json();
        if (matrixData.permissions_matrix && matrixData.permissions_matrix[cameraPermission] === 'GRANTED') {
          return 'GRANTED';
        }
        if (matrixData.permissions_matrix && matrixData.permissions_matrix[cameraPermission] === 'DENIED') {
          return 'DENIED';
        }
      }
    } catch (e) {
      console.warn('[WARNING] Clearance matrix check hitch:', e.message);
    }
    return 'PENDING';
  };

  try {
    const isNative = await checkIsNativeEnvironment();
    
    if (!isNative) {
      console.log('-> [CAMERA-UTILS] Running in desktop dev browser fallback mode. Bypassing native hooks.');
    } else {
      if (messageRef) messageRef.value = 'Verifying hardware matrix permissions...';
      
      let currentStatus = await checkStatusMatrix();

      // If missing clearance, trigger the native asynchronous permission request bus
      if (currentStatus !== 'GRANTED') {
        if (messageRef) messageRef.value = 'Requesting system hardware access permissions...';
        
        const reqResponse = await fetch('/api/permissions/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payloadData)
        });

        if (reqResponse.status !== 202) {
          throw new Error(`Native permissions event bus rejected query with status: ${reqResponse.status}`);
        }

        // --- LIFECYCLE RESUMPTION INTERCEPTOR ---
        // Instead of running loops while the webview thread is frozen by the OS, 
        // we create a clean promise gate that resolves only when the app view regains active focus.
        const isGranted = await new Promise((resolve) => {
          const handleWindowRefocus = async () => {
            // Unbind immediately to avoid duplicate trigger memory leaks
            window.removeEventListener('focus', handleWindowRefocus);
            document.removeEventListener('visibilitychange', handleWindowRefocus);
            
            if (messageRef) messageRef.value = 'Processing native selection...';
            
            // Allow the webview engine a brief moment to unfreeze network threading channels
            await sleep(400);
            
            // Verify final selection state against the database matrix
            const finalCheck = await checkStatusMatrix();
            resolve(finalCheck === 'GRANTED');
          };

          // Listen for both focus and visibility changes to catch the dismiss action reliably across all webview versions
          window.addEventListener('focus', handleWindowRefocus);
          document.addEventListener('visibilitychange', handleWindowRefocus);
        });

        if (!isGranted) {
          return { 
            success: false, 
            stream: null, 
            error: 'Camera Access Denied. Camera permission is required to capture media.' 
          };
        }
      }
    }
  } catch (err) {
    console.error('Camera allocation transaction layer collapsed:', err.message);
    return { success: false, stream: null, error: 'System permission gateway communication failure.' };
  }

  // Native OS state layer is cleared! Initialize local hardware WebRTC media pipelines.
  if (messageRef) messageRef.value = 'Connecting to hardware device webcam channels...';
  
  try {
    const constraints = { 
      video: { facingMode }, 
      audio: true 
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    return { success: true, stream, error: '' };
    
  } catch (err) {
    console.warn(`[WARNING] Primary stream allocation failed: ${err.message}`);
    
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      return { success: false, stream: null, error: 'Access denied. Check browser app system settings.' };
    }
    
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

