// Arka: Antarctica Personification Project
// Main server file

require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const axios = require('axios');
const { Buffer } = require('buffer');
const crypto = require('crypto');
const { HumeClient } = require('hume');

// Flag to use mock implementation
const USE_MOCK_API = false;

// Initialize Hume client
const humeClient = new HumeClient({
  apiKey: process.env.HUME_API_KEY,
  apiSecret: process.env.HUME_API_SECRET
});

// Log available methods in the HumeClient
console.log('HumeClient methods:', Object.getOwnPropertyNames(HumeClient.prototype));
console.log('Client instance methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(humeClient)));

// Mock responses for Antarctica AI
const mockResponses = [
  "Hello! I'm Antarctica, the frozen continent at the bottom of the world.",
  "Did you know that I'm the coldest, windiest, and driest continent on Earth?",
  "I'm home to about 90% of the world's ice, which contains 70% of Earth's fresh water.",
  "My average temperature in winter ranges from -40°C to -70°C (-40°F to -94°F).",
  "Scientists from many countries live and work in research stations across my surface.",
  "Climate change is affecting me significantly. My ice sheets are melting at an accelerating rate.",
  "The Antarctic Treaty, signed in 1959, preserves me for peaceful scientific research.",
  "I have no permanent human residents, only researchers who stay temporarily.",
  "Emperor penguins are one of my most iconic residents. They can dive deeper than any other bird!",
  "The ozone hole was first discovered above me in the 1980s."
];

// Mock audio data (base64-encoded empty audio)
const mockAudioData = "UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";

/**
 * Get a random response from the mock responses
 * @returns {string} Random response
 */
function getRandomResponse() {
  const randomIndex = Math.floor(Math.random() * mockResponses.length);
  return mockResponses[randomIndex];
}

// Hume EVI API configuration
const HUME_API_KEY = process.env.HUME_API_KEY;
const HUME_API_SECRET = process.env.HUME_API_SECRET;
const HUME_CONFIG_ID = process.env.HUME_CONFIG_ID;
const HUME_API_URL = process.env.HUME_API_URL;
const HUME_WEBSOCKET_URL = process.env.HUME_WEBSOCKET_URL;

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(helmet({
  contentSecurityPolicy: false // Disabled for development, enable in production
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket server
const wss = new WebSocket.Server({ server });

// Map to store client-to-hume connections
const clientConnections = new Map();

/**
 * Initialize a session with Hume EVI API or mock implementation
 * @returns {Promise<object>} EVI WebSocket connection or session ID
 */
async function initializeHumeSession() {
  if (USE_MOCK_API) {
    // Use mock implementation
    console.log('Using mock implementation for Hume EVI API');
    const sessionId = crypto.randomUUID();
    console.log('Mock session initialized:', sessionId);
    return { sessionId };
  } else {
    try {
      console.log('Initializing Hume EVI session with config ID:', HUME_CONFIG_ID);
      
      // Check if the humeClient has the empathicVoice property
      if (!humeClient.empathicVoice) {
        console.error('Hume client does not have empathicVoice property');
        console.log('Using direct WebSocket connection instead');
        
        // Generate a random session ID for now
        const sessionId = crypto.randomUUID();
        console.log('Generated session ID:', sessionId);
        return { sessionId };
      }
      
      // Connect to EVI using the Hume client
      const eviSocket = await humeClient.empathicVoice.chat.connect({
        configId: HUME_CONFIG_ID
      });
      
      console.log('Hume EVI session initialized');
      return eviSocket;
    } catch (error) {
      console.error('Error initializing Hume EVI session:', error.message);
      
      // Fall back to mock implementation
      console.log('Falling back to mock implementation');
      const sessionId = crypto.randomUUID();
      console.log('Mock session initialized:', sessionId);
      return { sessionId };
    }
  }
}

/**
 * Connect to Hume EVI WebSocket or create a mock connection
 * @param {object} eviSession - Hume EVI WebSocket connection or session ID
 * @param {WebSocket} clientWs - Client WebSocket connection
 */
function connectToHumeWebSocket(eviSession, clientWs) {
  if (USE_MOCK_API || eviSession.sessionId) {
    // Use mock implementation
    console.log('Using mock implementation for Hume EVI WebSocket');
    
    // Get session ID
    const sessionId = eviSession.sessionId || crypto.randomUUID();
    
    // Create a mock connection object
    const mockConnection = {
      sessionId,
      send: (message) => {
        console.log('Mock: Sending message to Hume:', message);
        console.log('Mock: Message type:', JSON.parse(message).type);
        
        // Parse the message
        const parsedMessage = JSON.parse(message);
        
        // Simulate a delay before responding
        setTimeout(() => {
          if (parsedMessage.type === 'text') {
            // Get a random response
            const response = getRandomResponse();
            
            // Send the text response to the client
            clientWs.send(JSON.stringify({
              type: 'text',
              text: response
            }));
            
            // Send audio response to the client
            setTimeout(() => {
              clientWs.send(JSON.stringify({
                type: 'audio',
                audio: mockAudioData,
                duration: 2.5
              }));
            }, 500);
          } else if (parsedMessage.type === 'audio_input' || parsedMessage.type === 'audio') {
            // Handle audio input
            console.log('Mock: Received audio data');
            
            // Simulate speech recognition
            const recognizedText = "Tell me about yourself";
            
            // Send the recognized text to the client
            clientWs.send(JSON.stringify({
              type: 'user_message',
              text: recognizedText
            }));
            
            // Get a random response
            const response = getRandomResponse();
            
            // Send the text response to the client
            setTimeout(() => {
              clientWs.send(JSON.stringify({
                type: 'assistant_message',
                text: response
              }));
              
              // Send audio response to the client
              setTimeout(() => {
                clientWs.send(JSON.stringify({
                  type: 'audio_output',
                  data: mockAudioData,
                  duration: 2.5
                }));
                
                // Send assistant end message
                setTimeout(() => {
                  clientWs.send(JSON.stringify({
                    type: 'assistant_end'
                  }));
                }, 500);
              }, 500);
            }, 1000);
          } else if (parsedMessage.type === 'session_settings') {
            // Handle session settings
            console.log('Mock: Received session settings:', parsedMessage.audio);
          }
        }, 1000);
      },
      close: () => {
        console.log('Mock: Closing Hume WebSocket connection');
      }
    };
    
    // Store the mock connection
    clientConnections.set(clientWs, {
      humeWs: mockConnection,
      sessionId
    });
    
    // Send a system message to the client
    clientWs.send(JSON.stringify({
      type: 'system',
      message: 'Connected to Antarctica AI (Mock)'
    }));
    
    return mockConnection;
  } else {
    try {
      // If we have an EVI socket from the SDK, use it
      if (eviSession.on && typeof eviSession.on === 'function') {
        console.log('Using EVI socket from SDK');
        
        // Store the connection
        clientConnections.set(clientWs, {
          humeWs: eviSession,
          sessionId: 'evi-session'
        });
        
        // Send a system message to the client
        clientWs.send(JSON.stringify({
          type: 'system',
          message: 'Connected to Antarctica AI'
        }));
        
        // Set up event handlers for the EVI socket
        eviSession.on('message', (message) => {
          try {
            console.log('Received message from Hume EVI:', message.type);
            
            // Forward the message to the client
            clientWs.send(JSON.stringify(message));
          } catch (error) {
            console.error('Error handling message from Hume EVI:', error);
            clientWs.send(JSON.stringify({
              type: 'error',
              message: 'Error processing response from Antarctica'
            }));
          }
        });
        
        // Handle EVI socket errors
        eviSession.on('error', (error) => {
          console.error('Hume EVI error:', error);
          clientWs.send(JSON.stringify({
            type: 'error',
            message: 'Error communicating with Antarctica'
          }));
        });
        
        // Handle EVI socket close
        eviSession.on('close', () => {
          console.log('Hume EVI connection closed');
          clientWs.send(JSON.stringify({
            type: 'system',
            message: 'Antarctica connection closed'
          }));
          
          // Clean up the connection
          clientConnections.delete(clientWs);
        });
        
        return eviSession;
      } else {
        // Fall back to direct WebSocket connection
        console.log('Falling back to direct WebSocket connection');
        
        // Create WebSocket URL with session ID using the original URL from the .env file
        const sessionId = eviSession.sessionId || crypto.randomUUID();
        const humeWsUrl = `${HUME_WEBSOCKET_URL}/${sessionId}`;
        
        console.log('Connecting to Hume WebSocket URL:', humeWsUrl);
        
        // Connect to Hume WebSocket
        const humeWs = new WebSocket(humeWsUrl, {
          headers: {
            'X-Hume-Api-Key': HUME_API_KEY,
            'X-Hume-Api-Secret': HUME_API_SECRET
          }
        });

        // Store the connection
        clientConnections.set(clientWs, {
          humeWs,
          sessionId
        });

        // Handle Hume WebSocket connection open
        humeWs.on('open', () => {
          console.log('Connected to Hume WebSocket');
          clientWs.send(JSON.stringify({
            type: 'system',
            message: 'Connected to Antarctica AI'
          }));
        });

        // Handle messages from Hume
        humeWs.on('message', (data) => {
          try {
            // Parse the message from Hume
            const message = JSON.parse(data);
            console.log('Received message from Hume:', message.type);
            
            // Forward the message to the client
            clientWs.send(JSON.stringify(message));
          } catch (error) {
            console.error('Error handling message from Hume:', error);
            clientWs.send(JSON.stringify({
              type: 'error',
              message: 'Error processing response from Antarctica'
            }));
          }
        });

        // Handle Hume WebSocket errors
        humeWs.on('error', (error) => {
          console.error('Hume WebSocket error:', error);
          clientWs.send(JSON.stringify({
            type: 'error',
            message: 'Error communicating with Antarctica'
          }));
        });

        // Handle Hume WebSocket close
        humeWs.on('close', (code, reason) => {
          console.log(`Hume WebSocket closed: ${code} - ${reason}`);
          clientWs.send(JSON.stringify({
            type: 'system',
            message: 'Antarctica connection closed'
          }));
          
          // Clean up the connection
          clientConnections.delete(clientWs);
        });

        return humeWs;
      }
    } catch (error) {
      console.error('Error connecting to Hume WebSocket:', error);
      clientWs.send(JSON.stringify({
        type: 'error',
        message: 'Failed to connect to Antarctica'
      }));
      
      // Fall back to mock implementation
      console.log('Falling back to mock implementation');
      return connectToHumeWebSocket({ sessionId: crypto.randomUUID() }, clientWs);
    }
  }
}

// WebSocket connection handling
wss.on('connection', async (ws) => {
  console.log('Client connected');
  
  try {
    // Initialize Hume session
    const eviSession = await initializeHumeSession();
    
    // Connect to Hume WebSocket
    const humeWs = connectToHumeWebSocket(eviSession, ws);
    
// Handle messages from client
ws.on('message', (message) => {
  try {
    console.log('Received message from client:', message.toString());
    
    // Get the Hume connection
    const connection = clientConnections.get(ws);
    if (!connection || !connection.humeWs) {
      console.error('No Hume connection found for client');
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Not connected to Antarctica'
      }));
      return;
    }
    
    // Parse the message if it's JSON
    let messageObj;
    try {
      messageObj = JSON.parse(message.toString());
    } catch (e) {
      // If it's not JSON, assume it's text
      messageObj = {
        type: 'text',
        text: message.toString()
      };
      console.log('Parsed text message:', messageObj);
    }
    
    // Forward the message to Hume
    if (connection.humeWs.send && typeof connection.humeWs.send === 'function') {
      // For mock implementation or direct WebSocket
      console.log('Forwarding message to Hume:', messageObj);
      connection.humeWs.send(JSON.stringify(messageObj));
    } else {
      // For Hume SDK WebSocket
      console.log('Using Hume SDK methods to send message');
      
      // Use the appropriate method based on message type
      if (messageObj.type === 'audio_input' || messageObj.type === 'audio') {
        if (connection.humeWs.sendAudioInput) {
          connection.humeWs.sendAudioInput({ data: messageObj.data });
        } else {
          console.error('sendAudioInput method not available');
        }
      } else if (messageObj.type === 'text') {
        // For text messages, we'll convert them to audio input with empty data
        // This is a workaround since EVI doesn't natively accept text input
        if (connection.humeWs.sendAudioInput) {
          console.log('Converting text to audio input for Hume EVI');
          
          try {
            // Send empty audio data to trigger EVI to listen
            // This is a workaround since EVI doesn't natively accept text input
            connection.humeWs.sendAudioInput({ data: '' });
            
            // Log the text message for reference
            console.log('Text message (not sent directly):', messageObj.text);
            
            // Send a user_message to the client to show what was "heard"
            ws.send(JSON.stringify({
              type: 'user_message',
              text: messageObj.text
            }));
          } catch (error) {
            console.error('Error sending audio input to Hume EVI:', error);
            
            // Fall back to mock implementation
            useMockImplementation();
          }
        } else {
          console.error('sendAudioInput method not available');
          
          // Fall back to mock implementation
          useMockImplementation();
        }
        
        // Helper function for mock implementation
        function useMockImplementation() {
          console.log('Using mock implementation for text message');
          console.log('Generating random response');
          
          // Get a random response
          const response = getRandomResponse();
          
          // Send the text response to the client
          setTimeout(() => {
            ws.send(JSON.stringify({
              type: 'text',
              text: response
            }));
            
            // Send audio response to the client
            setTimeout(() => {
              ws.send(JSON.stringify({
                type: 'audio',
                audio: mockAudioData,
                duration: 2.5
              }));
            }, 500);
          }, 1000);
        }
      } else if (messageObj.type === 'session_settings') {
        console.log('Session settings received, but no method to forward them');
      } else {
        console.error('Unknown message type or method not available:', messageObj.type);
      }
    }
      } catch (error) {
        console.error('Error handling message from client:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Error processing your message'
        }));
      }
    });
    
    // Handle disconnection
    ws.on('close', () => {
      console.log('Client disconnected');
      
      // Close the Hume connection
      const connection = clientConnections.get(ws);
      if (connection && connection.humeWs) {
        connection.humeWs.close();
      }
      
      // Clean up the connection
      clientConnections.delete(ws);
    });
  } catch (error) {
    console.error('Error setting up client connection:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Failed to connect to Antarctica'
    }));
    ws.close();
  }
});

// API routes
app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', message: 'Arka server is running' });
});

// API route to get client configuration
app.get('/api/config', (req, res) => {
  res.json({
    forceAurora: process.env.FORCE_AURORA === 'true'
  });
});

// Serve the frontend for all other routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
server.listen(port, () => {
  console.log(`Arka server listening at http://localhost:${port}`);
});
