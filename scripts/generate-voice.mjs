/**
 * Генерация голосовых клипов через ElevenLabs TTS.
 *
 *   node scripts/generate-voice.mjs                 # только отсутствующие файлы
 *   node scripts/generate-voice.mjs --force         # перегенерировать всё
 *   node scripts/generate-voice.mjs --lang el --only praise-5,praise-10 --force
 *
 * Ключ берётся из ELEVENLABS_API_KEY (.env в корне или переменная окружения).
 * .env в .gitignore; ключ нигде не логируется и в бандл не попадает
 * (Vite отдаёт клиенту только переменные с префиксом VITE_).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { VOICE_LINES, DEFAULT_VOICE_IDS } from './voice-lines.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outRoot = path.join(root, 'src/assets/sounds/voice');

function loadDotEnv(file) {
    if (!fs.existsSync(file)) return {};
    const out = {};
    for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
        const line = raw.replace(/\s+#.*$/, '').trim();
        if (!line || line.startsWith('#') || !line.includes('=')) continue;
        const i = line.indexOf('=');
        out[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    }
    return out;
}

const env = { ...loadDotEnv(path.join(root, '.env')), ...process.env };
const apiKey = env.ELEVENLABS_API_KEY;
if (!apiKey) {
    console.error('ELEVENLABS_API_KEY не задан (.env или окружение).');
    process.exit(1);
}
const modelId = env.TTS_MODEL || 'eleven_multilingual_v2';

const args = process.argv.slice(2);
const argVal = (name) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : null;
};
const force = args.includes('--force');
const langs = (argVal('--lang') ?? 'ru,en,el').split(',').filter(Boolean);
const only = argVal('--only')?.split(',').filter(Boolean) ?? null;

async function tts(text, lang) {
    const voiceId = env[`VOICE_ID_${lang.toUpperCase()}`] || DEFAULT_VOICE_IDS[lang];
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`;
    for (let attempt = 1; ; attempt++) {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'xi-api-key': apiKey, 'content-type': 'application/json', accept: 'audio/mpeg' },
            body: JSON.stringify({
                text,
                model_id: modelId,
                language_code: lang,
                voice_settings: { stability: 0.5, similarity_boost: 0.75 }
            })
        });
        if (res.ok) return Buffer.from(await res.arrayBuffer());
        const body = (await res.text()).slice(0, 300);
        if ((res.status === 429 || res.status >= 500) && attempt < 4) {
            await new Promise((r) => setTimeout(r, 1500 * attempt));
            continue;
        }
        throw new Error(`HTTP ${res.status}: ${body}`);
    }
}

const jobs = [];
for (const [id, texts] of Object.entries(VOICE_LINES)) {
    if (only && !only.includes(id)) continue;
    for (const lang of langs) {
        const text = texts[lang];
        if (!text) continue;
        const file = path.join(outRoot, lang, `${id}.mp3`);
        if (!force && fs.existsSync(file)) continue;
        jobs.push({ id, lang, text, file });
    }
}

console.log(`model=${modelId}, clips to generate: ${jobs.length}`);
let failed = 0;
const CONCURRENCY = 3;
let next = 0;
await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
        while (next < jobs.length) {
            const job = jobs[next++];
            try {
                const audio = await tts(job.text, job.lang);
                fs.mkdirSync(path.dirname(job.file), { recursive: true });
                fs.writeFileSync(job.file, audio);
                console.log(`ok   ${job.lang}/${job.id}.mp3  (${audio.length} B)`);
            } catch (e) {
                failed++;
                console.error(`FAIL ${job.lang}/${job.id}: ${e.message}`);
            }
        }
    })
);
if (failed) process.exit(1);
