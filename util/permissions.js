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
 * Combines network polling with an OS window refocus trigger to guarantee 
 * the video stream initializes instantly once permission is granted.
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

        // --- THE FIX: LIFECYCLE REFOCUS PROMISE TRIGGER ---
        // This forces the app to wait until the native dialog closes and the user returns to the view
        let standardPollingActive = true;
        
        const nativeRefocusEventGate = new Promise((resolve) => {
          const handleWindowRefocus = async () => {
            window.removeEventListener('focus', handleWindowRefocus);
            // Modal closed! Stop standard loop ticks and do a definitive final check
            standardPollingActive = false; 
            if (messageRef) messageRef.value = 'Processing native selection...';
            await sleep(300); // Allow Webview container threading to resume cleanly
            const finalCheck = await checkStatusMatrix();
            resolve(finalCheck === 'GRANTED');
          };
          window.addEventListener('focus', handleWindowRefocus);
        });

        // Background Polling Loop (acts as a backup if the Webview doesn't fire window focus)
        const runBackgroundFallbackPolling = async () => {
          const maxAttempts = 60;
          let currentAttempt = 0;
          
          while (currentAttempt < maxAttempts && standardPollingActive) {
            await sleep(1000); // 1-second ticks are safer for throttled backgrounds
            currentAttempt++;
            
            if (!standardPollingActive) break;
            
            const check = await checkStatusMatrix();
            if (check === 'GRANTED') return true;
            if (check === 'DENIED') return false;
          }
          return false;
        };

        // Race both the focus listener and the background loop to catch the first success
        if (messageRef) messageRef.value = 'Awaiting hardware clearance...';
        const isGranted = await Promise.race([nativeRefocusEventGate, runBackgroundFallbackPolling()]);

        // Clean up the window listener if the background loop won the race instead
        window.removeEventListener('focus', () => {});

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

  // 6. Native OS state layer is cleared! Initialize local hardware WebRTC media pipelines.
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

