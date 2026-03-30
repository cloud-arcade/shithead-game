/**
 * CloudArcade Test Harness
 * Simulates the CloudArcade parent platform for local testing
 */

// DOM Elements
const gameIframe = document.getElementById('game-iframe');
const gameFrameWrapper = document.getElementById('game-frame-wrapper');
const frameSize = document.getElementById('frame-size');
const statusIndicator = document.getElementById('status-indicator');
const messageLog = document.getElementById('message-log');

// Form elements
const userTypeSelect = document.getElementById('user-type');
const userIdInput = document.getElementById('user-id');
const userIdGroup = document.getElementById('user-id-group');
const guestNameInput = document.getElementById('guest-name');
const guestNameGroup = document.getElementById('guest-name-group');
const gameIdInput = document.getElementById('game-id');
const mockRankInput = document.getElementById('mock-rank');

// Buttons
const btnSendUserInfo = document.getElementById('btn-send-user-info');
const btnSessionStarted = document.getElementById('btn-session-started');
const btnSessionEnded = document.getElementById('btn-session-ended');
const btnScoreSuccess = document.getElementById('btn-score-success');
const btnScoreError = document.getElementById('btn-score-error');
const btnClearLog = document.getElementById('btn-clear-log');
const btnFullscreen = document.getElementById('btn-fullscreen');
const btnReload = document.getElementById('btn-reload');

// State
let isConnected = false;
let currentSession = null;
let lastScore = null;

// ============================================
// Message Handling
// ============================================

function sendMessageToGame(message) {
  gameIframe.contentWindow.postMessage(message, '*');
  logMessage('outgoing', message);
}

function handleGameMessage(event) {
  // Ignore messages from other sources
  if (event.source !== gameIframe.contentWindow) return;
  
  const data = event.data;
  if (!data || typeof data !== 'object' || !data.type) return;
  
  logMessage('incoming', data);
  
  switch (data.type) {
    case 'GAME_READY':
      handleGameReady();
      break;
    case 'START_SESSION':
      handleStartSession(data.payload);
      break;
    case 'END_SESSION':
      handleEndSession(data.payload);
      break;
    case 'SUBMIT_SCORE':
      handleSubmitScore(data.payload);
      break;
    case 'GAME_OVER':
      handleGameOver(data.payload);
      break;
    case 'GAME_ERROR':
      handleGameError(data.payload);
      break;
  }
}

function handleGameReady() {
  updateStatus(true, 'Game ready! Sending USER_INFO...');
  
  // Auto-send USER_INFO after a short delay
  setTimeout(() => {
    sendUserInfo();
  }, 500);
}

function handleStartSession(payload) {
  // Auto-respond with SESSION_STARTED
  currentSession = {
    id: 'session_' + Date.now(),
    gameId: gameIdInput.value,
    userId: userTypeSelect.value === 'authenticated' ? userIdInput.value : undefined,
    guestId: userTypeSelect.value === 'guest' ? 'guest_' + Date.now() : undefined,
    startedAt: new Date().toISOString(),
    metadata: payload?.metadata,
  };
  
  sendMessageToGame({
    type: 'SESSION_STARTED',
    payload: {
      sessionId: currentSession.id,
      session: currentSession,
    },
  });
}

function handleEndSession(payload) {
  if (currentSession) {
    currentSession.endedAt = new Date().toISOString();
    
    sendMessageToGame({
      type: 'SESSION_ENDED',
      payload: {
        session: { ...currentSession, ...payload?.metadata },
      },
    });
    
    currentSession = null;
  }
}

function handleSubmitScore(payload) {
  lastScore = {
    id: 'score_' + Date.now(),
    gameId: gameIdInput.value,
    userId: userTypeSelect.value === 'authenticated' ? userIdInput.value : undefined,
    guestId: userTypeSelect.value === 'guest' ? 'guest_' + Date.now() : undefined,
    score: payload.score,
    submittedAt: new Date().toISOString(),
    metadata: payload.metadata,
  };
  
  // Auto-respond with success
  const rank = parseInt(mockRankInput.value) || 1;
  sendMessageToGame({
    type: 'SCORE_SUBMITTED',
    payload: {
      score: lastScore,
      rank: rank,
    },
  });
}

function handleGameOver(payload) {
  logInfo(`Game over! Score: ${payload?.score ?? 'N/A'}`);
}

function handleGameError(errorMessage) {
  logError(`Game error: ${errorMessage}`);
}

// ============================================
// Control Actions
// ============================================

function sendUserInfo() {
  const isAuthenticated = userTypeSelect.value === 'authenticated';
  
  sendMessageToGame({
    type: 'USER_INFO',
    payload: {
      gameId: gameIdInput.value,
      userId: isAuthenticated ? userIdInput.value : undefined,
      guestId: isAuthenticated ? undefined : 'guest_' + Date.now(),
      guestName: isAuthenticated ? undefined : guestNameInput.value,
    },
  });
  
  updateStatus(true, 'Connected');
}

function simulateSessionStarted() {
  if (!currentSession) {
    currentSession = {
      id: 'session_' + Date.now(),
      gameId: gameIdInput.value,
      userId: userTypeSelect.value === 'authenticated' ? userIdInput.value : undefined,
      guestId: userTypeSelect.value === 'guest' ? 'guest_' + Date.now() : undefined,
      startedAt: new Date().toISOString(),
    };
  }
  
  sendMessageToGame({
    type: 'SESSION_STARTED',
    payload: {
      sessionId: currentSession.id,
      session: currentSession,
    },
  });
}

