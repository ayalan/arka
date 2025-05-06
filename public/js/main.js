/**
 * Arka: Antarctica Personification Project
 * Main JavaScript file
 */

// Global variables
let socket;
let isConnected = false;
let messageInput;
let sendButton;
let connectButton;
let messagesContainer;
let mediaRecorder;
let audioChunks = [];
let isRecording = false;
// Use the existing audioContext from audio-viz.js
let audioQueue = [];
let isPlaying = false;
let currentAudio = null;
let audioStream = null;

// DOM elements
document.addEventListener('DOMContentLoaded', () => {
    // Get DOM elements
    messageInput = document.getElementById('message-input');
    sendButton = document.getElementById('send-btn');
    connectButton = document.getElementById('connect-btn');
    messagesContainer = document.getElementById('messages');

    // Add event listeners
    connectButton.addEventListener('click', toggleConnection);
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    // Initialize UI
    updateUIState();
});

/**
 * Toggle WebSocket connection
 */
function toggleConnection() {
    if (isConnected) {
        disconnectFromServer();
    } else {
        connectToServer();
    }
}

/**
 * Get browser supported MIME type for audio recording
 * @returns {string} Supported MIME type
 */
function getBrowserSupportedMimeType() {
    const types = [
        'audio/webm',
        'audio/webm;codecs=opus',
        'audio/ogg;codecs=opus',
        'audio/mp4',
        'audio/mpeg'
    ];
    
    for (const type of types) {
        if (MediaRecorder.isTypeSupported(type)) {
            return type;
        }
    }
    
    return 'audio/webm'; // Default fallback
}

/**
 * Connect to WebSocket server
 */
function connectToServer() {
    // Show connecting state
    connectButton.textContent = 'Connecting...';
    connectButton.disabled = true;

    // Create WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    try {
        socket = new WebSocket(wsUrl);

        // Connection opened
        socket.addEventListener('open', (event) => {
            isConnected = true;
            addSystemMessage('Connected to Antarctica');
            updateUIState();
            
            // Send session settings for audio format
            sendSessionSettings();
            
            // Start recording audio from microphone
            startRecording();
        });

        // Listen for messages
        socket.addEventListener('message', (event) => {
            const message = event.data;
            handleServerMessage(message);
        });

        // Connection closed
        socket.addEventListener('close', (event) => {
            isConnected = false;
            addSystemMessage('Disconnected from Antarctica');
            updateUIState();
            
            // Stop recording
            stopRecording();
            
            // Stop audio playback
            stopAudioPlayback();
        });

        // Connection error
        socket.addEventListener('error', (event) => {
            console.error('WebSocket error:', event);
            addSystemMessage('Error connecting to Antarctica');
            isConnected = false;
            updateUIState();
        });
    } catch (error) {
        console.error('Failed to create WebSocket:', error);
        addSystemMessage('Failed to connect to Antarctica');
        isConnected = false;
        updateUIState();
    }
}

/**
 * Disconnect from WebSocket server
 */
function disconnectFromServer() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
    }
    isConnected = false;
    updateUIState();
}

/**
 * Send message to server
 */
function sendMessage() {
    if (!isConnected || !messageInput.value.trim()) return;

    const message = messageInput.value.trim();
    
    // Send message to server as JSON
    socket.send(JSON.stringify({
        type: 'text',
        text: message
    }));
    
    // Add message to UI
    addUserMessage(message);
    
    // Clear input
    messageInput.value = '';
}

/**
 * Add user message to conversation
 */
function addUserMessage(text) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message user-message';
    messageElement.textContent = text;
    messagesContainer.appendChild(messageElement);
    scrollToBottom();
}

/**
 * Handle messages from the server
 */
function handleServerMessage(data) {
    try {
        // Parse the message if it's a string
        const message = typeof data === 'string' ? JSON.parse(data) : data;
        
        console.log('Received message from server:', message.type, message);
        
        // Handle different message types
        switch (message.type) {
            case 'text':
                addAntarcticaMessage(message.text);
                break;
            case 'system':
                addSystemMessage(message.message);
                break;
            case 'error':
                addErrorMessage(message.message);
                break;
            case 'audio':
                // Handle audio message
                if (message.audio) {
                    playAudio(message.audio, message.duration || 2.5);
                }
                break;
            case 'recognition':
                // Handle speech recognition result
                addUserMessage(message.text);
                break;
            case 'user_message':
                // Handle user message from EVI
                addUserMessage(message.text);
                break;
            case 'assistant_message':
                // Handle assistant message from EVI
                addAntarcticaMessage(message.text);
                break;
            case 'audio_output':
                // Handle audio output from EVI
                if (message.data) {
                    playAudio(message.data, message.duration || 2.5);
                }
                break;
            case 'user_interruption':
                // Handle user interruption
                stopAudioPlayback();
                break;
            default:
                console.log('Unknown message type:', message.type);
        }
    } catch (error) {
        console.error('Error handling server message:', error);
        addSystemMessage('Error displaying message from Antarctica');
    }
}

/**
 * Add Antarctica message to conversation
 */
function addAntarcticaMessage(text) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message antarctica-message';
    messageElement.textContent = text;
    messagesContainer.appendChild(messageElement);
    scrollToBottom();
}

/**
 * Add error message to conversation
 */
function addErrorMessage(text) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message error-message';
    messageElement.textContent = text;
    messagesContainer.appendChild(messageElement);
    scrollToBottom();
}

