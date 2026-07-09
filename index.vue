<template>
<div class="c">
  <!-- Immersive Fullscreen Background Camera Streaming Feed -->
  <video v-show="cam" ref="vd" autoplay playsinline muted class="bg-v"></video>

  <!-- Native Active Media Expanded Preview Player Container Layer -->
  <div v-if="prvUrl" class="bg-v p-lay">
    <video v-if="prvType==='vid'" :src="prvUrl" autoplay controls playsinline class="p-media"></video>
    <img v-else :src="prvUrl" class="p-media" alt="Expanded preview frame asset"/>
    <button @click="clsPrv" class="btn-close cls-top">Close Preview</button>
  </div>
  
  <main class="k">
    <header class="h">
      <h1>Media Capture</h1>
      <p :class="['s', {a:cam}]">{{m}}</p>
    </header>

    <div v-if="!cam && !showGal" class="v">
      <button @click="sCam" class="btn-activate">Enable Camera</button>
    </div>

    <!-- Active Capture Toolbar Control Layout Overlays -->
    <div v-if="cam" class="o">
      <button @click="tgFace" class="n n-o" aria-label="Flip Camera">
        <svg class="i" viewBox="0 0 24 24"><path d="M16 17.01V10h-2v7.01h-3L15 21l4-3.99h-3zM9 3L5 6.99h3V14h2V6.99h3L9 3z"/></svg>
      </button>

      <!-- Dual-Action Long Press Trigger Button Controller -->
      <button 
        @mousedown="hStart" 
        @touchstart="hStart" 
        @mouseup="hEnd" 
        @touchend="hEnd" 
        :class="['n', 'n-p', {recording: isRec}]" 
        aria-label="Capture action controller button"
      >
        <svg class="i" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10"/>
        </svg>
      </button>

      <button @click="tgGal" class="n n-o" aria-label="View Gallery">
        <svg class="i" viewBox="0 0 24 24"><path d="M22 16V4c0-1.1-.9-2-2-2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2zm-11-4l2.03 2.71L16 11l4 5H8l3-4zM2 6v14c0 1.1.9 2 2 2h14v-2H4V6H2z"/></svg>
      </button>
    </div>

    <!-- Sliding App Gallery Overlay Windows Drawer Section -->
    <section v-if="showGal" class="g">
      <div class="g-h">
        <h2>Gallery ({{l.length}})</h2>
        <button @click="tgGal" class="btn-close">Close</button>
      </div>
      <p v-if="!l.length" class="empty-txt">No media captured yet</p>
      <ul v-else class="u">
        <li v-for="t in l" :key="t.id" class="x">
          <div class="th-c">
            <video v-if="t.t==='vid'" :src="t.u||gMed(t)" class="th-i" muted></video>
            <img v-else :src="t.u||gMed(t)" class="th-i" alt="Thumbnail display preview frame"/>
          </div>
          <div class="j">
            <input v-if="eId===t.id" ref="eIn" v-model="eNm" @blur="sN(t)" @keyup.enter="sN(t)" class="rn-i"/>
            <span v-else @click="eT(t)" class="y">{{t.n}}</span>
            <span class="z">{{t.d}} • {{t.t==='vid'?'Video':'Photo'}}</span>
          </div>
          <div class="q">
            <button @click="vMed(t)" class="a-b" aria-label="View asset item">
              <svg class="i-s" viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
            </button>
            <button @click="d(t.id)" class="a-b d-b" aria-label="Delete asset item">
              <svg class="i-s" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
            </button>
          </div>
        </li>
      </ul>
    </section>
  </main>
  <canvas ref="cv" style="display:none"></canvas>
</div>
</template>

<script setup>
import {ref,onBeforeUnmount,nextTick} from 'vue';
import { requestCameraClearance } from './util/permissions.js';
const m=ref('Camera access required'),l=ref([]),cv=ref(null),vd=ref(null),eId=ref(null),eNm=ref(''),eIn=ref(null),cam=ref(!1),face=ref('user'),showGal=ref(!1),isRec=ref(!1);
const prvUrl=ref(''),prvType=ref('');
let db=null,stStream=null,pressTimer=null,vRec=null,vChunks=[],isLongPress=!1;

const DB_NAME = 'MEDIA_STORE_V5';
const req=indexedDB.open(DB_NAME,1);
req.onupgradeneeded=e=>e.target.result.createObjectStore('media');
req.onsuccess=e=>{
db=e.target.result;
const mf=JSON.parse(localStorage.getItem('m_gal_v5')||'[]');
l.value=mf.map(t=>({...t,u:''}));
};

