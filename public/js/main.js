/**
 * Arka: Antarctica Personification Project
 * Main JavaScript file
 */

// Global variables
let socket;
let isConnected = false;
let connectButton;
let audioUnlockButton;
let connectionStatusElement;
let mediaRecorder;
let audioChunks = [];
let isRecording = false;
// Use the existing audioContext from audio-viz.js
let audioQueue = [];
let isPlaying = false;
let currentAudio = null;
let audioStream = null;
let outputAnalyser = null;
let outputDataArray = null;
let outputVisualizationActive = false;

// DOM elements
document.addEventListener('DOMContentLoaded', () => {
    // Get DOM elements
    connectButton = document.getElementById('connect-btn');
    audioUnlockButton = document.getElementById('audio-unlock-btn');
    testMessageButton = document.getElementById('test-message-btn');
    connectionStatusElement = document.getElementById('connection-status');

    // Add event listeners
    connectButton.addEventListener('click', toggleConnection);
    audioUnlockButton.addEventListener('click', unlockAudio);
    testMessageButton.addEventListener('click', sendTestMessage);
    
    // Initialize UI state
    updateUIState();

    // Auto-connect when page loads
    setTimeout(() => {
        connectToServer();
        
        // Send a test message after connection is established
        setTimeout(() => {
            if (isConnected && socket && socket.readyState === WebSocket.OPEN) {
                console.log('Sending test message to trigger audio response...');
                
                // Create a test message
                const testMessage = {
                    type: 'text',
                    text: 'Tell me about Antarctica'
                };
                
                // Log the message
                console.log('Test message:', JSON.stringify(testMessage));
                
                // Send the message
                socket.send(JSON.stringify(testMessage));
                
                // Log that the message was sent
                console.log('Test message sent successfully');
                
                // Add a debug message to check if audio is working
                const testAudio = new Audio();
                testAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
                testAudio.volume = 1.0;
                
                testAudio.oncanplay = () => {
                    console.log('Test audio can play');
                    testAudio.play()
                        .then(() => {
                            console.log('Test audio playback started');
                        })
                        .catch(error => {
                            console.error('Test audio playback failed:', error);
                        });
                };
                
                testAudio.onerror = (error) => {
                    console.error('Test audio error:', error);
                };
            } else {
                console.warn('Cannot send test message: WebSocket not connected');
                if (!isConnected) {
                    console.warn('Reason: Not connected (isConnected is false)');
                }
                if (!socket) {
                    console.warn('Reason: Socket is null or undefined');
                } else if (socket.readyState !== WebSocket.OPEN) {
                    console.warn('Reason: Socket state is not OPEN, current state:', 
                        socket.readyState === WebSocket.CONNECTING ? 'CONNECTING' :
                        socket.readyState === WebSocket.CLOSING ? 'CLOSING' :
                        socket.readyState === WebSocket.CLOSED ? 'CLOSED' : 'UNKNOWN'
                    );
                }
            }
        }, 3000); // Wait 3 seconds after connection attempt
    }, 1000);
});

/**
 * Unlock audio playback on browsers that require user interaction
 */
function unlockAudio() {
    console.log('Attempting to unlock audio playback...');
    
    // Create a silent audio element
    const silentAudio = new Audio("data:audio/mp3;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFTb25vdGhlcXVlLm9yZwBURU5DAAAAHQAAA1N3aXRjaCBQbHVzIMKpIE5DSCBTb2Z0d2FyZQBUSVQyAAAABgAAAzIyMzUAVFNTRQAAAA8AAANMYXZmNTcuODMuMTAwAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV");
    
    // Play the silent audio
    silentAudio.play()
        .then(() => {
            console.log('Audio playback unlocked successfully');
        })
        .catch(error => {
            console.error('Failed to unlock audio playback:', error);
        });
}

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
                console.log('Text message from Antarctica:', message.text);
                break;
            case 'system':
                console.log('System message:', message.message);
                break;
            case 'error':
                console.error('Error message:', message.message);
                break;
            case 'audio':
                // Handle audio message
                console.log('Received audio message, playing audio...');
                if (message.audio) {
                    playAudio(message.audio, message.duration || 2.5);
                }
                break;
            case 'recognition':
                // Handle speech recognition result
                console.log('Speech recognized:', message.text);
                break;
            case 'user_message':
                // Handle user message from EVI
                console.log('User message:', message.text);
                break;
            case 'assistant_message':
                // Handle assistant message from EVI
                console.log('Antarctica message:', message.text);
                break;
            case 'audio_output':
                // Handle audio output from EVI
                console.log('Received audio output, playing audio...');
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
    }
}

