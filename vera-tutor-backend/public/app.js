const languageSelect = document.querySelector("#language");
const levelSelect = document.querySelector("#level");
const messageInput = document.querySelector("#message");
const sendButton = document.querySelector("#sendButton");
const micButton = document.querySelector("#micButton");
const callButton = document.querySelector("#callButton");
const speakButton = document.querySelector("#speakButton");
const clearButton = document.querySelector("#clearButton");
const statusElement = document.querySelector("#status");
const chatElement = document.querySelector("#chat");
const modeSelect = document.querySelector("#mode");
const supportLanguageSelect = document.querySelector("#supportLanguage");
const teacherTools = document.querySelector("#teacherTools");
const learningFocus = document.querySelector("#learningFocus");
const learningExample = document.querySelector("#learningExample");
const learningActivity = document.querySelector("#learningActivity");
const learningResponse = document.querySelector("#learningResponse");
const learningFeedback = document.querySelector("#learningFeedback");
const teacherActionButtons = document.querySelectorAll("[data-teacher-action]");
const voiceStage = document.querySelector("#voiceStage");
const voiceState = document.querySelector("#voiceState");

const languageSpeechMap = {
  ingles: "en-US",
  frances: "fr-FR",
  mandarin: "zh-CN"
};

const LIVE_INPUT_SAMPLE_RATE = 16_000;
const LIVE_OUTPUT_SAMPLE_RATE = 24_000;
const API_BASE_URL = window.location.origin;
let studentAccessToken = null;
let studentProfile = null;
let studentAuthReady = false;

const DEFAULT_ALLOWED_PLATFORM_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:4173",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:4173",
  "https://veraorbis.studio",
  "https://linisymajo.github.io"
];

const allowedPlatformOrigins = new Set(DEFAULT_ALLOWED_PLATFORM_ORIGINS);

function isAllowedPlatformOrigin(origin) {
  if (!origin || typeof origin !== "string") return false;
  try {
    const parsed = new URL(origin);
    return allowedPlatformOrigins.has(parsed.origin);
  } catch {
    return false;
  }
}

function getParentWindow() {
  if (window.opener) return window.opener;
  if (window.parent && window.parent !== window) return window.parent;
  return null;
}

function getOpenerOrigin() {
  if (document.referrer) {
    try {
      const ref = new URL(document.referrer).origin;
      if (isAllowedPlatformOrigin(ref)) {
        return ref;
      }
    } catch {}
  }
  return null;
}

function sendAuthReadySignal() {
  const targetWindow = getParentWindow();
  if (!targetWindow) return;
  const target = getOpenerOrigin();
  if (target) {
    targetWindow.postMessage({ type: "VERA_AUTH_READY" }, target);
  } else {
    for (const origin of allowedPlatformOrigins) {
      targetWindow.postMessage({ type: "VERA_AUTH_READY" }, origin);
    }
  }
}

function hasAuthenticatedStudent() {
  return Boolean(
    studentAuthReady &&
    studentAccessToken &&
    studentProfile?.language &&
    studentProfile?.level
  );
}

function applyStudentProfile(profile) {
  studentProfile = profile;
  studentAuthReady = true;

  if (languageSelect.querySelector(`option[value="${profile.language}"]`)) {
    languageSelect.value = profile.language;
  }

  if (levelSelect.querySelector(`option[value="${profile.level}"]`)) {
    levelSelect.value = profile.level;
  }

  languageSelect.disabled = true;
  levelSelect.disabled = true;
}

window.addEventListener("message", async (event) => {
  if (!isAllowedPlatformOrigin(event.origin)) return;
  const parentWindow = getParentWindow();
  if (event.source !== parentWindow) return;

  if (event.data?.type !== "VERA_AUTH_CONTEXT") return;

  const accessToken = event.data.accessToken;

  if (typeof accessToken !== "string" || !accessToken.trim()) return;

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || "No se pudo verificar la sesión.");
    }

    studentAccessToken = accessToken;
    applyStudentProfile(data);

    console.log("Perfil del estudiante verificado.");
  } catch (error) {
    studentAccessToken = null;
    studentProfile = null;
    studentAuthReady = false;

    console.error("Error de autenticación de Vera Voice:", error.message);
  }
});