function sM(){localStorage.setItem('m_gal_v5',JSON.stringify(l.value.map(t=>({id:t.id,n:t.n,d:t.d,t:t.t}))));}

//async function sCam() {
//stCamStop();showGal.value=!1;m.value='Connecting to stream...';
//try {
//// Fallback configuration strategy: Request raw properties first to maximize hardware permission approvals
//const constraints={video:{facingMode:face.value},audio:true};
//stStream=await navigator.mediaDevices.getUserMedia(constraints);
//if(vd.value){
//vd.value.srcObject=stStream;
//// Force immediate execution hook for mobile devices
//vd.value.setAttribute('playsinline',true);
//vd.value.setAttribute('muted',true);
//await vd.value.play();
//cam.value=!0;m.value='Camera active';
//}
//}catch(err){
//m.value='Hardware fallback initiated...';
//try{
//// Fallback setup: Retry execution paths without requesting audio channels
//stStream=await navigator.mediaDevices.getUserMedia({video:true});
//if(vd.value){
//vd.value.srcObject=stStream;
//await vd.value.play();
//cam.value=!0;m.value='Camera active (No audio)';
//}
//}catch(fallbackErr){
//m.value='Access denied. Check browser app system settings.';
//}
//}
//}
//async function sCam() {
//  stCamStop();
//  showGal.value = !1;
//  m.value = 'Requesting hardware clearance...';
//
//  // 1. Evaluate explicit permission before accessing the active viewport stream
//  const hasClearance = await requestCameraClearance(true);
//  if (!hasClearance) {
//    m.value = 'Access denied. Check browser app system settings.';
//    return; // Fast-exit out of execution flow before hardware configuration blocks crash
//  }
//
//  m.value = 'Connecting to stream...';
//  try {
//    // 2. Hardware is confirmed clear; safely spin up device streams
//    const constraints = { video: { facingMode: face.value }, audio: true };
//    stStream = await navigator.mediaDevices.getUserMedia(constraints);
//    if (vd.value) {
//      vd.value.srcObject = stStream;
//      vd.value.setAttribute('playsinline', true);
//      vd.value.setAttribute('muted', true);
//      await vd.value.play();
//      cam.value = !0;
//      m.value = 'Camera active';
//    }
//  } catch (err) {
//    // 3. Handle specific stream assignment fallback cases (e.g. mic in use by another app)
//    m.value = 'Hardware fallback initiated...';
//    try {
//      stStream = await navigator.mediaDevices.getUserMedia({ video: true });
//      if (vd.value) {
//        vd.value.srcObject = stStream;
//        await vd.value.play();
//        cam.value = !0;
//        m.value = 'Camera active (No audio)';
//      }
//    } catch (fallbackErr) {
//      m.value = 'Access denied. Check browser app system settings.';
//    }
//  }
//}
// Inside index.vue -> sCam()
async function sCam() {
  // Clear any dangling references completely to prevent hardware lock collisions
  stCamStop();
  showGal.value = !1;
  m.value = 'Initializing camera matrix...';

  // Request native OS matrix permission and wait for loop confirmation
  const result = await requestCameraClearance(face.value, m);

  if (!result.success) {
    m.value = result.error;
    return;
  }

  // Bind the approved stream immediately
  stStream = result.stream;

  // NextTick ensures Vue has finished updating the DOM layout before binding hardware sources
  nextTick(async () => {
    if (vd.value) {
      try {
        vd.value.srcObject = stStream;
        vd.value.setAttribute('playsinline', true);
        vd.value.setAttribute('muted', true);
        
        // Force execution play down the WebRTC hardware pipeline channel immediately
        await vd.value.play();
        cam.value = !0;
        
        if (result.error === 'fallback_no_audio') {
          m.value = 'Camera active (No audio)';
        } else {
          m.value = 'Camera active';
        }
      } catch (playErr) {
        console.error('Video viewport play failure:', playErr);
        m.value = 'Streaming viewport initialization failed.';
      }
    }
  });
}


function stCamStop(){
if(stStream){stStream.getTracks().forEach(t=>t.stop());stStream=null;}
cam.value=!1;
}

function tgFace(){face.value=face.value==='user'?'environment':'user';sCam();}
function tgGal(){showGal.value=!showGal.value;if(showGal.value)stCamStop();else sCam();}

