const { EndBehaviorType, createAudioResource, StreamType } = require('@discordjs/voice');
const prism = require('prism-media');
const { Readable } = require('stream');
const axios = require('axios');
const { callDeepSeek } = require('../deepseek');
const { getTTSAudio } = require('../tts');

// Wit.ai endpoint (versioned, expecting raw audio)
const WIT_AI_URL = 'https://api.wit.ai/speech?v=20231231';

// Store active listening states per guild
const listeningState = new Map();
// Per-user concurrency guard
const processingUsers = new Set();

async function startListening(connection, player, guildId, client) {
  if (listeningState.has(guildId)) return;

  const state = {
    connection,
    player,
    receiver: connection.receiver,
    active: true,
  };
  listeningState.set(guildId, state);

  connection.receiver.speaking.on('start', async (userId) => {
    if (!state.active) return;
    if (processingUsers.has(userId)) return;
    processingUsers.add(userId);

    const user = await client.users.fetch(userId).catch(() => null);
    if (!user || user.bot) {
      processingUsers.delete(userId);
      return;
    }

    console.log(`🎙️ ${user.tag} started speaking`);

    // Subscribe to audio stream
    const audioStream = connection.receiver.subscribe(userId, {
      end: {
        behavior: EndBehaviorType.AfterSilence,
        duration: 1000,
      },
    });

    // Decode Opus → PCM – use auto frame size to avoid corruption errors
    const opusDecoder = new prism.opus.Decoder({ rate: 48000, channels: 2, frameSize: null });
    const pcmStream = audioStream.pipe(opusDecoder);

    pcmStream.on('error', (err) => {
      console.error('PCM stream error:', err.message);
      processingUsers.delete(userId);
    });

    const chunks = [];
    pcmStream.on('data', (chunk) => chunks.push(chunk));

    pcmStream.on('end', async () => {
      try {
        if (!state.active) return;
        if (chunks.length === 0) return;

        // Convert PCM → WAV
        const wavBuffer = pcmToWav(Buffer.concat(chunks), 48000, 2);

        // --- Speech‑to‑text (Wit.ai) ---
        let transcript;
        try {
          // Send raw WAV binary, not multipart
          const res = await axios.post(WIT_AI_URL, wavBuffer, {
            headers: {
              'Authorization': `Bearer ${process.env.WIT_AI_TOKEN}`,
              'Content-Type': 'audio/wav',
            },
          });
          transcript = res.data.text;
        } catch (err) {
          console.error('Wit.ai error:', err.response?.data || err.message);
          return;
        }

        if (!transcript?.trim()) return;
        console.log(`[${guildId}] ${user.tag}: ${transcript}`);

        // --- AI response (DeepSeek) ---
        const reply = await callDeepSeek(transcript);
        if (!reply) return;
        console.log(`[${guildId}] Bot reply: ${reply}`);

        // --- Text‑to‑speech (gTTS) ---
        let audioStreamTTS;
        try {
          audioStreamTTS = await getTTSAudio(reply);
        } catch (err) {
          console.error('TTS error:', err.message);
          return;
        }

        // Play the audio
        const resource = createAudioResource(audioStreamTTS, { inputType: StreamType.Arbitrary });
        player.play(resource);

      } finally {
        processingUsers.delete(userId);
      }
    });
  });

  return state;
}

function stopListening(guildId) {
  const state = listeningState.get(guildId);
  if (state) {
    state.active = false;
    listeningState.delete(guildId);
  }
  processingUsers.clear();
}

function pcmToWav(pcmBuffer, sampleRate, channels) {
  const byteRate = sampleRate * channels * 2;
  const blockAlign = channels * 2;
  const dataSize = pcmBuffer.length;
  const totalSize = 44 + dataSize;
  const wavBuffer = Buffer.alloc(totalSize);

  // RIFF chunk
  wavBuffer.write('RIFF', 0);
  wavBuffer.writeUInt32LE(totalSize - 8, 4);
  wavBuffer.write('WAVE', 8);
  // fmt subchunk
  wavBuffer.write('fmt ', 12);
  wavBuffer.writeUInt32LE(16, 16);
  wavBuffer.writeUInt16LE(1, 20);
  wavBuffer.writeUInt16LE(channels, 22);
  wavBuffer.writeUInt32LE(sampleRate, 24);
  wavBuffer.writeUInt32LE(byteRate, 28);
  wavBuffer.writeUInt16LE(blockAlign, 32);
  wavBuffer.writeUInt16LE(16, 34);
  // data subchunk
  wavBuffer.write('data', 36);
  wavBuffer.writeUInt32LE(dataSize, 40);
  pcmBuffer.copy(wavBuffer, 44);

  return wavBuffer;
}

module.exports = { startListening, stopListening };