// Sync allowed origins with server configuration and notify opener window
fetch(`${API_BASE_URL}/api/config`)
  .then((res) => res.json())
  .then((data) => {
    if (Array.isArray(data?.allowedOrigins)) {
      for (const origin of data.allowedOrigins) {
        if (origin) {
          try {
            allowedPlatformOrigins.add(new URL(origin).origin);
          } catch {}
        }
      }
    }
  })
  .catch(() => {})
  .finally(() => {
    sendAuthReadySignal();
  });
let conversationHistory = [];
let lastAssistantResponse = "";
let recognition = null;
let isListening = false;
let isSending = false;
let liveSession = null;
let selectedMode = modeSelect.value;
let liveInputTranscript = "";
let liveOutputTranscript = "";

function setStatus(message) {
  statusElement.textContent = message;
}

function setVoiceState(state, label) {
  voiceStage.dataset.state = state;
  voiceState.textContent = label;
}

function addMessage(role, text) {
  const messageElement = document.createElement("div");
  messageElement.className = `message ${role}`;

  const author = document.createElement("span");
  author.className = "author";
  author.textContent = role === "user" ? "You" : "Vera";

  const content = document.createElement("div");
  content.textContent = text;

  messageElement.append(author, content);
  chatElement.appendChild(messageElement);
  chatElement.scrollTop = chatElement.scrollHeight;
}

function isTeacherMode() {
  return selectedMode === "profesora";
}

function updateTeacherPanel(values = {}) {
  if (!isTeacherMode()) return;
  if (values.focus) learningFocus.textContent = values.focus;
  if (values.example) learningExample.textContent = values.example;
  if (values.activity) learningActivity.textContent = values.activity;
  if (values.response) learningResponse.textContent = values.response;
  if (values.feedback) learningFeedback.textContent = values.feedback;
}

function setSelectedMode(mode) {
  selectedMode = mode;
  teacherTools.hidden = !isTeacherMode();
  if (isTeacherMode()) {
    updateTeacherPanel();
    setStatus("Modo profesora seleccionado. Vera guiará la clase paso a paso.");
  } else {
    setStatus("Modo conversación seleccionado.");
  }
}

function getSpeechLanguage() {
  return languageSpeechMap[languageSelect.value] || "en-US";
}

function getPlaybackLanguage() {
  return levelSelect.value === "basico" ? "es-ES" : getSpeechLanguage();
}

function selectBestVoice(language) {
  const voices = window.speechSynthesis?.getVoices() || [];
  const baseLanguage = language.split("-")[0].toLowerCase();
  const matchingVoices = voices.filter(voice =>
    voice.lang.toLowerCase() === language.toLowerCase() ||
    voice.lang.toLowerCase().startsWith(`${baseLanguage}-`)
  );
  const femaleHint = /female|woman|samantha|victoria|karen|zira|susan|amelie|marie|xiaoxiao|tingting/i;

  return matchingVoices.find(voice => femaleHint.test(voice.name)) ||
    matchingVoices.find(voice => voice.localService) ||
    matchingVoices[0] ||
    voices.find(voice => femaleHint.test(voice.name)) ||
    voices[0] ||
    null;
}

