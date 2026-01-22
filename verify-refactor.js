
const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');

async function testRefactor() {
    console.log("--- Verifying Refactored Architecture ---\n");

    // 1. Test OpenAI TTS Endpoint
    console.log("1. Testing OpenAI TTS (/api/hangout/speech)...");
    try {
        const start = Date.now();
        const res = await fetch('http://localhost:3000/api/hangout/speech', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: "Testing the new turn-based architecture." })
        });

        if (res.status === 200 && res.headers.get('content-type').includes('audio')) {
            const buffer = await res.buffer();
            console.log(`✅ TTS Success: Received ${buffer.length} bytes in ${Date.now() - start}ms`);
        } else {
            console.log(`❌ TTS Failed: Status ${res.status}`);
            console.log(await res.text());
        }
    } catch (e) {
        console.log("❌ TTS Connection Failed:", e.message);
    }

    // 2. Test OpenAI Whisper Endpoint
    // Note: We need a dummy audio file. We'll skip actual file upload test in this simple script 
    // unless we generate one, but checking if endpoint exists/rejects invalid is good step.
    console.log("\n2. Testing OpenAI Whisper (/api/hangout/transcribe) - Integrity Check...");
    try {
        const form = new FormData();
        // Intentionally sending no file to check error handling (confirms route is reachable)
        const res = await fetch('http://localhost:3000/api/hangout/transcribe', {
            method: 'POST',
            body: form
        });

        if (res.status === 400) { // Expect "No file provided"
            const data = await res.json();
            if (data.error === "No file provided") {
                console.log("✅ Transcribe Endpoint Reachable (Correctly rejected empty request)");
            } else {
                console.log("⚠️ Transcribe Endpoint returned unexpected 400:", data);
            }
        } else {
            console.log(`⚠️ Transcribe Endpoint returned status ${res.status} (Expected 400 for empty)`);
        }
    } catch (e) {
        console.log("❌ Transcribe Connection Failed:", e.message);
    }
}

testRefactor();
