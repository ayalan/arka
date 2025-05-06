// Test script for Hume EVI API
require('dotenv').config();
const { HumeClient } = require('hume');

// Initialize Hume client
const humeClient = new HumeClient({
  apiKey: process.env.HUME_API_KEY,
  apiSecret: process.env.HUME_API_SECRET
});

// Log available methods in the HumeClient
console.log('HumeClient methods:', Object.getOwnPropertyNames(HumeClient.prototype));
console.log('Client instance methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(humeClient)));

// Test function to connect to Hume EVI API
async function testHumeEVI() {
  try {
    console.log('Testing Hume EVI API...');
    
    // Check if the humeClient has the empathicVoice property
    if (!humeClient.empathicVoice) {
      console.error('Hume client does not have empathicVoice property');
      console.log('This suggests that the Hume SDK version you are using does not support the EVI API');
      console.log('You may need to install a different version of the Hume SDK');
      return;
    }
    
    // Connect to EVI using the Hume client
    console.log('Connecting to EVI...');
    const eviSocket = await humeClient.empathicVoice.chat.connect({
      configId: process.env.HUME_CONFIG_ID
    });
    
    console.log('Connected to EVI');
    console.log('EVI socket methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(eviSocket)));
    
    // Set up event handlers for the EVI socket
    eviSocket.on('message', (message) => {
      console.log('Received message from EVI:', message.type, message);
    });
    
    // Wait for the socket to be open
    console.log('Waiting for socket to be open...');
    if (eviSocket.tillSocketOpen) {
      await eviSocket.tillSocketOpen();
      console.log('Socket is now open');
    } else {
      console.log('tillSocketOpen method not available, waiting 2 seconds');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Send a text message to EVI
    console.log('Sending text message to EVI...');
    
    try {
      // Try sending as audio input with empty data
      if (eviSocket.sendAudioInput) {
        console.log('Trying sendAudioInput method...');
        await eviSocket.sendAudioInput({ data: '' });
        console.log('Audio input sent (empty data)');
      }
    } catch (error) {
      console.error('Error sending audio input:', error.message);
    }
    
    try {
      // Try sending as text using sendJson
      if (eviSocket.sendJson) {
        console.log('Trying sendJson method with text message...');
        await eviSocket.sendJson({
          type: 'text',
          text: 'Tell me about yourself'
        });
        console.log('Text message sent using sendJson');
      }
    } catch (error) {
      console.error('Error sending text using sendJson:', error.message);
    }
    
    // Keep the connection open for a while to receive responses
    console.log('Waiting for responses...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Close the connection
    console.log('Closing connection...');
    await eviSocket.close();
    console.log('Connection closed');
  } catch (error) {
    console.error('Error testing Hume EVI API:', error);
  }
}

// Run the test
testHumeEVI().catch(console.error);