function speak(text) {
  if (!("speechSynthesis" in window)) {
    setStatus("Speech playback isn't supported by this browser.");
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const language = getPlaybackLanguage();

  utterance.lang = language;
  utterance.rate = language === "zh-CN" ? 0.85 : 0.95;
  const voice = selectBestVoice(language);
  if (voice) utterance.voice = voice;

  utterance.onerror = () => {
    setStatus("Vera couldn't play the audio. You can still read her reply.");
  };
  window.speechSynthesis.speak(utterance);
}

async function sendMessage() {
  if (isSending) return;

  if (!hasAuthenticatedStudent()) {
    setStatus("Verificando tu sesión de estudiante...");
    return;
  }

  const message = messageInput.value.trim();
  if (!message) {
    setStatus("Dame algo con lo que trabajar. Soy buena, pero todavía no leo la mente.");
    return;
  }

  isSending = true;
  sendButton.disabled = true;
  micButton.disabled = true;
  messageInput.disabled = true;
  addMessage("user", message);
  messageInput.value = "";
  setStatus("Vera está pensando...");

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 50_000);

  try {
    const response = await fetch(`${API_BASE_URL}/api/tutor`, {
      method: "POST",
     headers: {
  "Content-Type": "application/json",
  Authorization: `Bearer ${studentAccessToken}`
},
      signal: controller.signal,
      body: JSON.stringify({
        idioma: studentProfile.language,
nivel: studentProfile.level,
        modo: selectedMode,
        idiomaApoyo: supportLanguageSelect.value,
        mensaje: message,
        historial: conversationHistory.slice(-12)
      })
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) throw new Error(data.error || "Algo salió mal.");
    if (typeof data.reply !== "string" || !data.reply.trim()) {
      throw new Error("Vera returned an empty response.");
    }

    const reply = data.reply.trim();
    conversationHistory.push(
      { role: "user", text: message },
      { role: "model", text: reply }
    );
    conversationHistory = conversationHistory.slice(-12);
    lastAssistantResponse = reply;
    addMessage("model", reply);
    updateTeacherPanel({
      activity: message,
      response: message,
      feedback: reply,
      focus: "Vera's latest lesson and feedback",
      example: "Ask Vera for a translation or another example if needed."
    });
    setStatus("Tu turno. Inténtalo con calma.");
  } catch (error) {
    console.error("Vera text chat error:", error);
    const messageText = error.name === "AbortError"
      ? "Vera took too long to answer. Please try again."
      : `No se pudo contactar con Vera: ${error.message}`;
    setStatus(messageText);
    messageInput.value = message;
  } finally {
    window.clearTimeout(timeoutId);
    isSending = false;
    sendButton.disabled = false;
    micButton.disabled = false;
    messageInput.disabled = false;
    messageInput.focus();
  }
}

function initializeSpeechRecognition() {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    micButton.disabled = true;
    micButton.textContent = "Voz no disponible";
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    isListening = true;
    micButton.textContent = "Detener escucha";
    setStatus("Te escucho. Adelante.");
  };
  recognition.onresult = event => {
    let transcript = "";
    for (let i = 0; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    messageInput.value = transcript.trim();
  };
  recognition.onerror = event => {
    const messages = {
      "not-allowed": "Microphone access was denied. Check your browser permissions.",
      "no-speech": "I didn't hear anything. Try again when you're ready.",
      "network": "Voice recognition needs a working network connection.",
      "audio-capture": "No microphone was detected."
    };
    setStatus(messages[event.error] || `Microphone error: ${event.error}`);
  };
  recognition.onend = () => {
    isListening = false;
    micButton.textContent = "Speak";
  };
}

function toggleMicrophone() {
  if (!recognition) {
    setStatus("El reconocimiento de voz no está disponible en este navegador.");
    return;
  }
  if (isSending) return;

  if (isListening) {
    recognition.stop();
    return;
  }

  try {
    recognition.lang = getSpeechLanguage();
    recognition.start();
  } catch (error) {
    console.error("Dictation error:", error);
    setStatus("No se pudo iniciar el micrófono. Inténtalo de nuevo.");
  }
}

function base64ToInt16(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Int16Array(bytes.buffer);
}

function int16ToFloat32(samples) {
  const result = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    result[i] = samples[i] / (samples[i] < 0 ? 32768 : 32767);
  }
  return result;
}

function createLiveAudioPlayer() {
  const audioContext = new AudioContext({ sampleRate: LIVE_OUTPUT_SAMPLE_RATE });
  let nextStartTime = audioContext.currentTime;
  const sources = new Set();

  function stop() {
    for (const source of sources) {
      try { source.stop(); } catch { /* already stopped */ }
    }
    sources.clear();
    nextStartTime = audioContext.currentTime;
  }

  function play(base64) {
    const samples = base64ToInt16(base64);
    const buffer = audioContext.createBuffer(
      1,
      samples.length,
      LIVE_OUTPUT_SAMPLE_RATE
    );
    buffer.copyToChannel(int16ToFloat32(samples), 0);
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    nextStartTime = Math.max(nextStartTime, audioContext.currentTime);
    source.start(nextStartTime);
    nextStartTime += buffer.duration;
    sources.add(source);
    source.onended = () => sources.delete(source);
  }

  return { audioContext, play, stop };
}

