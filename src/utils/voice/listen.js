const { EndBehaviorType, createAudioResource, StreamType } = require('@discordjs/voice');
const prism = require('prism-media');
const { OpusEncoder } = require('@discordjs/opus');
const axios = require('axios');
const { callDeepSeek } = require('../deepseek');
const { getTTSAudio } = require('../tts');

const WIT_AI_URL = 'https://api.wit.ai/speech?v=20231231';
const listeningState = new Map();
const processingUsers = new Set();

// Safe resampling with bounds checking
function resamplePcm(pcmBuffer, inRate, outRate, channels) {
  if (inRate === outRate) return pcmBuffer;
  const samplesPerChannel = pcmBuffer.length / (channels * 2);
  const outSamples = Math.floor(samplesPerChannel * outRate / inRate);
  const outBuffer = Buffer.alloc(outSamples * channels * 2);
  const step = inRate / outRate;
  for (let i = 0; i < outSamples; i++) {
    const srcIndex = Math.floor(i * step) * channels * 2;
    if (srcIndex + channels * 2 > pcmBuffer.length) break;
    for (let ch = 0; ch < channels; ch++) {
      const sample = pcmBuffer.readInt16LE(srcIndex + ch * 2);
      outBuffer.writeInt16LE(sample, (i * channels + ch) * 2);
    }
  }
  return outBuffer;
}

// Convert stereo PCM to mono by averaging
function stereoToMono(stereoBuffer) {
  const monoBuffer = Buffer.alloc(stereoBuffer.length / 2);
  for (let i = 0; i < stereoBuffer.length / 4; i++) {
    const left = stereoBuffer.readInt16LE(i * 4);
    const right = stereoBuffer.readInt16LE(i * 4 + 2);
    const mono = Math.floor((left + right) / 2);
    monoBuffer.writeInt16LE(mono, i * 2);
  }
  return monoBuffer;
}

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

    const audioStream = connection.receiver.subscribe(userId, {
      end: {
        behavior: EndBehaviorType.AfterSilence,
        duration: 1000,
      },
    });

    const packets = [];
    let firstPacket = null;
    audioStream.on('data', (packet) => {
      packets.push(packet);
      if (!firstPacket) {
        firstPacket = packet;
        console.log(`First packet size: ${packet.length}, first 20 bytes: ${packet.slice(0, 20).toString('hex')}`);
      }
    });
    audioStream.on('error', (err) => console.error('Audio stream error:', err));

    audioStream.on('end', async () => {
      try {
        if (!state.active) return;
        if (packets.length === 0) {
          processingUsers.delete(userId);
          return;
        }

        console.log(`Received ${packets.length} Opus packets`);

        // Attempt to decode packets individually to verify they are valid
        let anyValid = false;
        const pcmChunks = [];
        const encoder = new OpusEncoder(48000, 2);
        for (let i = 0; i < Math.min(packets.length, 5); i++) {
          try {
            const pcm = encoder.decode(packets[i]);
            pcmChunks.push(pcm);
            anyValid = true;
            console.log(`Packet ${i} decoded OK, PCM size: ${pcm.length}`);
          } catch (err) {
            console.log(`Packet ${i} decode failed:`, err.message);
          }
        }
        if (!anyValid) {
          console.error('No packet could be decoded as Opus');
          processingUsers.delete(userId);
          return;
        }

        // Full stream decode using prism
        let pcmBuffer = null;
        try {
          const decoder = new prism.opus.Decoder({ rate: 48000, channels: 2, frameSize: 960 });
          const pcmChunksFull = [];
          decoder.on('data', (chunk) => pcmChunksFull.push(chunk));
          decoder.on('error', (err) => { throw err; });
          for (const packet of packets) decoder.write(packet);
          decoder.end();
          pcmBuffer = Buffer.concat(pcmChunksFull);
          console.log(`Full stream prism decode: ${pcmBuffer.length} bytes PCM`);
        } catch (err) {
          console.error('Full stream prism decode error:', err.message);
          // Fallback to individually decoded packets
          if (pcmChunks.length) {
            pcmBuffer = Buffer.concat(pcmChunks);
            console.log(`Using per-packet decoded PCM (${pcmBuffer.length} bytes)`);
          } else {
            processingUsers.delete(userId);
            return;
          }
        }

        if (!pcmBuffer || pcmBuffer.length === 0) {
          console.error('No PCM data after decoding');
          processingUsers.delete(userId);
          return;
        }

        // Convert to mono 16kHz
        const monoPcm = stereoToMono(pcmBuffer);
        console.log(`Mono PCM size: ${monoPcm.length} bytes`);
        const resampledPcm = resamplePcm(monoPcm, 48000, 16000, 1);
        console.log(`Resampled to 16kHz mono, size: ${resampledPcm.length} bytes`);

        // Create WAV
        const wavBuffer = pcmToWav(resampledPcm, 16000, 1);
        console.log(`WAV buffer size: ${wavBuffer.length} bytes`);

        // Send to Wit.ai
        let transcript;
        try {
          const res = await axios.post(WIT_AI_URL, wavBuffer, {
            headers: {
              'Authorization': `Bearer ${process.env.WIT_AI_TOKEN}`,
              'Content-Type': 'audio/wav',
            },
          });
          console.log('Wit.ai response:', res.data);
          transcript = res.data.text;
        } catch (err) {
          console.error('Wit.ai error:', err.response?.data || err.message);
          processingUsers.delete(userId);
          return;
        }

        if (!transcript?.trim()) {
          console.log('Empty transcript');
          processingUsers.delete(userId);
          return;
        }

        console.log(`[${guildId}] ${user.tag}: ${transcript}`);

        // DeepSeek AI
        const reply = await callDeepSeek(transcript);
        if (!reply) {
          processingUsers.delete(userId);
          return;
        }
        console.log(`[${guildId}] Bot reply: ${reply}`);

        // TTS
        let audioStreamTTS;
        try {
          audioStreamTTS = await getTTSAudio(reply);
          console.log('TTS stream obtained');
        } catch (err) {
          console.error('TTS error:', err.message);
          processingUsers.delete(userId);
          return;
        }

        const resource = createAudioResource(audioStreamTTS, { inputType: StreamType.Arbitrary });
        player.play(resource);
        console.log('Played TTS response');

      } catch (err) {
        console.error('Voice pipeline error:', err);
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

  wavBuffer.write('RIFF', 0);
  wavBuffer.writeUInt32LE(totalSize - 8, 4);
  wavBuffer.write('WAVE', 8);
  wavBuffer.write('fmt ', 12);
  wavBuffer.writeUInt32LE(16, 16);
  wavBuffer.writeUInt16LE(1, 20);
  wavBuffer.writeUInt16LE(channels, 22);
  wavBuffer.writeUInt32LE(sampleRate, 24);
  wavBuffer.writeUInt32LE(byteRate, 28);
  wavBuffer.writeUInt16LE(blockAlign, 32);
  wavBuffer.writeUInt16LE(16, 34);
  wavBuffer.write('data', 36);
  wavBuffer.writeUInt32LE(dataSize, 40);
  pcmBuffer.copy(wavBuffer, 44);
  return wavBuffer;
}

module.exports = { startListening, stopListening };