function hStart(e){
isLongPress=!1;
pressTimer=setTimeout(()=>{isLongPress=!0;sVidRec();},500);
}

function hEnd(e){
clearTimeout(pressTimer);
if(isLongPress){eVidRec();}else{tkPic();}
}

function tkPic(){
const vEl=vd.value,cEl=cv.value;if(!vEl||!stStream||!cEl||isRec.value)return;
const w=vEl.videoWidth||640,h=vEl.videoHeight||480;
cEl.width=w;cEl.height=h;
cEl.getContext('2d').drawImage(vEl,0,0,w,h);
try {
const dataUrl = cEl.toDataURL('image/jpeg',0.85);
const id=Date.now(),dt=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
const tx=db.transaction('media','readwrite');
tx.objectStore('media').put({data:dataUrl,type:'img'},id);
tx.oncomplete=()=>{
l.value.push({id,n:`Photo ${l.value.length+1}`,d:dt,t:'img',u:dataUrl});
sM();m.value='Photo Saved';setTimeout(()=>m.value='Camera active',1000);
};
}catch(e){m.value='Photo process error';}
}

function sVidRec(){
if(!stStream||isRec.value)return;
vChunks=[];
const opts={mimeType:MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?'video/webm;codecs=vp9':'video/webm'};
try{
vRec=new MediaRecorder(stStream,opts);
vRec.ondataavailable=e=>e.data.size>0&&vChunks.push(e.data);
vRec.onstop=async()=>{
const b=new Blob(vChunks,{type:'video/webm'});
const id=Date.now(),dt=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
const reader=new FileReader();
reader.onloadend=()=>{
const tx=db.transaction('media','readwrite');
tx.objectStore('media').put({data:reader.result,type:'vid'},id);
tx.oncomplete=()=>{
const localUrl=URL.createObjectURL(b);
l.value.push({id,n:`Video ${l.value.length+1}`,d:dt,t:'vid',u:localUrl});
sM();m.value='Video Saved';setTimeout(()=>m.value='Camera active',1000);
};
};
reader.readAsArrayBuffer(b);
};
vRec.start();isRec.value=!0;m.value='Recording video...';
}catch(e){m.value='Recording error';}
}

function eVidRec(){if(vRec&&vRec.state==='recording'){vRec.stop();isRec.value=!1;}}

function eT(t){eId.value=t.id;eNm.value=t.n;nextTick(()=>{if(eIn.value)eIn.value.focus();});}
function sN(t){if(eId.value===null)return;const nm=eNm.value.trim();if(nm)t.n=nm;eId.value=null;sM();}

function vMed(t){
if(t.u && !t.u.startsWith('data:')){
prvUrl.value=t.u;prvType.value=t.t;return;
}
const tx=db.transaction('media','readonly');
tx.objectStore('media').get(t.id).onsuccess=e=>{
const res=e.target.result;if(!res)return;
if(res.type==='vid'){
const b=new Blob([res.data],{type:'video/webm'});
t.u=URL.createObjectURL(b);
}else{t.u=res.data;}
prvUrl.value=t.u;prvType.value=t.t;
};
}

function clsPrv(){
if(prvUrl.value && prvType.value==='vid' && prvUrl.value.startsWith('blob:')){
URL.revokeObjectURL(prvUrl.value);
const matched=l.value.find(t=>t.u===prvUrl.value);
if(matched)matched.u='';
}
prvUrl.value='';prvType.value='';
}

function gMed(t){
if(t.u)return t.u;
const tx=db.transaction('media','readonly');
tx.objectStore('media').get(t.id).onsuccess=e=>{
const res=e.target.result;if(!res)return;
if(res.type==='vid'){
const b=new Blob([res.data],{type:'video/webm'});
t.u=URL.createObjectURL(b);
}else{t.u=res.data;}
};
return '';
}

function d(id){
const i=l.value.findIndex(t=>t.id===id);
if(i!==-1){
const t=l.value[i];if(t.u&&t.u.startsWith('blob:'))URL.revokeObjectURL(t.u);
if(prvUrl.value===t.u)clsPrv();
l.value.splice(i,1);sM();
const tx=db.transaction('media','readwrite');tx.objectStore('m').delete(id);
}
}
onBeforeUnmount(()=>{stCamStop();l.value.forEach(t=>t.u&&t.u.startsWith('blob:')&&URL.revokeObjectURL(t.u));});
</script>