function floatToPcm16(input) {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const sample = Math.max(-1, Math.min(1, input[i]));
    output[i] = sample < 0 ? sample * 32768 : sample * 32767;
  }
  return output;
}

function resampleAudio(input, sourceRate, targetRate) {
  if (sourceRate === targetRate) return input;

  const outputLength = Math.round(input.length * targetRate / sourceRate);
  const output = new Float32Array(outputLength);
  const ratio = sourceRate / targetRate;

  for (let i = 0; i < output.length; i++) {
    const position = i * ratio;
    const left = Math.floor(position);
    const right = Math.min(left + 1, input.length - 1);
    const weight = position - left;
    output[i] = input[left] * (1 - weight) + input[right] * weight;
  }

  return output;
}

function pcm16ToBase64(samples) {
  const bytes = new Uint8Array(samples.buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function requestLiveToken() {
  if (!hasAuthenticatedStudent()) {
    throw new Error("La sesión del estudiante todavía no está verificada.");
  }

  const response = await fetch(`${API_BASE_URL}/api/live-token`, {
    method: "POST",
    headers: {
  "Content-Type": "application/json",
  Authorization: `Bearer ${studentAccessToken}`
},
    body: JSON.stringify({
     idioma: studentProfile.language,
nivel: studentProfile.level,
      modo: selectedMode,
      idiomaApoyo: supportLanguageSelect.value
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || typeof data.token !== "string") {
    throw new Error(data.error || "The live session could not be authorized.");
  }
  return {
    token: data.token,
    model: data.model || "gemini-3.8-live"
  };
}

function getLiveAudio(message) {
  const parts = message.serverContent?.modelTurn?.parts || [];
  return parts
    .map(part => part.inlineData?.data)
    .filter(Boolean);
}

function sendLiveTeacherAction(action) {
  if (!liveSession || liveSession.socket.readyState !== WebSocket.OPEN) {
    return false;
  }

  const requests = {
    explain: "Explícamelo brevemente en mi idioma de apoyo.",
    translate: "Muéstrame la expresión original y su traducción claramente diferenciadas.",
    hint: "Dame una pista breve, pero no resuelvas la actividad por mí.",
    repeat: "Repítelo más despacio y con una formulación ligeramente más sencilla.",
    easier: "Haz la actividad más fácil y divídela en un paso pequeño.",
    understood: "Ya lo entendí. Continúa solo si mi respuesta demuestra comprensión; si no, compruébalo primero."
  };
  const text = requests[action];
  if (!text) return false;

  liveSession.socket.send(JSON.stringify({
    clientContent: {
      turns: [{ role: "user", parts: [{ text }] }],
      turnComplete: true
    }
  }));
  updateTeacherPanel({ activity: text });
  setStatus("Vera está adaptando la clase...");
  return true;
}

async function startLiveCall() {
  if (liveSession) return;
    if (!hasAuthenticatedStudent()) {
    setStatus("Verificando tu sesión de estudiante...");
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia || !window.WebSocket) {
    setStatus("Las llamadas necesitan micrófono y compatibilidad con WebSocket.");
    return;
  }

  callButton.disabled = true;
  callButton.textContent = "Conectando...";
  setStatus("Conectando con Vera...");
  setVoiceState("connecting", "Conectando con Vera...");

  let stream;
  let inputContext;
  let inputSource;
  let processor;
  let silentOutput;
  let player;
  let socket;
  liveInputTranscript = "";
  liveOutputTranscript = "";

  try {
    const { token, model } = await requestLiveToken();
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
    player = createLiveAudioPlayer();
    inputContext = new AudioContext({ sampleRate: LIVE_INPUT_SAMPLE_RATE });
    inputSource = inputContext.createMediaStreamSource(stream);
    processor = inputContext.createScriptProcessor(4096, 1, 1);
    socket = new WebSocket(
      "wss://generativelanguage.googleapis.com/ws/" +
      "google.ai.generativelanguage.v1beta.GenerativeService." +
      `BidiGenerateContentConstrained?access_token=${encodeURIComponent(token)}`
    );

    const cleanup = (state = "disconnected", label = "Llamada desconectada.") => {
      processor?.disconnect();
      inputSource?.disconnect();
      silentOutput?.disconnect();
      stream?.getTracks().forEach(track => track.stop());
      inputContext?.close();
      player?.stop();
      player?.audioContext.close();
      if (socket && socket.readyState === WebSocket.OPEN) socket.close();
      liveSession = null;
      callButton.disabled = false;
      callButton.textContent = "Talk to Vera";
      setVoiceState(state, label);
    };

    liveSession = { cleanup, socket };
    socket.onopen = () => {
      socket.send(JSON.stringify({
        setup: {
          model: `models/${model}`,
          inputAudioTranscription: {},
          outputAudioTranscription: {}
        }
      }));
    };
    socket.onmessage = async event => {
      let message;
      try {
        if (typeof event.data === "string") {
          message = JSON.parse(event.data);
        } else if (event.data instanceof Blob) {
          message = JSON.parse(await event.data.text());
        } else {
          console.warn("Ignoring unsupported Live API message type.");
          return;
        }
      } catch (error) {
        console.error("Invalid Live API message:", error);
        setStatus("Vera sent an unreadable live response.");
        return;
      }

      if (message.setupComplete) {
        setStatus("Te escucho. Habla con naturalidad; Vera responderá cuando hagas una pausa.");
        setVoiceState("listening", "Escuchando. Habla con naturalidad.");
        callButton.disabled = false;
        callButton.textContent = "Finalizar llamada";
        inputSource.connect(processor);
        silentOutput = inputContext.createGain();
        silentOutput.gain.value = 0;
        processor.connect(silentOutput);
        silentOutput.connect(inputContext.destination);
        processor.onaudioprocess = audioEvent => {
          if (socket.readyState !== WebSocket.OPEN) return;
          const samples = resampleAudio(
            audioEvent.inputBuffer.getChannelData(0),
            inputContext.sampleRate,
            LIVE_INPUT_SAMPLE_RATE
          );
          const pcm = floatToPcm16(samples);
          socket.send(JSON.stringify({
            realtimeInput: {
              audio: {
                data: pcm16ToBase64(pcm),
                mimeType: `audio/pcm;rate=${LIVE_INPUT_SAMPLE_RATE}`
              }
            }
          }));
        };
        return;
      }

      if (message.serverContent?.interrupted) player.stop();
      const audioChunks = getLiveAudio(message);
      for (const audio of audioChunks) player.play(audio);
      if (audioChunks.length) setVoiceState("speaking", "Vera está hablando...");
      if (message.serverContent?.inputTranscription?.text) {
        liveInputTranscript += message.serverContent.inputTranscription.text;
        if (isTeacherMode()) {
          updateTeacherPanel({
            response: liveInputTranscript,
            activity: "Vera está evaluando tu respuesta hablada."
          });
        }
      }
      if (message.serverContent?.outputTranscription?.text) {
        liveOutputTranscript += message.serverContent.outputTranscription.text;
        if (isTeacherMode()) {
          updateTeacherPanel({
            feedback: liveOutputTranscript,
            example: liveOutputTranscript
          });
        }
        setStatus("Vera está hablando...");
        setVoiceState("speaking", "Vera está hablando...");
      }
      if (message.serverContent?.turnComplete) {
        if (isTeacherMode()) {
          if (liveInputTranscript) addMessage("user", liveInputTranscript);
          if (liveOutputTranscript) addMessage("model", liveOutputTranscript);
        }
        liveInputTranscript = "";
        liveOutputTranscript = "";
        setStatus("Te escucho...");
        setVoiceState("listening", "Escuchando. Habla con naturalidad.");
      }
    };
    socket.onerror = () => {
      setStatus("La llamada encontró un error de conexión.");
      cleanup("error", "No se pudo mantener la conexión. Puedes intentarlo de nuevo.");
    };
    socket.onclose = event => {
      if (liveSession) {
        setStatus(event.reason || "La llamada se desconectó.");
        cleanup("disconnected", "Llamada desconectada.");
      }
    };
  } catch (error) {
    console.error("Vera Live error:", error);
    stream?.getTracks().forEach(track => track.stop());
    inputContext?.close();
    player?.audioContext.close();
    setStatus(error.name === "NotAllowedError"
      ? "Microphone access was denied. Check your browser permissions."
      : `Couldn't start the live call: ${error.message}`);
    setVoiceState("error", error.name === "NotAllowedError"
      ? "Permiso de micrófono denegado."
      : "No se pudo iniciar la llamada. Puedes intentarlo de nuevo.");
    liveSession = null;
    callButton.disabled = false;
    callButton.textContent = "Talk to Vera";
  }
}

function endLiveCall() {
  if (!liveSession) return;
  setStatus("Finalizando la llamada...");
  liveSession.cleanup();
  setStatus("Llamada desconectada.");
}

function clearConversation() {
  if (isListening && recognition) recognition.stop();
  if (liveSession) endLiveCall();
  window.speechSynthesis?.cancel();
  conversationHistory = [];
  lastAssistantResponse = "";
  chatElement.innerHTML = "";
  messageInput.value = "";
  addMessage("model", "Fresh start! A clean slate and endless possibilities. So, what are we talking about?");
  updateTeacherPanel({
    focus: "Vera will choose a suitable focus for your level.",
    example: "Ask Vera for a translation or example when you need one.",
    activity: "Answer Vera by voice or text. Your real answer will appear here.",
    response: "No response recorded yet.",
    feedback: "Vera's corrections, hints, and explanations will appear here."
  });
  setStatus("Conversación borrada. Empecemos de nuevo.");
}

sendButton.addEventListener("click", sendMessage);
micButton.addEventListener("click", toggleMicrophone);
callButton.addEventListener("click", () => liveSession ? endLiveCall() : startLiveCall());
clearButton.addEventListener("click", clearConversation);
modeSelect.addEventListener("change", () => {
  if (liveSession) {
    endLiveCall();
    setStatus("Modo cambiado. La llamada anterior terminó de forma segura; inicia otra para continuar.");
  }
  setSelectedMode(modeSelect.value);
});
for (const button of teacherActionButtons) {
  button.addEventListener("click", () => {
    if (!isTeacherMode()) return;
    const action = button.dataset.teacherAction;
    if (sendLiveTeacherAction(action)) return;

    const requests = {
      explain: "Explícamelo brevemente en mi idioma de apoyo.",
      translate: "Muéstrame la expresión original y su traducción claramente diferenciadas.",
      hint: "Dame una pista breve, pero no resuelvas la actividad por mí.",
      repeat: "Repítelo más despacio y con una formulación ligeramente más sencilla.",
      easier: "Haz la actividad más fácil y divídela en un paso pequeño.",
      understood: "Ya lo entendí. Continúa solo si mi respuesta demuestra comprensión; si no, compruébalo primero."
    };
    messageInput.value = requests[action] || "";
    messageInput.focus();
    setStatus("La petición está lista. Envíala a Vera cuando quieras.");
  });
}
speakButton.addEventListener("click", () => {
  if (!lastAssistantResponse) {
    setStatus("Vera todavía no ha respondido. ¡Inicia una conversación!");
    return;
  }
  speak(lastAssistantResponse);
});
messageInput.addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
});
languageSelect.addEventListener("change", () => {
  if (isListening && recognition) recognition.stop();
  window.speechSynthesis?.cancel();
  setStatus(`Idioma de práctica cambiado a ${languageSelect.options[languageSelect.selectedIndex].text}.`);
});

if ("speechSynthesis" in window) {
  window.speechSynthesis.addEventListener("voiceschanged", () => {
    window.speechSynthesis.getVoices();
  });
}

initializeSpeechRecognition();
setSelectedMode(selectedMode);
setVoiceState("idle", "Lista para conversar cuando tú quieras.");