/**
 * Add system message to console
 */
function addSystemMessage(text) {
    console.log('System message:', text);
}

/**
 * Update UI based on connection state
 */
function updateUIState() {
    // Update connect button
    if (isConnected) {
        connectButton.textContent = 'Disconnect';
    } else {
        connectButton.textContent = 'Connect';
    }
    connectButton.disabled = false;
    
    // Update connection status indicator
    if (connectionStatusElement) {
        if (isConnected) {
            connectionStatusElement.textContent = 'Connected';
            connectionStatusElement.style.backgroundColor = '#4CAF50'; // Green
        } else {
            connectionStatusElement.textContent = 'Disconnected';
            connectionStatusElement.style.backgroundColor = '#f44336'; // Red
        }
    }
    
    // Log connection state
    console.log('Connection state updated:', isConnected ? 'Connected' : 'Disconnected');
    
    // Check socket state if it exists
    if (socket) {
        console.log('WebSocket state:', 
            socket.readyState === WebSocket.CONNECTING ? 'CONNECTING' :
            socket.readyState === WebSocket.OPEN ? 'OPEN' :
            socket.readyState === WebSocket.CLOSING ? 'CLOSING' :
            socket.readyState === WebSocket.CLOSED ? 'CLOSED' : 'UNKNOWN'
        );
    }
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
 * Initialize output audio analyzer
 */
function initOutputAudioAnalyzer() {
    if (!window.audioViz || !window.audioViz.initAudio) {
        console.error('Audio visualization module not available');
        return false;
    }
    
    try {
        // Get the audio context from audio-viz.js
        const audioContext = window.audioViz.getAudioContext();
        if (!audioContext) {
            console.error('Audio context not available');
            return false;
        }
        
        // Create analyzer node for output audio
        outputAnalyser = audioContext.createAnalyser();
        outputAnalyser.fftSize = 256; // Match the FFT size in audio-viz.js
        outputAnalyser.smoothingTimeConstant = 0.8; // Match the smoothing in audio-viz.js
        
        // Create data array for frequency data
        const bufferLength = outputAnalyser.frequencyBinCount;
        outputDataArray = new Uint8Array(bufferLength);
        
        console.log('Output audio analyzer initialized');
        return true;
    } catch (error) {
        console.error('Failed to initialize output audio analyzer:', error);
        return false;
    }
}

/**
 * Visualize output audio
 */
function visualizeOutputAudio() {
    if (!outputVisualizationActive || !outputAnalyser || !outputDataArray) return;
    
    // Request animation frame
    requestAnimationFrame(visualizeOutputAudio);
    
    // Get frequency data
    outputAnalyser.getByteFrequencyData(outputDataArray);
    
    // Calculate average level
    let sum = 0;
    for (let i = 0; i < outputDataArray.length; i++) {
        sum += outputDataArray[i];
    }
    
    // Normalize level to 0-1 range
    const average = sum / outputDataArray.length;
    const level = average / 255;
    
    // Update visualization
    if (window.threeViz && window.threeViz.updateVisualizationRing) {
        window.threeViz.updateVisualizationRing(level);
    }
}

/**
 * Play audio from base64 string
 * @param {string} base64Audio - Base64-encoded audio data
 * @param {number} duration - Duration of the audio in seconds
 */
function playAudio(base64Audio, duration) {
    console.log('playAudio called with duration:', duration);
    
    // Add to queue
    const blob = convertBase64ToBlob(base64Audio);
    audioQueue.push(blob);
    console.log('Added audio to queue. Queue length:', audioQueue.length);
    
    // Start playing if not already playing
    if (!isPlaying) {
        console.log('Not currently playing, starting playback...');
        playNextAudio();
    } else {
        console.log('Already playing audio, added to queue for later playback');
    }
}

/**
 * Play next audio in queue
 */
function playNextAudio() {
    if (audioQueue.length === 0) {
        console.log('Audio queue is empty, stopping playback');
        isPlaying = false;
        return;
    }
    
    console.log('Playing next audio in queue. Queue length:', audioQueue.length);
    isPlaying = true;
    
    // Get next audio from queue
    const blob = audioQueue.shift();
    
    // Create audio URL
    const audioUrl = URL.createObjectURL(blob);
    console.log('Created audio URL:', audioUrl);
    
    // Create audio element
    currentAudio = new Audio(audioUrl);
    
    // Set volume to maximum
    currentAudio.volume = 1.0;
    
    // Connect to audio analyzer for visualization
    try {
        // Initialize output analyzer if not already initialized
        if (!outputAnalyser) {
            initOutputAudioAnalyzer();
        }
        
        // Connect audio element to analyzer when it starts playing
        currentAudio.addEventListener('playing', () => {
            try {
                const audioContext = window.audioViz.getAudioContext();
                if (audioContext && outputAnalyser) {
                    // Create media element source
                    const source = audioContext.createMediaElementSource(currentAudio);
                    
                    // Connect source to analyzer and then to destination
                    source.connect(outputAnalyser);
                    source.connect(audioContext.destination);
                    
                    // Start visualization if not already active
                    if (!outputVisualizationActive) {
                        outputVisualizationActive = true;
                        visualizeOutputAudio();
                    }
                    
                    console.log('Connected output audio to analyzer');
                }
            } catch (error) {
                console.error('Error connecting output audio to analyzer:', error);
            }
        }, { once: true });
    } catch (error) {
        console.error('Error setting up audio analysis:', error);
    }
    
    // Play audio
    currentAudio.play()
        .then(() => {
            console.log('Audio playback started successfully');
        })
        .catch(error => {
            console.error('Error playing audio:', error);
            isPlaying = false;
            playNextAudio();
        });
    
    // When audio ends, play next in queue
    currentAudio.onended = () => {
        console.log('Audio playback ended');
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
    
    // Stop visualization
    outputVisualizationActive = false;
    
    // Update visualization to show no audio
    if (window.threeViz && window.threeViz.updateVisualizationRing) {
        window.threeViz.updateVisualizationRing(0);
    }
    
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

/**
 * Send a test message to the server
 */
function sendTestMessage() {
    if (!isConnected || !socket || socket.readyState !== WebSocket.OPEN) {
        console.warn('Cannot send test message: WebSocket not connected');
        alert('Cannot send test message: WebSocket not connected');
        return;
    }
    
    console.log('Sending manual test message to trigger audio response...');
    
    // Create a test message
    const testMessage = {
        type: 'text',
        text: 'Tell me about Antarctica'
    };
    
    // Log the message
    console.log('Test message:', JSON.stringify(testMessage));
    
    // Send the message
    socket.send(JSON.stringify(testMessage));
    
    // Log that the message was sent
    console.log('Test message sent successfully');
    
    // Play a test sound to verify audio is working
    const testAudio = new Audio();
    testAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
    testAudio.volume = 1.0;
    
    testAudio.oncanplay = () => {
        console.log('Test audio can play');
        testAudio.play()
            .then(() => {
                console.log('Test audio playback started');
            })
            .catch(error => {
                console.error('Test audio playback failed:', error);
                alert('Test audio playback failed: ' + error.message);
            });
    };
    
    testAudio.onerror = (error) => {
        console.error('Test audio error:', error);
        alert('Test audio error: ' + error);
    };
}
