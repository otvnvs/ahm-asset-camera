# Mobile Responsive Voice Recorder (Vue 3 Composition API)

A lightweight single-file Vue 3 component optimized for mobile environments. It features a dark theme layout, minimal inline SVG geometry, and automatic client-side storage persistence.

## Architecture and Implementation Details

To stay within browser memory constraints and prevent application crashes during long recording sessions, this project divides state management into a hybrid storage pipeline:

*   **IndexedDB (Database: A_DB, Store: b)**: Houses heavy binary payloads. Raw audio fragments are compiled into a unified Blob, shifted into an ArrayBuffer, and committed asynchronously via read/write transactions mapped to a precise millisecond timestamp ID.
*   **localStorage (Key: m)**: Manages the lightweight layout profile structure (names, text durations, tracking IDs). This enables instant layout hydration on startup without pulling bulky audio files down into volatile device memory.

### 1. Lazy Rehydration
Binary buffers remain un-hydrated in IndexedDB until a user presses the play button. The code extracts the specific ArrayBuffer on-demand, bundles it into an audio Object URL via URL.createObjectURL(blob), and applies it directly to the media runtime instance.

### 2. Performance and Memory Safety
*   **Hardware Release**: Hardware stream references generated during capturing are aggressively shut down using MediaStreamTrack.stop().
*   **Garbage Disposal**: During track deletions or component unmounting stages (onBeforeUnmount), temporary active browser asset references are systematically unlinked via URL.revokeObjectURL() to prevent memory leaks.

---

## Integration Blueprint

1. Save the template, logic, and style codebase modules together inside a singular file titled VoiceRecorder.vue.
2. Register and embed the compiled single file bundle straight inside your layout entry tree:

```vue
<script setup>
import VoiceRecorder from './components/VoiceRecorder.vue';
</script>

<template>
  <VoiceRecorder />
</template>
```
