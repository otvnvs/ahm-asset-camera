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
 * Coordinates system container authorization requests before validating local hardware streams.
 * 
 * @param {string} facingMode - The active camera lens target alignment context ('user'|'environment').
 * @param {Ref} messageRef - Vue reactive text string tracker reference to push UI step warnings to.
 * @returns {Promise<{success: boolean, stream: MediaStream|null, error: string}>}
 */
export async function requestCameraClearance(facingMode = 'user', messageRef = null) {
  const cameraPermission = 'android.permission.CAMERA';
  const payloadData = { permissions: [cameraPermission] };

  // 1. Evaluate Native environment wrapper vs. standard cross-platform desktop browser
  try {
    const isNative = await checkIsNativeEnvironment();
    
    if (!isNative) {
      console.log('-> [CAMERA-UTILS] Running in desktop dev browser fallback mode. Bypassing native hooks.');
    } else {
      // 2. Query system matrix to check if permission has already been verified as GRANTED
      if (messageRef) messageRef.value = 'Verifying hardware matrix permissions...';
      
      const statusResponse = await fetch('/api/permissions/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadData)
      });

      let alreadyGranted = false;
      if (statusResponse.ok) {
        const matrixData = await statusResponse.json();
        if (matrixData.permissions_matrix && matrixData.permissions_matrix[cameraPermission] === 'GRANTED') {
          console.log('-> [CAMERA-FAST-PATH] Camera permission already verified as GRANTED.');
          alreadyGranted = true;
        }
      }

      // 3. If missing clearance, trigger the native asynchronous permission request bus
      if (!alreadyGranted) {
        if (messageRef) messageRef.value = 'Requesting system hardware access permissions...';
        
        const reqResponse = await fetch('/api/permissions/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payloadData)
        });

        if (reqResponse.status !== 202) {
          throw new Error(`Native permissions event bus rejected query with status: ${reqResponse.status}`);
        }

        // 4. Enter structured polling loop block waiting for the user to tap "Allow" 
        const maxAttempts = 60;
        let currentAttempt = 0;
        let isGranted = false;

        while (currentAttempt < maxAttempts) {
          await sleep(500);
          currentAttempt++;
          
          if (messageRef) messageRef.value = `Awaiting hardware clearance... (${currentAttempt})`;

          const checkResponse = await fetch('/api/permissions/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadData)
          });

          if (checkResponse.ok) {
            const checkData = await checkResponse.json();
            if (checkData.permissions_matrix && checkData.permissions_matrix[cameraPermission] === 'GRANTED') {
              isGranted = true;
              break;
            }
          }
        }

        // Absolute failure exit if the user rejects the system modal or polling timeouts
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

  // 5. Native OS state layer is cleared! Initialize local hardware WebRTC media pipelines.
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
    
    // Fail immediately if explicitly blocked at browser/WebView internal privacy constraints layer
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      return { success: false, stream: null, error: 'Access denied. Check browser app system settings.' };
    }
    
    // Resource busy or audio source track collision: Attempt video-only fallback allocation
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