/**
 * Add system message to conversation
 */
function addSystemMessage(text) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message system-message';
    messageElement.textContent = text;
    messagesContainer.appendChild(messageElement);
    scrollToBottom();
}

/**
 * Scroll messages container to bottom
 */
function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/**
 * Update UI based on connection state
 */
function updateUIState() {
    if (isConnected) {
        connectButton.textContent = 'Disconnect';
        messageInput.disabled = false;
        sendButton.disabled = false;
    } else {
        connectButton.textContent = 'Connect';
        messageInput.disabled = true;
        sendButton.disabled = true;
    }
    connectButton.disabled = false;
}

/**
 * Start recording audio from microphone
 */
function startRecording() {
    if (isRecording) return;
    
    // Request microphone access
    navigator.mediaDevices.getUserMedia({ 
        audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
        } 
    })
    .then(stream => {
        audioStream = stream;
        isRecording = true;
        audioChunks = [];
        
        // Get supported MIME type
        const mimeType = getBrowserSupportedMimeType();
        
        // Create media recorder
        mediaRecorder = new MediaRecorder(stream, { mimeType });
        
        // Handle data available event
        mediaRecorder.addEventListener('dataavailable', event => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
                
                // Convert to base64 and send to server
                convertBlobToBase64(event.data)
                    .then(base64Audio => {
                        if (socket && socket.readyState === WebSocket.OPEN) {
                            socket.send(JSON.stringify({
                                type: 'audio_input',
                                data: base64Audio
                            }));
                        }
                    })
                    .catch(error => {
                        console.error('Error converting audio to base64:', error);
                    });
            }
        });
        
        // Start recording with 100ms intervals
        mediaRecorder.start(100);
        
        console.log('Started recording audio');
        
        // Connect to audio visualization if available
        if (window.audioViz && window.audioViz.processAudioFromMic) {
            window.audioViz.processAudioFromMic().catch(console.error);
        }
    })
    .catch(error => {
        console.error('Error accessing microphone:', error);
        addSystemMessage('Error accessing microphone. Please make sure your microphone is connected and you have granted permission to use it.');
    });
}

/**
 * Stop recording audio
 */
function stopRecording() {
    if (!isRecording || !mediaRecorder) return;
    
    // Stop media recorder
    if (mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
    
    // Stop all audio tracks
    if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
        audioStream = null;
    }
    
    isRecording = false;
    console.log('Stopped recording audio');
    
    // Stop audio visualization if available
    if (window.audioViz && window.audioViz.stopAudioProcessing) {
        window.audioViz.stopAudioProcessing();
    }
}

/**
 * Convert Blob to base64
 * @param {Blob} blob - Audio blob to convert
 * @returns {Promise<string>} Base64-encoded audio data
 */
function convertBlobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            // Extract the base64 data from the result
            const base64Data = reader.result.split(',')[1];
            resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

/**
 * Convert base64 to Blob
 * @param {string} base64 - Base64-encoded audio data
 * @param {string} mimeType - MIME type of the audio
 * @returns {Blob} Audio blob
 */
function convertBase64ToBlob(base64, mimeType = 'audio/wav') {
    const byteCharacters = atob(base64);
    const byteArrays = [];
    
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }
        
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }
    
    return new Blob(byteArrays, { type: mimeType });
}

/**
 * Play audio from base64 string
 * @param {string} base64Audio - Base64-encoded audio data
 * @param {number} duration - Duration of the audio in seconds
 */
function playAudio(base64Audio, duration) {
    // Add to queue
    const blob = convertBase64ToBlob(base64Audio);
    audioQueue.push(blob);
    
    // Start playing if not already playing
    if (!isPlaying) {
        playNextAudio();
    }
}

/**
 * Play next audio in queue
 */
function playNextAudio() {
    if (audioQueue.length === 0) {
        isPlaying = false;
        return;
    }
    
    isPlaying = true;
    
    // Get next audio from queue
    const blob = audioQueue.shift();
    
    // Create audio URL
    const audioUrl = URL.createObjectURL(blob);
    
    // Create audio element
    currentAudio = new Audio(audioUrl);
    
    // Play audio
    currentAudio.play()
        .then(() => {
            console.log('Playing audio');
        })
        .catch(error => {
            console.error('Error playing audio:', error);
            isPlaying = false;
            playNextAudio();
        });
    
    // When audio ends, play next in queue
    currentAudio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        currentAudio = null;
        isPlaying = false;
        playNextAudio();
    };
}

/**
 * Stop audio playback
 */
function stopAudioPlayback() {
    // Stop current audio
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }
    
    // Clear queue
    audioQueue = [];
    isPlaying = false;
    
    console.log('Stopped audio playback');
}

/**
 * Send session settings for audio format
 */
function sendSessionSettings() {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    
    // Get supported MIME type
    const mimeType = getBrowserSupportedMimeType();
    
    // Determine audio format based on MIME type
    let format = 'webm';
    if (mimeType.includes('ogg')) {
        format = 'ogg';
    } else if (mimeType.includes('mp4') || mimeType.includes('mpeg')) {
        format = 'mp4';
    }
    
    // Send session settings
    socket.send(JSON.stringify({
        type: 'session_settings',
        audio: {
            format: format,
            sample_rate: 44100,
            channels: 1
        }
    }));
    
    console.log('Sent session settings for audio format:', format);
}