function simulateSessionEnded() {
  if (currentSession) {
    currentSession.endedAt = new Date().toISOString();
  }
  
  sendMessageToGame({
    type: 'SESSION_ENDED',
    payload: {
      session: currentSession || { id: 'unknown', gameId: gameIdInput.value },
    },
  });
  
  currentSession = null;
}

function simulateScoreSubmitted() {
  const rank = parseInt(mockRankInput.value) || 1;
  
  sendMessageToGame({
    type: 'SCORE_SUBMITTED',
    payload: {
      score: lastScore || {
        id: 'score_' + Date.now(),
        gameId: gameIdInput.value,
        score: 0,
        submittedAt: new Date().toISOString(),
      },
      rank: rank,
    },
  });
}

function simulateScoreError() {
  sendMessageToGame({
    type: 'SCORE_ERROR',
    payload: {
      error: 'Simulated score submission error',
    },
  });
}

// ============================================
// UI Helpers
// ============================================

function updateStatus(connected, text) {
  isConnected = connected;
  const dot = statusIndicator.querySelector('.status-dot');
  const textEl = statusIndicator.querySelector('.status-text');
  
  dot.className = 'status-dot ' + (connected ? 'connected' : 'disconnected');
  textEl.textContent = text;
}

function logMessage(direction, message) {
  const entry = document.createElement('div');
  entry.className = `log-entry ${direction}`;
  
  const timestamp = new Date().toLocaleTimeString();
  const dirLabel = direction === 'incoming' ? '← IN' : '→ OUT';
  
  entry.innerHTML = `
    <span class="timestamp">${timestamp}</span>
    <span class="direction ${direction}">${dirLabel}</span>
    <span class="type">${message.type}</span>
    ${message.payload ? `<code>${JSON.stringify(message.payload).slice(0, 100)}${JSON.stringify(message.payload).length > 100 ? '...' : ''}</code>` : ''}
  `;
  
  messageLog.appendChild(entry);
  messageLog.scrollTop = messageLog.scrollHeight;
}

function logInfo(text) {
  const entry = document.createElement('div');
  entry.className = 'log-entry info';
  entry.innerHTML = `<span class="timestamp">${new Date().toLocaleTimeString()}</span> ${text}`;
  messageLog.appendChild(entry);
  messageLog.scrollTop = messageLog.scrollHeight;
}

function logError(text) {
  const entry = document.createElement('div');
  entry.className = 'log-entry error';
  entry.innerHTML = `<span class="timestamp">${new Date().toLocaleTimeString()}</span> ${text}`;
  messageLog.appendChild(entry);
  messageLog.scrollTop = messageLog.scrollHeight;
}

function clearLog() {
  messageLog.innerHTML = '';
  logInfo('Log cleared');
}

function updateFrameSize() {
  const rect = gameFrameWrapper.getBoundingClientRect();
  frameSize.textContent = `${Math.round(rect.width)} × ${Math.round(rect.height)}`;
}

function setFrameSize(width, height) {
  if (width === 'auto') {
    gameFrameWrapper.classList.remove('custom-size');
    gameFrameWrapper.style.width = '';
    gameFrameWrapper.style.height = '';
  } else {
    gameFrameWrapper.classList.add('custom-size');
    gameFrameWrapper.style.width = width + 'px';
    gameFrameWrapper.style.height = height + 'px';
  }
  updateFrameSize();
}

function toggleUserFields() {
  const isAuthenticated = userTypeSelect.value === 'authenticated';
  userIdGroup.classList.toggle('hidden', !isAuthenticated);
  guestNameGroup.classList.toggle('hidden', isAuthenticated);
}

function reloadGame() {
  gameIframe.src = gameIframe.src;
  updateStatus(false, 'Waiting for GAME_READY...');
  currentSession = null;
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    gameFrameWrapper.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
}

// ============================================
// Event Listeners
// ============================================

// Message listener
window.addEventListener('message', handleGameMessage);

// Control buttons
btnSendUserInfo.addEventListener('click', sendUserInfo);
btnSessionStarted.addEventListener('click', simulateSessionStarted);
btnSessionEnded.addEventListener('click', simulateSessionEnded);
btnScoreSuccess.addEventListener('click', simulateScoreSubmitted);
btnScoreError.addEventListener('click', simulateScoreError);
btnClearLog.addEventListener('click', clearLog);
btnFullscreen.addEventListener('click', toggleFullscreen);
btnReload.addEventListener('click', reloadGame);

// User type toggle
userTypeSelect.addEventListener('change', toggleUserFields);

// Size presets
document.querySelectorAll('[data-size]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const size = btn.dataset.size;
    if (size === 'auto') {
      setFrameSize('auto');
    } else {
      const [width, height] = size.split('x').map(Number);
      setFrameSize(width, height);
    }
  });
});

// Track frame size
window.addEventListener('resize', updateFrameSize);
new ResizeObserver(updateFrameSize).observe(gameFrameWrapper);

// Initialize
updateFrameSize();
logInfo('Test harness ready. Start the game server with <code>npm run dev</code>');
