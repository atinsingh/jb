/**
 * PCM downsampler for the live interview copilot.
 *
 * Runs on the audio rendering thread as an AudioWorkletProcessor. It must be a
 * separate file loaded via `audioWorklet.addModule()` — it cannot be bundled
 * into the page, because it executes in a different global scope.
 *
 * Why a worklet rather than ScriptProcessorNode: ScriptProcessorNode runs on
 * the main thread, so any React render or layout stalls audio capture and drops
 * frames. The copilot's whole value is a sub-second budget from speech to
 * coaching, and dropped frames spend it.
 *
 * Emits ~100ms frames of 16kHz mono 16-bit PCM. That size balances transport
 * overhead against latency: smaller frames mean more socket chatter, larger
 * ones push the partial-transcript target past 400ms.
 *
 * NOTE: audio is forwarded and discarded. Nothing here buffers a recording.
 */

const TARGET_SAMPLE_RATE = 16000;
const FRAME_MS = 100;
const SAMPLES_PER_FRAME = (TARGET_SAMPLE_RATE * FRAME_MS) / 1000; // 1600

class PcmDownsampler extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = new Float32Array(0);
    // `sampleRate` is a global provided by the AudioWorkletGlobalScope and is
    // whatever the hardware chose — commonly 44100 or 48000.
    this._ratio = sampleRate / TARGET_SAMPLE_RATE;
  }

  /** Nearest-neighbour decimation. Adequate for speech; cheap enough to be free. */
  _downsample(input) {
    const outLength = Math.floor(input.length / this._ratio);
    const out = new Float32Array(outLength);
    for (let i = 0; i < outLength; i += 1) {
      out[i] = input[Math.floor(i * this._ratio)];
    }
    return out;
  }

  _toInt16(floats) {
    const pcm = new Int16Array(floats.length);
    for (let i = 0; i < floats.length; i += 1) {
      // Clamp before scaling; anything outside [-1, 1] would wrap and click.
      const s = Math.max(-1, Math.min(1, floats[i]));
      pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return pcm;
  }

  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (!channel) return true; // no input yet — keep the processor alive

    const downsampled = this._downsample(channel);

    const merged = new Float32Array(this._buffer.length + downsampled.length);
    merged.set(this._buffer, 0);
    merged.set(downsampled, this._buffer.length);
    this._buffer = merged;

    while (this._buffer.length >= SAMPLES_PER_FRAME) {
      const frame = this._buffer.slice(0, SAMPLES_PER_FRAME);
      this._buffer = this._buffer.slice(SAMPLES_PER_FRAME);

      const pcm = this._toInt16(frame);
      // Transfer the underlying buffer rather than copying it.
      this.port.postMessage(pcm.buffer, [pcm.buffer]);
    }

    return true;
  }
}

registerProcessor('pcm-downsampler', PcmDownsampler);
