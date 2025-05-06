/**
 * Arka: Antarctica Personification Project
 * Audio Visualization Module
 */

// Global variables
let audioContext;
let analyser;
let dataArray;
let source;
let audioAnimationId; // Renamed from animationId to avoid conflict with three-setup.js
let isProcessing = false;

// Constants
const FFT_SIZE = 256;
const SMOOTHING = 0.8;
const UPDATE_INTERVAL = 50; // ms

/**
 * Initialize audio context and analyzer
 */
function initAudio() {
    try {
        // Create audio context
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioContext();
        
        // Create analyser node
        analyser = audioContext.createAnalyser();
        analyser.fftSize = FFT_SIZE;
        analyser.smoothingTimeConstant = SMOOTHING;
        
        // Create data array for frequency data
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
        
        console.log('Audio visualization initialized');
        return true;
    } catch (error) {
        console.error('Failed to initialize audio visualization:', error);
        return false;
    }
}

/**
 * Start processing audio from a stream
 * @param {MediaStream} stream - Audio stream to process
 */
function startAudioProcessing(stream) {
    if (!audioContext || !analyser) {
        if (!initAudio()) return;
    }
    
    try {
        // Resume audio context if suspended
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        
        // Create source from stream
        source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        
        // Start visualization loop
        isProcessing = true;
        visualize();
        
        console.log('Audio processing started');
    } catch (error) {
        console.error('Failed to start audio processing:', error);
    }
}

/**
 * Stop audio processing
 */
function stopAudioProcessing() {
    isProcessing = false;
    
    if (audioAnimationId) {
        cancelAnimationFrame(audioAnimationId);
        audioAnimationId = null;
    }
    
    if (source) {
        source.disconnect();
        source = null;
    }
    
    // Update visualization to show no audio
    if (window.threeViz && window.threeViz.updateVisualizationRing) {
        window.threeViz.updateVisualizationRing(0);
    }
    
    console.log('Audio processing stopped');
}

/**
 * Visualization loop
 */
function visualize() {
    if (!isProcessing) return;
    
    audioAnimationId = requestAnimationFrame(visualize);
    
    // Get frequency data
    analyser.getByteFrequencyData(dataArray);
    
    // Calculate average level
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
    }
    
    // Normalize level to 0-1 range
    const average = sum / dataArray.length;
    const level = average / 255;
    
    // Update visualization
    if (window.threeViz && window.threeViz.updateVisualizationRing) {
        window.threeViz.updateVisualizationRing(level);
    }
}

/**
 * Process audio from microphone
 */
function processAudioFromMic() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('getUserMedia not supported in this browser');
        return Promise.reject(new Error('getUserMedia not supported'));
    }
    
    return navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then(stream => {
            startAudioProcessing(stream);
            return stream;
        })
        .catch(error => {
            console.error('Error accessing microphone:', error);
            throw error;
        });
}

/**
 * Process audio from a remote stream
 * @param {MediaStream} stream - Remote audio stream
 */
function processAudioFromStream(stream) {
    if (!stream) {
        console.error('No stream provided');
        return;
    }
    
    startAudioProcessing(stream);
}

/**
 * Clean up audio resources
 */
function cleanupAudio() {
    stopAudioProcessing();
    
    if (audioContext) {
        audioContext.close().catch(console.error);
        audioContext = null;
    }
    
    analyser = null;
    dataArray = null;
}

/**
 * Get the audio context
 * @returns {AudioContext} The audio context
 */
function getAudioContext() {
    // Initialize audio context if it doesn't exist
    if (!audioContext) {
        initAudio();
    }
    return audioContext;
}

// Export functions for use in other modules
window.audioViz = {
    initAudio,
    processAudioFromMic,
    processAudioFromStream,
    stopAudioProcessing,
    cleanupAudio,
    getAudioContext
};

// Initialize when document is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize audio context but don't start processing yet
    initAudio();
    
    // Add event listener to connect button to start audio processing
    const connectButton = document.getElementById('connect-btn');
    if (connectButton) {
        connectButton.addEventListener('click', () => {
            if (connectButton.textContent === 'Connect') {
                processAudioFromMic().catch(console.error);
            } else if (connectButton.textContent === 'Disconnect') {
                stopAudioProcessing();
            }
        });
    }
});
