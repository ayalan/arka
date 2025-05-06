---
title: Empathic Voice Interface (EVI)
excerpt: >-
  Hume's Empathic Voice Interface (EVI) is the world’s first emotionally
  intelligent voice AI.
---

Hume's Empathic Voice Interface (EVI) is the world’s first emotionally intelligent voice AI. It accepts live audio 
input and returns both generated audio and transcripts augmented with measures of vocal expression. By processing the 
tune, rhythm, and timbre of speech, EVI unlocks a variety of new capabilities, like knowing when to speak and 
generating more empathic language with the right tone of voice. These features enable smoother and more satisfying 
voice-based interactions between humans and AI, opening new possibilities for personal AI, customer service, 
accessibility, robotics, immersive gaming, VR experiences, and much more.

We provide a suite of tools to integrate and customize EVI for your application, including a 
[WebSocket API](/reference/empathic-voice-interface-evi/chat/chat) that handles audio and text transport, a 
[REST API](/reference/empathic-voice-interface-evi/chats/list-chats) for fetching Chat history and managing EVI 
configurations,and [SDKs](/intro#sdks) to simplify integration into web and Python-based projects. Additionally, we 
provide [open-source examples](https://github.com/HumeAI/hume-api-examples) and a 
[web widget](https://www.npmjs.com/package/@humeai/voice-embed-react) as practical starting points for developers to 
explore and implement EVI's capabilities within their own projects.

## Overview of EVI features

<Table>
  <tbody>
    <tr>
      <td rowSpan="4">**Basic capabilities**</td>
      <td>Transcribes speech (ASR)</td>
      <td>
        Fast and accurate ASR in partnership with Deepgram returns a full transcript of the conversation, with Hume’s
        expression measures tied to each sentence.
      </td>
    </tr>
    <tr>
      <td>Generates language responses (LLM)</td>
      <td>
        Rapid language generation with our eLLM, blended seamlessly with configurable partner APIs (OpenAI, Anthropic,
        Fireworks).
      </td>
    </tr>
    <tr>
      <td>Generates voice responses (TTS)</td>
      <td>Streaming speech generation via our proprietary expressive text-to-speech model.</td>
    </tr>
    <tr>
      <td>Responds with low latency</td>
      <td>Immediate response provided by the fastest models running together on one service.</td>
    </tr>
    <tr>
      <td rowSpan="6">**Empathic AI (eLLM) features**</td>
      <td>Responds at the right time</td>
      <td>
        Uses your tone of voice for state-of-the-art end-of-turn detection — the true bottleneck to responding rapidly
        without interrupting you.
      </td>
    </tr>
    <tr>
      <td>Understands users’ prosody</td>
      <td>
        Provides streaming measurements of the tune, rhythm, and timbre of the user’s speech using Hume’s
        <a href="https://www.hume.ai/products/speech-prosody-model">prosody</a> model, integrated with our eLLM.
      </td>
    </tr>
    <tr>
      <td>Forms its own natural tone of voice</td>
      <td>
        Guided by the users’ prosody and language, our model responds with an empathic, naturalistic tone of voice,
        matching the users’ nuanced “vibe” (calmness, interest, excitement, etc.). It responds to frustration with an
        apologetic tone, to sadness with sympathy, and more.
      </td>
    </tr>
    <tr>
      <td>Responds to expression</td>
      <td>
        Powered by our empathic large language model (eLLM), EVI crafts responses that are not just intelligent but
        attuned to what the user is expressing with their voice.
      </td>
    </tr>
    <tr>
      <td>Always interruptible</td>
      <td>
        Stops rapidly whenever users interject, listens, and responds with the right context based on where it left off.
      </td>
    </tr>
    <tr>
      <td>Aligned with well-being</td>
      <td>
        Trained on human reactions to optimize for positive expressions like happiness and satisfaction. EVI will
        continue to learn from users’ reactions using our upcoming fine-tuning endpoint.
      </td>
    </tr>
    <tr>
      <td rowSpan="6">**Developer tools**</td>
      <td>WebSocket API</td>
      <td>Primary interface for real-time bidirectional interaction with EVI, handles audio and text transport.</td>
    </tr>
    <tr>
      <td>REST API </td>
      <td>
        A configuration API that allows developers to customize their EVI - the system prompt, speaking rate, voice,
        LLM, tools the EVI can use, and other options. The system prompt shapes an EVI’s behavior and its responses.
      </td>
    </tr>
    <tr>
      <td>TypeScript SDK</td>
      <td>Encapsulates complexities of audio and WebSockets for seamless integration into web applications.</td>
    </tr>
    <tr>
      <td>Python SDK</td>
      <td>Simplifies the process of integrating EVI into any Python-based project.</td>
    </tr>
    <tr>
      <td>Open source examples</td>
      <td>Example repositories provide a starting point for developers and demonstrate EVI's capabilities.</td>
    </tr>
    <tr>
      <td>Web widget </td>
      <td>
        An iframe widget that any developer can easily embed in their website, allowing users to speak to a
        conversational AI voice about your content.
      </td>
    </tr>
  </tbody>
</Table>

## Building with EVI

The main way to work with EVI is through a WebSocket connection that sends audio and receives responses in real-time. 
This enables fluid, bidirectional dialogue where users speak, EVI listens and analyzes their expressions, and EVI 
generates emotionally intelligent responses.

EVI supports two authentication strategies. Learn more about them at the links below:
- [API key authentication](/docs/introduction/api-key#api-key-authentication)
- [Token authentication](/docs/introduction/api-key#token-authentication)

<Callout type="info">
Both methods require specifying the chosen authentication strategy and providing the corresponding key in the request 
parameters of the EVI WebSocket endpoint. Learn more about Hume's authentication strategies 
[here](/docs/introduction/api-key#authentication-strategies).
</Callout>

You start a conversation by connecting to the WebSocket and streaming the user’s voice input to EVI. You can also send 
EVI text, and it will speak that text aloud.

EVI will respond with:

- The text of EVI’s reply
- EVI’s expressive audio response
- A transcript of the user's message along with their vocal expression measures
- Messages if the user interrupts EVI
- A message to let you know if EVI has finished responding
- Error messages if issues arise

## Quickstart

Accelerate your project setup with our comprehensive quickstart guides, designed to integrate EVI into your Next.js, 
TypeScript, or Python applications. Each guide walks you through EVI API integration while demonstrating how to 
capture user audio and play back EVI's response audio, helping you get up and running quickly.

<Cards> 
  <Card 
    title="Next.js" 
    icon={<img src="https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg" alt="React logo"/>} 
    href="/docs/empathic-voice-interface-evi/quickstart/nextjs" 
  > 
    Build web applications using our React client SDK in Next.js.
  </Card> 
  <Card 
    title="TypeScript" 
    icon={<img src="https://upload.wikimedia.org/wikipedia/commons/4/4c/Typescript_logo_2020.svg" alt="TypeScript logo"/>} 
    href="/docs/empathic-voice-interface-evi/quickstart/typescript" 
  > 
    Develop server-side integrations or frontend applications with our TypeScript SDK. 
  </Card> 
  <Card 
    title="Python" 
    icon={<img src="https://upload.wikimedia.org/wikipedia/commons/c/c3/Python-logo-notext.svg" alt="Python logo"/>} 
    href="/docs/empathic-voice-interface-evi/quickstart/python" 
  > 
    Create integrations in Python using our Python SDK. 
  </Card> 
</Cards>

## API limits

- **WebSocket connections limit**: limited to up to five (5) concurrent connections.
- **WebSocket duration limit**: connections are subject to a default timeout after thirty (30) minutes, or after ten 
  (10) minutes of user inactivity. Duration limits may be adjusted by specifying the 
  [max_duration](/reference/empathic-voice-interface-evi/configs/create-config#request.body.timeouts.max_duration) and 
  [inactivity](/reference/empathic-voice-interface-evi/configs/create-config#request.body.timeouts.inactivity) fields 
  in your EVI configuration.
- **WebSocket message payload size limit**: messages cannot exceed 16MB in size.
- **Request rate limit**: HTTP requests (e.g. [configs endpoints](/reference/empathic-voice-interface-evi/configs/create-config)) 
  are limited to fifty (50) requests per second.

<Callout intent="info">
  To request an increase in your concurrent connection limit, please submit the "Application to Increase EVI 
  Concurrent Connections" found in the EVI section of the [Profile Tab](https://platform.hume.ai/settings/profile).
</Callout>

---