<style scoped>
:deep(*){box-sizing:border-box;margin:0;padding:0;user-select:none;-webkit-user-select:none;}
.c{display:flex;justify-content:center;align-items:center;min-height:100vh;background:#000;color:#e2e8f0;font-family:system-ui;position:relative;overflow:hidden;}
.bg-v{position:absolute;top:0;left:0;width:100vw;height:100vh;object-fit:cover;z-index:1;background:#000;}
.p-lay{z-index:10;display:flex;justify-content:center;align-items:center;background:#000;pointer-events:auto;}
.p-media{max-width:100%;max-height:100vh;object-fit:contain;z-index:11;}
.cls-top{position:absolute;top:24px;right:24px;z-index:12;background:rgba(239,68,68,0.9);color:#fff;}
.k{position:relative;z-index:2;width:100%;max-width:440px;height:100vh;display:flex;flex-direction:column;justify-content:space-between;padding:24px;pointer-events:none;}
.h, .o, .v, .g{pointer-events:auto;}
.h{text-align:center;background:rgba(26,29,36,0.75);backdrop-filter:blur(8px);padding:16px;border-radius:16px;}
.h h1{font-size:1.3rem;font-weight:600;color:#f8fafc;margin-bottom:4px;}
.s{font-size:.8rem;color:#94a3b8;transition:color .3s;}
.a{color:#10b981;}
.v{display:flex;justify-content:center;align-items:center;flex:1;}
.btn-activate{background:#3b82f6;color:#fff;border:none;padding:14px 28px;border-radius:30px;font-size:1rem;font-weight:600;cursor:pointer;box-shadow:0 4px 14px rgba(59,130,246,0.4);-webkit-tap-highlight-color:transparent;}
.o{display:flex;justify-content:center;align-items:center;gap:24px;background:rgba(26,29,36,0.75);backdrop-filter:blur(8px);padding:16px;border-radius:32px;margin-bottom:24px;}
.n{display:flex;justify-content:center;align-items:center;border-radius:50%;border:none;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:transform .2s, background-color 0.2s;}
.n:active{transform:scale(.92);}
.n-o{width:48px;height:48px;background:#2d3139;}
.n-p{width:64px;height:64px;background:#10b981;}
.n-p.recording{background:#ef4444;animation:pulse 1.5s infinite;transform:scale(1.1);}
@keyframes pulse{0%{box-shadow:0 0 0 0 rgba(239,68,68,0.7);}70%{box-shadow:0 0 0 15px rgba(239,68,68,0);}\100%{box-shadow:0 0 0 0 rgba(239,68,68,0);}}
.i{width:24px;height:24px;fill:#fff;}
.g{position:absolute;inset:0;background:#1a1d24;padding:24px;display:flex;flex-direction:column;z-index:5;}
.g-h{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;border-bottom:1px solid #2d3139;padding-bottom:12px;}
.g-h h2{font-size:1.2rem;color:#f8fafc;}
.btn-close{background:#2d3139;color:#f8fafc;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;-webkit-tap-highlight-color:transparent;}
.empty-txt{text-align:center;color:#64748b;margin-top:40px;font-size:.9rem;}
.u{list-style:none;flex:1;overflow-y:auto;}
.x{display:flex;align-items:center;background:#22262f;padding:10px 12px;border-radius:12px;margin-bottom:8px;}
.th-c{width:45px;height:45px;border-radius:6px;background:#101216;overflow:hidden;margin-right:12px;flex-shrink:0;}
.th-i{width:100%;height:100%;object-fit:cover;}
.j{display:flex;flex-direction:column;gap:2px;flex:1;min-width:0;margin-right:12px;}
.y{font-size:.9rem;font-weight:500;color:#f1f5f9;cursor:pointer;text-overflow:ellipsis;overflow:hidden;white-space:nowrap;}
.rn-i{background:#1a1d24;border:1px solid #3b82f6;border-radius:4px;color:#f1f5f9;font-size:.9rem;font-weight:500;padding:2px 6px;outline:none;width:100%;font-family:inherit;}
.z{font-size:.7rem;color:#64748b;}
.q{display:flex;gap:6px;flex-shrink:0;}
.a-b{display:flex;justify-content:center;align-items:center;width:32px;height:32px;border-radius:50%;border:none;background:#2d3139;cursor:pointer;-webkit-tap-highlight-color:transparent;}
.d-b:hover{background:#7f1d1d;}
.i-s{width:16px;height:16px;fill:#94a3b8;}
.a-b:hover .i-s{fill:#f8fafc;}
.d-b:hover .i-s{fill:#f87171;}
</style>
