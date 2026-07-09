// Inside ./util/permissions.js -> requestCameraClearance()
// Locate the 'while (currentAttempt < maxAttempts)' loop block and replace it with this:

const maxAttempts = 120; // 1. Increased to 60 seconds max to account for user hesitation
let currentAttempt = 0;
let isGranted = false;

while (currentAttempt < maxAttempts) {
  await sleep(500);
  currentAttempt++;
  
  if (messageRef) messageRef.value = `Awaiting hardware clearance...`;

  try {
    const checkResponse = await fetch('/api/permissions/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadData)
    });

    if (checkResponse.ok) {
      const checkData = await checkResponse.json();
      
      // 2. Check for explicit approval
      if (checkData.permissions_matrix && checkData.permissions_matrix[cameraPermission] === 'GRANTED') {
        isGranted = true;
        break;
      }
      
      // 3. Proactive Safe-Exit: If the user explicitly tapped "Don't Allow", 
      // break out immediately instead of waiting for a timeout.
      if (checkData.permissions_matrix && checkData.permissions_matrix[cameraPermission] === 'DENIED') {
        break;
      }
    }
  } catch (pollErr) {
    console.warn('[WARNING] Active polling tick network hitch:', pollErr.message);
  }
}

if (!isGranted) {
  return { 
    success: false, 
    stream: null, 
    error: 'Camera permission denied or timed out.' 
  };
}

