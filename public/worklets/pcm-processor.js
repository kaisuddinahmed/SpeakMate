// public/worklets/pcm-processor.js
class PcmProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.bufferSize = 4096;
        this.buffer = new Float32Array(this.bufferSize);
        this.index = 0;
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (!input || !input.length) return true;

        const channelData = input[0]; // Mono

        for (let i = 0; i < channelData.length; i++) {
            this.buffer[this.index++] = channelData[i];

            if (this.index >= this.bufferSize) {
                this.flush();
            }
        }

        return true; // Keep processor alive
    }

    flush() {
        // Send buffer to main thread
        // We can optionally convert to Int16 here to save main thread CPU
        // But for now, let's just send the Float32 and let main handle Int16 conversion 
        // OR mostly typically we send Int16 for Deepgram.

        // Let's Convert to Int16 here (Performance Win)
        const int16 = new Int16Array(this.bufferSize);
        for (let i = 0; i < this.bufferSize; i++) {
            const s = Math.max(-1, Math.min(1, this.buffer[i]));
            int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        this.port.postMessage(int16);
        this.index = 0;
    }
}

registerProcessor('pcm-processor', PcmProcessor);
