---
title: EVI TypeScript Quickstart
excerpt: >-
  A quickstart guide for implementing the Empathic Voice Interface (EVI) with
  TypeScript.
---

This tutorial provides step-by-step instructions for implementing EVI using Hume’s [TypeScript SDK](https://github.com/HumeAI/hume-typescript-sdk),
and is broken down into five sections:

1. **Authentication**: Instantiate the Hume client using your API credentials.
2. **Connecting to EVI**: Initialize a WebSocket connection to interact with EVI.
3. **Capturing & recording audio**: Capture and prepare audio input to stream over the WebSocket.
4. **Audio playback**: Play back the EVI's audio output to the user.
5. **Interruption**: Client-side management of user interruptions during the chat.

<Callout intent="info">
  This guide references our TypeScript Quickstart example project. To see the full implementation, visit our API
  examples repository on GitHub: [evi-typescript-quickstart](https://github.com/HumeAI/hume-api-examples/tree/main/evi/evi-typescript-quickstart).
</Callout>

<Steps>
  ### Authenticate

  To establish an authenticated connection, first instantiate the Hume client with your API credentials.
  Visit our [Getting your API keys page](/docs/introduction/api-key) for details on how to obtain your credentials.

  <Callout intent='warning'>
    This example uses direct [API key authentication](/docs/introduction/api-key#api-key-authentication) for
    simplicity. For production browser environments, implement the [Token authentication](/docs/introduction/api-key#token-authentication)
    strategy instead to prevent exposing your API key in client-side code.
  </Callout>

  <CodeBlock title="TypeScript">
    ```typescript
    import { Hume, HumeClient } from 'hume';

    // instantiate the Hume client and authenticate
    const client = new HumeClient({
      apiKey: import.meta.env.HUME_API_KEY,
    });

    ```

  </CodeBlock>

  ### Connect

  With the Hume client instantiated with your credentials, you can now establish an authenticated WebSocket connection
  with EVI and assign WebSocket event handlers. For now you can include placeholder event handlers to update in
  later steps.

  <CodeBlock title="TypeScript">
    ```typescript
    import { Hume, HumeClient } from 'hume';

    // Instantiate the Hume client and authenticate
    const client = new HumeClient({
      apiKey: import.meta.env.HUME_API_KEY,
    });

    // Connect to EVI
    const socket = await client.empathicVoice.chat.connect({
      configId: import.meta.env.HUME_CONFIG_ID,
    });

    // Define event handlers and assign them to WebSocket
    socket.on('open', handleWebSocketOpenEvent);
    socket.on('message', handleWebSocketMessageEvent);
    socket.on('error', handleWebSocketErrorEvent);
    socket.on('close', handleWebSocketCloseEvent);
    ```
  </CodeBlock>

  ### Audio input

  Next we'll go over capturing and streaming audio input over the WebSocket. First, handle user permissions
  to access the microphone. Next, use the Media Stream API to access the audio stream, and the MediaRecorder API
  to capture and base64 encode the audio chunks. Finally, stream the audio input by sending each chunk over the 
  WebSocket as [audio_input](/reference/empathic-voice-interface-evi/chat/chat#send.Audio%20Input.type) messages using 
  the SDK's `sendAudioInput` method.

  <CodeBlock title="TypeScript">
    ```typescript
    import {
      convertBlobToBase64,
      ensureSingleValidAudioTrack,
      getAudioStream,
      getBrowserSupportedMimeType,
    } from 'hume';

    /**--- Audio Recording State ---*/
    let recorder: MediaRecorder | null = null;
    let audioStream: MediaStream | null = null;
    const mimeTypeResult = getBrowserSupportedMimeType();
    const mimeType: MimeType = mimeTypeResult.success 
      ? mimeTypeResult.mimeType 
      : MimeType.WEBM;

    // Define function for capturing audio
    async function startAudioCapture(): Promise<void> {
      try {
        audioStream = await getAudioStream();
        // Validate the stream
        ensureSingleValidAudioTrack(audioStream);

        recorder = new MediaRecorder(audioStream, { mimeType });
        recorder.ondataavailable = handleAudioDataAvailable;
        recorder.onerror = (event) => {
          console.error("MediaRecorder error:", event);
        }
        recorder.start(50);
      } catch (error) {
        console.error(
          "Failed to initialize or start audio capture:", error
        );
        throw error;
      }
    }

    // Define a WebSocket open event handler to capture audio
    async function handleWebSocketOpen(): Promise<void> {
      console.log('WebSocket connection opened.');
      try {
        await startAudioCapture();
      } catch (error) {
        console.error("Failed to capture audio:", error);
        alert("Failed to access microphone. Disconnecting.");
        if (
          socket && 
          socket.readyState !== WebSocket.CLOSING && 
          socket.readyState !== WebSocket.CLOSED
        ) {
          socket.close();
        }
      }
    }
    ```
  </CodeBlock>

  <Callout intent='info'>
    Accepted audio formats include: `mp3`, `wav`, `aac`, `ogg`, `flac`, `webm`, `avr`, `cdda`,
    `cvs/vms`, `aiff`, `au`, `amr`, `mp2`, `mp4`, `ac3`, `avi`, `wmv`, `mpeg`, `ircam`.
  </Callout>

  ### Audio output

  EVI responds with multiple message types over the WebSocket:

  1. **[`user_message`](/reference#receive.User%20Message.type)**: This message encapsulates the transcription of the
    audio input. Additionally, it includes expression measurement predictions related to the speaker's vocal prosody.
  2. **[`assistant_message`](/reference#receive.Assistant%20Message.type)**: EVI dispatches an `AssistantMessage` for
    every sentence within the response. This message not only relays the content of the response but also features
    predictions regarding the expressive qualities of the generated audio response.
  3. **[`audio_output`](/reference#receive.Audio%20Output.type)**: An `AudioOutput` message accompanies each 
    `AssistantMessage`. This contains the actual audio (binary) response corresponding to an `AssistantMessage`.
  4. **[`assistant_end`](/reference#receive.Assistant%20End.type)**: EVI delivers an `AssistantEnd` message as the
    final piece of communication, signifying the conclusion of the response to the audio input.

  To play the audio output from the response, define your logic for converting the received binary to a Blob,
  and create an `HTMLAudioElement` to play the audio.

  Then update the client's message event handler to invoke the logic to play back the audio when received.
  To manage playback for the incoming audio, you can implement a basic queue and sequentially play back the audio.

  <CodeBlock title="TypeScript">
    ```typescript
    /**--- Audio Playback State ---*/
    const audioQueue: Blob[] = [];
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    let currentSource: AudioBufferSourceNode | null = null;
    let isPlaying = false;

    // Plays the next audio chunk from the queue if available 
    // and not already playing.
    async function playNextAudioChunk(): Promise<void> {
      if (isPlaying || audioQueue.length === 0) return;
      isPlaying = true;

      const audioBlob = audioQueue.shift();
      if (!audioBlob) {
        isPlaying = false;
        return;
      }

      try {
        // Safari requires a user gesture–driven resume
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }
        // Decode the blob into an AudioBuffer
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // Create a source node and play it
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start();

        // Track it so we can stop mid-stream if needed
        currentSource = source;
        source.onended = () => {
          currentSource = null;
          isPlaying = false;
          playNextAudioChunk();
        };
      } catch (error) {
        console.error("Error during audio playback:", error);
        isPlaying = false;
      }
    }

    // Define a WebSocket message event handler to play audio output
    function handleWebSocketMessage(
      message: Hume.empathicVoice.SubscribeEvent
    ) {
      switch (message.type) {
        case 'audio_output':
          // Decode and queue audio for playback
          const audioBlob = convertBase64ToBlob(
            message.data, 
            mimeType
          );
          audioQueue.push(audioBlob);
          // Attempt to play immediately if not already playing
          playNextAudioChunk();
          break;
      }
    }
    ```
  </CodeBlock>

  ### Interrupt

  Interruptibility is a distinguishing feature of EVI. If you send an audio input through the WebSocket while
  receiving response messages for a previous audio input, the response to the previous audio input will stop.
  Additionally, the interface will send back a [user_interruption](/reference/empathic-voice-interface-evi/chat/chat#receive.User%20Interruption.type)
  message, and begin responding to the new audio input.

  <CodeBlock title="TypeScript">
    ```typescript
    // Function for stopping the audio and clearing the queue
    function stopAudioPlayback(): void {
      // Stop any in-flight buffer source
      if (currentSource) {
        try {
          currentSource.stop();
        } catch {}
        currentSource.disconnect();
        currentSource = null;
      }
      // Clear the queue and reset state
      audioQueue.length = 0;
      isPlaying = false;
    }

    // Update WebSocket message event handler to handle interruption
    function handleWebSocketMessage(
      message: Hume.empathicVoice.SubscribeEvent
    ) {
      switch (message.type) {
        case 'user_message':
          // Stop playback if user starts speaking
          stopAudioPlayback();
          break;
        case 'audio_output':
          // Decode and queue audio for playback
          const audioBlob = convertBase64ToBlob(
            message.data,
            mimeType
          );
          audioQueue.push(audioBlob);
          // Attempt to play immediately if not already playing
          playNextAudioChunk();
          break;
        case 'user_interruption':
          // Stop playback immediately when the user interrupts
          console.log("User interruption detected.");
          stopAudioPlayback();
          break;
      }
    }
    ```
  </CodeBlock>
</Steps>

---
