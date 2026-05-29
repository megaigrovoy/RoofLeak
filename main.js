import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';

const MEDIAPIPE_TASKS_VISION_WASM_VER = '0.10.34';

const STORAGE_SFX_OFF = 'roof-leak-sfx-off';
const STORAGE_MUSIC_OFF = 'roof-leak-music-off';
const STORAGE_PLAYER_COUNT = 'roof-leak-player-count';
const STORAGE_VOLUME = 'roof-leak-volume';
const STORAGE_LANG = 'roof-leak-lang';

const I18N = {
    ru: {
        pageTitle: 'Протечка крыши',
        heroAlt: 'Roof Leak — The Drop Chase',
        playersLabel: 'Игроки',
        playersOne: '1',
        playersTwo: '2',
        langLabel: 'Язык',
        langRu: 'RU',
        langEn: 'EN',
        play: 'Играть',
        optionsAria: 'Опции',
        soundSection: 'Звук и музыка',
        volume: 'Громкость',
        gameSounds: 'Звуки в игре',
        gameSoundsAria: 'Отключить звуки в игре',
        music: 'Музыка',
        musicDesc: 'Меню и игра',
        musicAria: 'Отключить музыку',
        fullscreen: 'На весь экран',
        exitFullscreen: 'Свернуть',
        menu: 'Меню',
        score: 'Поймано: {n}',
        waterMeterAria: 'Уровень воды на полу',
        trackingNeedHands: 'Покажите обе руки в кадре',
        trackingActive: 'Руки отслеживаются · держите ведро',
        tracking2Active: '2 игрока · общий счёт и вода',
        tracking2NeedSecond: '2 игрока · позовите второго в кадр',
        tracking2NeedBoth: '2 игрока · встаньте в кадр оба',
        mugSolo: 'Кружка',
        mugPlayer: 'Игрок {n} · кружка',
        gameOver: 'GAME OVER · поймано {n}',
        loadingModels: 'Загрузка моделей…',
        startErrorTitle: 'Не удалось запустить игру.',
        startErrorHintDefault:
            'Откройте консоль браузера (F12 → Console) и при необходимости пришлите текст ошибки.',
        startErrorCameraBlocked:
            'Браузер заблокировал камеру для этого сайта. Нажмите на значок замка слева от адреса → разрешите камеру, обновите страницу.',
        startErrorNoCamera: 'Камера не найдена. Проверьте, что она подключена и не занята другим приложением.',
        startErrorTimeout:
            'Камера не успела запуститься. Закройте другие программы, использующие камеру, и обновите страницу.'
    },
    en: {
        pageTitle: 'Roof Leak',
        heroAlt: 'Roof Leak — The Drop Chase',
        playersLabel: 'Players',
        playersOne: '1',
        playersTwo: '2',
        langLabel: 'Language',
        langRu: 'RU',
        langEn: 'EN',
        play: 'Play',
        optionsAria: 'Options',
        soundSection: 'Sound & music',
        volume: 'Volume',
        gameSounds: 'Game sounds',
        gameSoundsAria: 'Disable game sounds',
        music: 'Music',
        musicDesc: 'Menu and game',
        musicAria: 'Disable music',
        fullscreen: 'Fullscreen',
        exitFullscreen: 'Exit fullscreen',
        menu: 'Menu',
        score: 'Caught: {n}',
        waterMeterAria: 'Water level on the floor',
        trackingNeedHands: 'Show both hands in frame',
        trackingActive: 'Hands tracked · hold the bucket',
        tracking2Active: '2 players · shared score and water',
        tracking2NeedSecond: '2 players · invite the second player',
        tracking2NeedBoth: '2 players · both stand in frame',
        mugSolo: 'Mug',
        mugPlayer: 'Player {n} · mug',
        gameOver: 'GAME OVER · caught {n}',
        loadingModels: 'Loading models…',
        startErrorTitle: 'Failed to start the game.',
        startErrorHintDefault: 'Open the browser console (F12 → Console) and share the error if needed.',
        startErrorCameraBlocked:
            'The browser blocked the camera for this site. Click the lock icon next to the address bar → allow camera, then refresh.',
        startErrorNoCamera: 'No camera found. Check that it is connected and not used by another app.',
        startErrorTimeout:
            'The camera did not start in time. Close other apps using the camera and refresh the page.'
    }
};

let uiLang = 'ru';

function loadLangFromStorage() {
    const raw = localStorage.getItem(STORAGE_LANG);
    return raw === 'en' ? 'en' : 'ru';
}

function t(key, vars = {}) {
    let s = I18N[uiLang]?.[key] ?? I18N.ru[key] ?? key;
    for (const [k, v] of Object.entries(vars)) {
        s = s.replace(`{${k}}`, String(v));
    }
    return s;
}

const BASE_MENU_MUSIC_VOL = 0.52;
const BASE_GAME_MUSIC_VOL = 0.46;
const BASE_SFX_CATCH_VOL = 0.72;
const BASE_SFX_SPLASH_VOL = 0.68;

const DEBUG_FRAME_PERF =
    typeof location !== 'undefined' && new URLSearchParams(location.search).get('perf') === '1';

let soundEffectsEnabled = true;
let musicEnabled = true;
let masterVolume = 1;

function loadPlayerCountPreference() {
    const raw = localStorage.getItem(STORAGE_PLAYER_COUNT);
    return raw === '1' ? 1 : 2;
}

/** 1 или 2 — совпадает с numPoses у PoseLandmarker */
let playerModeCount = loadPlayerCountPreference();

const PLAYER_COLORS = ['#00f3ff', '#ff00ea'];

const BUCKET_IMG_URL = new URL('./src/assets/img/bucket.png', import.meta.url).href;
const CUP_IMG_URL = new URL('./src/assets/img/cup.png', import.meta.url).href;
const MENU_HERO_IMG_URL = new URL('./src/assets/img/menu-hero.png', import.meta.url).href;
const BUCKET_PIVOT_X_FRAC = 0.5;
/** Точка на ободе ведра в PNG (чуть ниже ручки) */
const BUCKET_PIVOT_Y_FRAC = 0.16;
const CUP_PIVOT_X_FRAC = 0.42;
const CUP_PIVOT_Y_FRAC = 0.14;
const BUCKET_ANGLE_FUDGE = 0;

const bucketSprite = new Image();
const cupSprite = new Image();
let bucketSpriteReady = false;
let cupSpriteReady = false;

function loadSpriteImage(img, url, label) {
    return new Promise((resolve) => {
        img.onload = () => resolve(true);
        img.onerror = () => {
            console.warn(`[RoofLeak] не удалось загрузить ${label}`);
            resolve(false);
        };
        img.src = url;
    });
}

function preloadBucketSprite() {
    return loadSpriteImage(bucketSprite, BUCKET_IMG_URL, 'bucket.png').then((ok) => {
        bucketSpriteReady = ok;
    });
}

function preloadCupSprite() {
    return loadSpriteImage(cupSprite, CUP_IMG_URL, 'cup.png').then((ok) => {
        cupSpriteReady = ok;
    });
}

function preloadSprites() {
    return Promise.all([preloadBucketSprite(), preloadCupSprite()]);
}

function getVesselDisplayHeight(width, isMug) {
    const img = isMug ? cupSprite : bucketSprite;
    const ready = isMug ? cupSpriteReady : bucketSpriteReady;
    if (ready && img.naturalWidth > 0) {
        return width * (img.naturalHeight / img.naturalWidth);
    }
    return width * GAME_CFG.bucketHeightMul;
}

function loadMasterVolumeFromStorage() {
    const raw = localStorage.getItem(STORAGE_VOLUME);
    if (raw == null) return 1;
    const n = Number(raw);
    if (!Number.isFinite(n)) return 1;
    return Math.min(1, Math.max(0, n / 100));
}

function persistMasterVolume() {
    localStorage.setItem(STORAGE_VOLUME, String(Math.round(masterVolume * 100)));
}

function applyVolumeToPlayingAudio() {
    if (menuMusicAudio) menuMusicAudio.volume = BASE_MENU_MUSIC_VOL * masterVolume;
    if (gameMusicAudio) gameMusicAudio.volume = BASE_GAME_MUSIC_VOL * masterVolume;
}

function setMasterVolume(next) {
    masterVolume = Math.min(1, Math.max(0, next));
    persistMasterVolume();
    applyVolumeToPlayingAudio();
    updateVolumeUi();
}

function loadPersistedSettings() {
    soundEffectsEnabled = localStorage.getItem(STORAGE_SFX_OFF) !== '1';
    musicEnabled = localStorage.getItem(STORAGE_MUSIC_OFF) !== '1';
    masterVolume = loadMasterVolumeFromStorage();
    uiLang = loadLangFromStorage();
    const sfxCb = document.getElementById('opt-sound-off');
    const musicCb = document.getElementById('opt-music-off');
    if (sfxCb) sfxCb.checked = !soundEffectsEnabled;
    if (musicCb) musicCb.checked = !musicEnabled;
    syncLangRadios();
    updateVolumeUi();
    applyUiLanguage();
}

const SFX_CATCH_URL = new URL('./src/assets/sounds/drops/Water Drop In Bucket.mp3', import.meta.url).href;
const SFX_SPLASH_URL = new URL('./src/assets/sounds/drops/Water Drop.mp3', import.meta.url).href;

const MENU_MUSIC_URL = new URL('./src/assets/sounds/menu.mp3', import.meta.url).href;
const GAME_BG_GLOB = import.meta.glob('./src/assets/sounds/OST/*.mp3', {
    eager: true,
    query: '?url',
    import: 'default'
});
const GAME_BG_TRACKS = Object.values(GAME_BG_GLOB);

const sfxAudioBufferByUrl = new Map();
const sfxAudioBufferPromiseByUrl = new Map();

function getOrCreateSfxContext() {
    try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        if (!window.__roofLeakAudioCtx) window.__roofLeakAudioCtx = new AC();
        return window.__roofLeakAudioCtx;
    } catch (_) {
        return null;
    }
}

function ensureSfxAudioBuffer(ctx, url) {
    if (!url || !ctx) return Promise.reject(new Error('no ctx/url'));
    const hit = sfxAudioBufferByUrl.get(url);
    if (hit) return Promise.resolve(hit);
    const inflight = sfxAudioBufferPromiseByUrl.get(url);
    if (inflight) return inflight;
    const p = fetch(url)
        .then((r) => r.arrayBuffer())
        .then((ab) => ctx.decodeAudioData(ab))
        .then((buf) => {
            sfxAudioBufferByUrl.set(url, buf);
            sfxAudioBufferPromiseByUrl.delete(url);
            return buf;
        })
        .catch((e) => {
            sfxAudioBufferPromiseByUrl.delete(url);
            throw e;
        });
    sfxAudioBufferPromiseByUrl.set(url, p);
    return p;
}

function playDecodedSfx(ctx, buffer, volume) {
    if (ctx.state === 'suspended') void ctx.resume();
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    gain.gain.value = volume;
    src.buffer = buffer;
    src.connect(gain);
    gain.connect(ctx.destination);
    src.start(0);
}

function playOneShotSfx(url, volume) {
    if (!soundEffectsEnabled || !url) return;
    const vol = volume * masterVolume;
    const ctx = window.__roofLeakAudioCtx || getOrCreateSfxContext();
    const ready = ctx && sfxAudioBufferByUrl.get(url);
    if (ctx && ready) {
        try {
            playDecodedSfx(ctx, ready, vol);
        } catch (_) {
            fallbackHtmlOneShot(url, vol);
        }
        return;
    }
    if (ctx) {
        void ensureSfxAudioBuffer(ctx, url)
            .then((buf) => {
                if (!soundEffectsEnabled) return;
                try {
                    playDecodedSfx(ctx, buf, vol);
                } catch (_) {
                    fallbackHtmlOneShot(url, vol);
                }
            })
            .catch(() => fallbackHtmlOneShot(url, vol));
        return;
    }
    fallbackHtmlOneShot(url, vol);
}

function fallbackHtmlOneShot(url, volume) {
    const a = new Audio(url);
    a.volume = volume;
    void a.play().catch(() => {});
}

function preloadHtmlAudioUrl(url) {
    if (!url) return;
    const a = new Audio();
    a.preload = 'auto';
    a.src = url;
    void a.load();
}

function warmSfxAudioBuffersYielding() {
    const ctx = getOrCreateSfxContext();
    if (!ctx) return;
    const urls = [SFX_CATCH_URL, SFX_SPLASH_URL].filter(Boolean);
    void (async () => {
        for (const u of urls) {
            try {
                await ensureSfxAudioBuffer(ctx, u);
            } catch (_) {}
            await new Promise((r) => setTimeout(r, 16));
        }
    })();
}

function preloadGameAudio() {
    if (soundEffectsEnabled) {
        for (const u of [SFX_CATCH_URL, SFX_SPLASH_URL]) preloadHtmlAudioUrl(u);
        warmSfxAudioBuffersYielding();
    }
    if (musicEnabled) {
        preloadHtmlAudioUrl(MENU_MUSIC_URL);
        const tracks = GAME_BG_TRACKS.filter(Boolean);
        tracks.forEach((u, i) => setTimeout(() => preloadHtmlAudioUrl(u), i * 120));
    }
}

function getMediapipeWasmUrl() {
    let base = import.meta.env.BASE_URL || '/';
    if (!base.endsWith('/')) base += '/';
    return new URL('mediapipe-wasm', window.location.origin + base).href;
}

let htmlAudioUnlocked = false;
let audioUnlockBusy = false;

function resumeSharedAudioContext() {
    const ctx = getOrCreateSfxContext();
    if (ctx && ctx.state === 'suspended') void ctx.resume();
}

function tryUnlockAudioOnUserGesture() {
    if (htmlAudioUnlocked || audioUnlockBusy) return;
    audioUnlockBusy = true;
    resumeSharedAudioContext();
    const a = new Audio();
    a.preload = 'auto';
    a.src = MENU_MUSIC_URL;
    a.volume = 0.04;
    const busyTimer = setTimeout(() => {
        audioUnlockBusy = false;
    }, 3000);
    void a
        .play()
        .then(() => {
            htmlAudioUnlocked = true;
            try {
                a.pause();
                a.src = '';
            } catch (_) {}
        })
        .catch(() => {})
        .finally(() => {
            clearTimeout(busyTimer);
            audioUnlockBusy = false;
        });
}

let menuMusicAudio = null;
let gameMusicAudio = null;
let gameMusicOnEnded = null;
let gameMusicPlaylist = [];
let gameMusicPlaylistIndex = 0;

function shuffleArrayInPlace(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

function getMenuMusicAudio() {
    if (!menuMusicAudio) {
        menuMusicAudio = new Audio(MENU_MUSIC_URL);
        menuMusicAudio.loop = true;
    }
    menuMusicAudio.volume = BASE_MENU_MUSIC_VOL * masterVolume;
    return menuMusicAudio;
}

function playMenuMusic() {
    if (!musicEnabled || backgroundSuspended) return;
    void getMenuMusicAudio().play().catch(() => {});
}

function pauseMenuMusic() {
    if (menuMusicAudio) {
        menuMusicAudio.pause();
        menuMusicAudio.currentTime = 0;
    }
}

function pauseMenuMusicSoft() {
    if (menuMusicAudio) menuMusicAudio.pause();
}

function resumeMenuMusicSoft() {
    if (!musicEnabled || backgroundSuspended) return;
    void getMenuMusicAudio().play().catch(() => {});
}

function stopGameMusic() {
    if (gameMusicAudio && gameMusicOnEnded) {
        gameMusicAudio.removeEventListener('ended', gameMusicOnEnded);
    }
    if (gameMusicAudio) {
        gameMusicAudio.pause();
        gameMusicAudio = null;
    }
    gameMusicOnEnded = null;
}

function pauseGameMusicSoft() {
    if (gameMusicAudio) gameMusicAudio.pause();
}

function resumeGameMusicSoft() {
    if (!musicEnabled || backgroundSuspended) return;
    if (gameMusicAudio) {
        void gameMusicAudio.play().catch(() => startGameMusicPlaylist());
    } else {
        startGameMusicPlaylist();
    }
}

function playGameMusicTrackAt(index) {
    if (!musicEnabled) {
        stopGameMusic();
        return;
    }
    stopGameMusic();
    if (!gameMusicPlaylist.length) return;
    gameMusicPlaylistIndex = ((index % gameMusicPlaylist.length) + gameMusicPlaylist.length) % gameMusicPlaylist.length;
    const url = gameMusicPlaylist[gameMusicPlaylistIndex];
    const a = new Audio(url);
    a.volume = BASE_GAME_MUSIC_VOL * masterVolume;
    gameMusicOnEnded = () => {
        gameMusicPlaylistIndex = (gameMusicPlaylistIndex + 1) % gameMusicPlaylist.length;
        playGameMusicTrackAt(gameMusicPlaylistIndex);
    };
    a.addEventListener('ended', gameMusicOnEnded);
    gameMusicAudio = a;
    void a.play().catch(() => {});
}

function startGameMusicPlaylist() {
    if (backgroundSuspended) return;
    pauseMenuMusic();
    if (!musicEnabled || !GAME_BG_TRACKS.length) return;
    gameMusicPlaylist = [...GAME_BG_TRACKS];
    shuffleArrayInPlace(gameMusicPlaylist);
    gameMusicPlaylistIndex = 0;
    playGameMusicTrackAt(0);
}

function playCatchSound() {
    playOneShotSfx(SFX_CATCH_URL, BASE_SFX_CATCH_VOL);
}

function playSplashSound() {
    playOneShotSfx(SFX_SPLASH_URL, BASE_SFX_SPLASH_VOL);
}

const video = document.getElementById('webcam');
const canvasElement = document.getElementById('game-canvas');
const canvasCtx = canvasElement.getContext('2d');
const scoreDisplay = document.getElementById('score-display');
const waterMeterFill = document.getElementById('water-meter-fill');
const waterMeterLabel = document.getElementById('water-meter-label');
const gameOverOverlay = document.getElementById('game-over-overlay');
const loadingElement = document.getElementById('loading');
const mainMenu = document.getElementById('main-menu');
const hudGame = document.getElementById('hud-game');
const btnBackMenu = document.getElementById('btn-back-menu');
const btnStart = document.getElementById('btn-start');
const trackingDisplay = document.getElementById('tracking-display');
const loadingText = document.getElementById('loading-text');
const mugTimersPanel = document.getElementById('mug-timers');
const mugTimerRows = [0, 1].map((pi) => ({
    row: document.getElementById(`mug-timer-p${pi}`),
    fill: document.querySelector(`#mug-timer-p${pi} .mug-timer-fill`),
    name: document.querySelector(`#mug-timer-p${pi} .mug-timer-name`)
}));

let poseLandmarker;
let visionTasksResolver = null;
let mediapipePoseDelegate = 'CPU';
let lastVideoTime = -1;
let currentPoseResults = null;

let score = 0;
let waterLevel = 0;
let drops = [];
let particles = [];
let leakSpots = [];
let isPlaying = false;
let backgroundSuspended = false;
let resumeGameAfterBackground = false;
let resumeMenuMusicAfterBackground = false;
let resumeMenuDropsAfterBackground = false;
let lastFrameTime = performance.now();
let lastSpawnTime = 0;
let nextSpawnDelay = 900;
let lastRedSpawnTime = 0;
let nextRedSpawnDelay = 9000;
let gameTime = 0;
/** poseKey → timestamp ms, до которого вместо ведра — кружка */
const mugModeUntilByPoseKey = new Map();

const GAME_CFG = {
    /** Доля высоты экрана — проигрыш при достижении */
    waterGameOverFrac: 0.5,
    /** Насколько поднимается вода за пропущенную каплю (доля экрана) */
    waterRisePerMiss: 0.01,
    /** Минимальный интервал между стартом роста капли, мс */
    spawnIntervalMinMs: 1100,
    spawnIntervalMaxMs: 2600,
    /** Сколько мс капля «нарастает» на потолке перед падением */
    dropGrowDurationMs: 1800,
    dropSpeedMul: 0.0055,
    dropRadiusMul: 0.026,
    maxDrops: 48,
    /** Сколько капель одновременно может «нарастать» на потолке */
    maxGrowingDrops: 2,
    leakSpotYMul: 0.038,
    leakSpotXPadMul: 0.08,
    redDropSpawnMinMs: 7000,
    redDropSpawnMaxMs: 13000,
    mugModeDurationMs: 5000,
    /** Кружка = 2/3 размера ведра (удвоено от прежних 1/3) */
    mugSizeMul: 2 / 3,
    maxGrowingRedDrops: 1,
    wristMinVisibility: 0.45,
    /** Ширина ведра как доля расстояния между плечами */
    bucketShoulderMul: 1.1,
    bucketHeightMul: 0.82,
    shoulderMinPx: 40
};

const WRIST_SMOOTH_ALPHA = 0.24;
const WRIST_TELEPORT_PX = 38;
const SHOULDER_SMOOTH_ALPHA = 0.12;
const BUCKET_DISPLAY_SMOOTH_ALPHA = 0.2;

function isMobileLikeDevice() {
    if (typeof window === 'undefined') return false;
    const minSide = Math.min(window.innerWidth, window.innerHeight);
    return (
        window.matchMedia('(pointer: coarse)').matches ||
        window.matchMedia('(hover: none)').matches ||
        minSide <= 820
    );
}

function buildTrackTuning() {
    const mobile = isMobileLikeDevice();
    return {
        mobile,
        wristSmoothAlpha: WRIST_SMOOTH_ALPHA,
        bucketDisplaySmoothAlpha: BUCKET_DISPLAY_SMOOTH_ALPHA,
        shoulderSmoothAlpha: SHOULDER_SMOOTH_ALPHA,
        wristTeleportPx: WRIST_TELEPORT_PX,
        wristTeleportMul: 0.045,
        wristMinVisibility: mobile ? 0.3 : GAME_CFG.wristMinVisibility,
        maxCanvasLongEdge: mobile ? 960 : 1280,
        minPoseDetectionConfidence: 0.5,
        minTrackingConfidence: mobile ? 0.3 : 0.5,
        minPosePresenceConfidence: mobile ? 0.3 : 0.5,
        resizeDebounceMs: mobile ? 220 : 110,
        bucketGraceMs: mobile ? 600 : 0
    };
}

let trackTuning = buildTrackTuning();
const bucketGraceByPoseKey = new Map();

function refreshTrackTuning() {
    trackTuning = buildTrackTuning();
}

window.addEventListener('resize', refreshTrackTuning);
refreshTrackTuning();
/** poseKey → { left, right } */
const wristSmoothByPoseKey = new Map();
/** poseKey → smoothed shoulder width px */
const shoulderWidthByPoseKey = new Map();
/** poseKey → сглаженная позиция ведра на экране */
const bucketDisplayByPoseKey = new Map();
/** poseKey → bucket */
const bucketByPoseKey = new Map();
let stablePoseShoulderMid = [];

function resetWristSmoothing() {
    wristSmoothByPoseKey.clear();
    bucketByPoseKey.clear();
    shoulderWidthByPoseKey.clear();
    bucketDisplayByPoseKey.clear();
    mugModeUntilByPoseKey.clear();
    bucketGraceByPoseKey.clear();
    stablePoseShoulderMid = [];
}

function isMugMode(poseKey, nowMs) {
    const until = mugModeUntilByPoseKey.get(poseKey);
    if (until == null) return false;
    if (nowMs >= until) {
        mugModeUntilByPoseKey.delete(poseKey);
        return false;
    }
    return true;
}

function applyMugMode(poseKey, nowMs) {
    mugModeUntilByPoseKey.set(poseKey, nowMs + GAME_CFG.mugModeDurationMs);
}

function smoothShoulderWidth(poseKey, rawW) {
    const prev = shoulderWidthByPoseKey.get(poseKey);
    if (prev == null) {
        shoulderWidthByPoseKey.set(poseKey, rawW);
        return rawW;
    }
    const a = trackTuning.shoulderSmoothAlpha;
    const next = prev * (1 - a) + rawW * a;
    shoulderWidthByPoseKey.set(poseKey, next);
    return next;
}

function smoothWristPoint(prev, raw) {
    const teleportPx = Math.max(trackTuning.wristTeleportPx, gameLayout.minSide * trackTuning.wristTeleportMul);
    if (!prev || Math.hypot(raw.x - prev.x, raw.y - prev.y) > teleportPx) {
        return { x: raw.x, y: raw.y, visibility: raw.visibility };
    }
    const a = trackTuning.wristSmoothAlpha;
    return {
        x: prev.x * (1 - a) + raw.x * a,
        y: prev.y * (1 - a) + raw.y * a,
        visibility: raw.visibility
    };
}

function lerpAngle(from, to, a) {
    let d = to - from;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return from + d * a;
}

function angularDistance(a, b) {
    let d = Math.abs(a - b) % (Math.PI * 2);
    if (d > Math.PI) d = Math.PI * 2 - d;
    return d;
}

function smoothBucketDisplay(poseKey, raw) {
    const a = trackTuning.bucketDisplaySmoothAlpha;
    let st = bucketDisplayByPoseKey.get(poseKey);
    if (!st) {
        st = { cx: raw.cx, topY: raw.topY, angle: raw.angle };
        bucketDisplayByPoseKey.set(poseKey, st);
        return raw;
    }

    st.cx = st.cx * (1 - a) + raw.cx * a;
    st.topY = st.topY * (1 - a) + raw.topY * a;

    // MediaPipe временами меняет местами левую/правую стороны тела (особенно на Android):
    // запястья обмениваются значениями, и угол прыгает на 180°. Вектор между запястьями
    // не направленный, поэтому raw.angle и raw.angle+π — это одна и та же линия.
    // Выбираем тот вариант, что ближе к уже установленной ориентации, — ведро не переворачивается.
    let targetAngle = raw.angle;
    const flipped = raw.angle + Math.PI;
    if (angularDistance(flipped, st.angle) < angularDistance(targetAngle, st.angle)) {
        targetAngle = flipped;
    }
    st.angle = lerpAngle(st.angle, targetAngle, a);

    const catchBottomY = st.topY + raw.height * 0.38;
    return {
        ...raw,
        cx: st.cx,
        topY: st.topY,
        angle: st.angle,
        bottomY: st.topY + raw.height,
        catchBottomY
    };
}

function initLeakSpots() {
    leakSpots = [];
}

function randomLeakSpotPosition() {
    const { w, minSide } = gameLayout;
    const pad = minSide * GAME_CFG.leakSpotXPadMul;
    const yJitter = (Math.random() - 0.5) * minSide * 0.024;
    return {
        x: pad + Math.random() * (w - pad * 2),
        y: minSide * GAME_CFG.leakSpotYMul + yJitter
    };
}

function getMugTimeLeft(poseKey, nowMs) {
    const until = mugModeUntilByPoseKey.get(poseKey);
    if (!until || nowMs >= until) return null;
    return until - nowMs;
}

let lastTrackingPersons = [];
let lastTrackingBuckets = [];

function applyUiLanguage() {
    document.documentElement.lang = uiLang;
    document.title = t('pageTitle');

    const setText = (id, key) => {
        const el = document.getElementById(id);
        if (el) el.textContent = t(key);
    };

    setText('menu-player-label', 'playersLabel');
    setText('opt-players-1-label', 'playersOne');
    setText('opt-players-2-label', 'playersTwo');
    setText('menu-lang-label', 'langLabel');
    setText('opt-lang-ru-label', 'langRu');
    setText('opt-lang-en-label', 'langEn');
    setText('menu-options-title', 'soundSection');
    setText('menu-volume-title', 'volume');
    setText('menu-sounds-title', 'gameSounds');
    setText('menu-music-title', 'music');
    setText('menu-music-desc', 'musicDesc');
    if (btnStart) btnStart.textContent = t('play');
    if (btnBackMenu) btnBackMenu.textContent = t('menu');
    if (loadingText) loadingText.textContent = t('loadingModels');

    const menuHeroImage = document.getElementById('menu-hero-image');
    if (menuHeroImage) {
        menuHeroImage.src = MENU_HERO_IMG_URL;
        menuHeroImage.alt = t('heroAlt');
    }

    const menuOptions = document.querySelector('.menu-options');
    if (menuOptions) menuOptions.setAttribute('aria-label', t('optionsAria'));
    if (optSoundOff) optSoundOff.setAttribute('aria-label', t('gameSoundsAria'));
    if (optMusicOff) optMusicOff.setAttribute('aria-label', t('musicAria'));
    if (btnFullscreen) btnFullscreen.setAttribute('aria-label', t('fullscreen'));
    const waterMeter = document.getElementById('water-meter');
    if (waterMeter) waterMeter.setAttribute('aria-label', t('waterMeterAria'));

    syncFullscreenButton();
    updateHud();
    updateTrackingDisplay(lastTrackingPersons, lastTrackingBuckets);
    updateMugTimerHud(lastTrackingBuckets, performance.now());
    if (gameOverOverlay && !gameOverOverlay.classList.contains('is-hidden')) {
        gameOverOverlay.textContent = t('gameOver', { n: score });
    }
}

function syncLangRadios() {
    const ru = document.getElementById('opt-lang-ru');
    const en = document.getElementById('opt-lang-en');
    if (ru) ru.checked = uiLang === 'ru';
    if (en) en.checked = uiLang === 'en';
}

function applyLangFromUi() {
    const next = document.getElementById('opt-lang-en')?.checked ? 'en' : 'ru';
    if (next === uiLang) return;
    uiLang = next;
    localStorage.setItem(STORAGE_LANG, uiLang);
    applyUiLanguage();
}

function updateMugTimerHud(activeBuckets, nowMs) {
    if (!mugTimersPanel) return;
    let any = false;

    for (let pi = 0; pi < mugTimerRows.length; pi++) {
        const ui = mugTimerRows[pi];
        const bucket = activeBuckets.find((b) => playerIndexFromPoseKey(b.poseKey) === pi);
        const left = bucket?.isMug ? getMugTimeLeft(bucket.poseKey, nowMs) : null;

        if (left != null && ui.row) {
            any = true;
            ui.row.classList.remove('is-hidden');
            const frac = left / GAME_CFG.mugModeDurationMs;
            if (ui.fill) ui.fill.style.width = `${Math.max(0, frac * 100)}%`;
            if (ui.name) {
                ui.name.textContent =
                    playerModeCount === 1 ? t('mugSolo') : t('mugPlayer', { n: pi + 1 });
            }
        } else if (ui.row) {
            ui.row.classList.add('is-hidden');
        }
    }

    mugTimersPanel.classList.toggle('is-hidden', !any);
}

function isPageHidden() {
    return document.visibilityState === 'hidden' || document.hidden;
}

function pauseCameraTracks() {
    const stream = video.srcObject;
    if (stream?.getTracks) {
        for (const track of stream.getTracks()) track.enabled = false;
    }
}

function resumeCameraTracks() {
    const stream = video.srcObject;
    if (stream?.getTracks) {
        for (const track of stream.getTracks()) track.enabled = true;
    }
}

function suspendSharedAudio() {
    const ctx = window.__roofLeakAudioCtx;
    if (ctx?.state === 'running') void ctx.suspend();
}

function isMainMenuVisible() {
    return Boolean(mainMenu && !mainMenu.classList.contains('is-hidden'));
}

function suspendAppForBackground() {
    if (backgroundSuspended) return;
    backgroundSuspended = true;

    resumeGameAfterBackground = isPlaying;
    resumeMenuMusicAfterBackground =
        !isPlaying && isMainMenuVisible() && musicEnabled && Boolean(menuMusicAudio);
    resumeMenuDropsAfterBackground = menuDropsAnimating;

    if (isPlaying) {
        isPlaying = false;
        pauseGameMusicSoft();
    } else {
        pauseMenuMusicSoft();
        if (menuDropsAnimating) stopMenuDrops();
    }

    void video.pause();
    pauseCameraTracks();
    suspendSharedAudio();
}

function resumeAppFromBackground() {
    if (!backgroundSuspended || isPageHidden()) return;
    backgroundSuspended = false;

    resumeCameraTracks();

    if (resumeGameAfterBackground) {
        resumeGameAfterBackground = false;
        resumeMenuMusicAfterBackground = false;
        resumeMenuDropsAfterBackground = false;
        lastFrameTime = performance.now();
        isPlaying = true;
        resumeSharedAudioContext();
        void video.play().catch(() => {});
        resumeGameMusicSoft();
        requestAnimationFrame(gameLoop);
        return;
    }

    resumeSharedAudioContext();
    if (resumeMenuMusicAfterBackground) resumeMenuMusicSoft();
    if (resumeMenuDropsAfterBackground) startMenuDrops();
    resumeMenuMusicAfterBackground = false;
    resumeMenuDropsAfterBackground = false;
}

function handlePageVisibilityChange() {
    if (isPageHidden()) suspendAppForBackground();
    else resumeAppFromBackground();
}

function updateHud() {
    if (scoreDisplay) scoreDisplay.innerText = t('score', { n: score });
    const pct = Math.min(100, Math.round(waterLevel * 100));
    if (waterMeterFill) waterMeterFill.style.height = `${pct}%`;
    if (waterMeterLabel) waterMeterLabel.textContent = `${pct}%`;
    if (waterMeterFill?.parentElement) {
        waterMeterFill.parentElement.classList.toggle('water-meter-danger', waterLevel >= GAME_CFG.waterGameOverFrac * 0.75);
    }
}

function triggerGameOver() {
    if (!isPlaying) return;
    stopGameMusic();
    isPlaying = false;
    if (gameOverOverlay) {
        gameOverOverlay.textContent = t('gameOver', { n: score });
        gameOverOverlay.classList.remove('is-hidden');
    }
}

function showMainMenu() {
    isPlaying = false;
    stopGameMusic();
    gameOverOverlay?.classList.add('is-hidden');
    mainMenu.classList.remove('is-hidden');
    hudGame.classList.add('is-hidden');
    drops.length = 0;
    particles.length = 0;
    leakSpots.length = 0;
    resetWristSmoothing();
    updateMugTimerHud([], performance.now());
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasElement.style.visibility = 'hidden';
    void video.pause();
    playMenuMusic();
    startMenuDrops();
}

function startGame() {
    tryUnlockAudioOnUserGesture();
    refreshTrackTuning();
    if (trackTuning.mobile) {
        console.info('[RoofLeak] mobile tracking tuning active', trackTuning);
    }
    gameOverOverlay?.classList.add('is-hidden');
    score = 0;
    waterLevel = 0;
    drops.length = 0;
    particles.length = 0;
    gameTime = 0;
    lastSpawnTime = performance.now();
    nextSpawnDelay = randSpawnDelay();
    lastRedSpawnTime = performance.now();
    nextRedSpawnDelay = randRedSpawnDelay();
    lastFrameTime = performance.now();
    resetWristSmoothing();
    initLeakSpots();
    updateHud();
    stopMenuDrops();
    mainMenu.classList.add('is-hidden');
    hudGame.classList.remove('is-hidden');
    canvasElement.style.visibility = '';
    isPlaying = true;
    void video.play().catch(() => {});
    queueMicrotask(() => {
        startGameMusicPlaylist();
        requestAnimationFrame(gameLoop);
    });
}

btnStart?.addEventListener('click', () => startGame());
btnBackMenu?.addEventListener('click', () => showMainMenu());

const gameContainer = document.getElementById('game-container');
const btnFullscreen = document.getElementById('btn-fullscreen');
const btnFullscreenLabel = btnFullscreen?.querySelector('.btn-fullscreen-label');

function getCurrentFullscreenElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
}

async function enterFullscreen() {
    const targets = [gameContainer, document.documentElement, document.body].filter(Boolean);
    for (const el of targets) {
        try {
            if (el.requestFullscreen) {
                await el.requestFullscreen({ navigationUI: 'hide' });
                return;
            }
            if (el.webkitRequestFullscreen) {
                el.webkitRequestFullscreen();
                return;
            }
        } catch (e) {
            console.warn('[RoofLeak] fullscreen failed on', el?.id || el?.tagName, e);
        }
    }
}

async function exitFullscreen() {
    try {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    } catch (_) {}
}

function syncFullscreenButton() {
    if (!btnFullscreen) return;
    const isFs = !!getCurrentFullscreenElement();
    btnFullscreen.classList.toggle('is-active', isFs);
    if (btnFullscreenLabel) btnFullscreenLabel.textContent = isFs ? t('exitFullscreen') : t('fullscreen');
}

if (btnFullscreen) {
    btnFullscreen.hidden = false;
    btnFullscreen.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (getCurrentFullscreenElement()) void exitFullscreen();
        else void enterFullscreen();
    });
    document.addEventListener('fullscreenchange', syncFullscreenButton);
    document.addEventListener('webkitfullscreenchange', syncFullscreenButton);
    syncFullscreenButton();
}

mainMenu.addEventListener(
    'pointerdown',
    (e) => {
        if (isPlaying) return;
        tryUnlockAudioOnUserGesture();
        if (e.target?.closest?.('#btn-start')) return;
        if (e.target?.closest?.('#btn-fullscreen')) return;
        if (e.target?.closest?.('#ui-lang-picker')) return;
        if (e.target?.closest?.('#ui-players-picker')) return;
        if (e.target?.closest?.('.menu-options')) return;
        playMenuMusic();
    },
    { capture: true }
);

const optSoundOff = document.getElementById('opt-sound-off');
const optMusicOff = document.getElementById('opt-music-off');
const optVolume = document.getElementById('opt-volume');
const optVolumeValue = document.getElementById('opt-volume-value');

function updateVolumeUi() {
    const pct = Math.round(masterVolume * 100);
    if (optVolume) {
        optVolume.value = String(pct);
        optVolume.setAttribute('aria-valuenow', String(pct));
    }
    if (optVolumeValue) optVolumeValue.textContent = `${pct}%`;
}

if (optVolume) {
    optVolume.addEventListener('input', () => {
        setMasterVolume(Number(optVolume.value) / 100);
    });
}
if (optSoundOff) {
    optSoundOff.addEventListener('change', () => {
        soundEffectsEnabled = !optSoundOff.checked;
        if (soundEffectsEnabled) localStorage.removeItem(STORAGE_SFX_OFF);
        else localStorage.setItem(STORAGE_SFX_OFF, '1');
    });
}
if (optMusicOff) {
    optMusicOff.addEventListener('change', () => {
        musicEnabled = !optMusicOff.checked;
        if (musicEnabled) {
            localStorage.removeItem(STORAGE_MUSIC_OFF);
            if (!isPlaying) playMenuMusic();
        } else {
            localStorage.setItem(STORAGE_MUSIC_OFF, '1');
            pauseMenuMusic();
            stopGameMusic();
        }
    });
}

loadPersistedSettings();

const optPlayers1 = document.getElementById('opt-players-1');
const optPlayers2 = document.getElementById('opt-players-2');

function syncPlayerCountRadios() {
    if (!optPlayers1 || !optPlayers2) return;
    optPlayers1.checked = playerModeCount === 1;
    optPlayers2.checked = playerModeCount === 2;
}

async function recreatePoseLandmarker() {
    if (!visionTasksResolver) return;
    if (poseLandmarker) {
        try {
            poseLandmarker.close();
        } catch (_) {}
        poseLandmarker = null;
    }
    lastVideoTime = -1;
    currentPoseResults = null;
    resetWristSmoothing();
    await createPoseLandmarkerInstance();
}

function applyPlayerModeFromUi(userInitiated) {
    const next = optPlayers1?.checked ? 1 : 2;
    if (next === playerModeCount && userInitiated) return;
    playerModeCount = next;
    localStorage.setItem(STORAGE_PLAYER_COUNT, String(playerModeCount));
    syncPlayerCountRadios();
    if (userInitiated) void recreatePoseLandmarker();
}

optPlayers1?.addEventListener('change', () => {
    if (optPlayers1.checked) applyPlayerModeFromUi(true);
});
optPlayers2?.addEventListener('change', () => {
    if (optPlayers2.checked) applyPlayerModeFromUi(true);
});

const optLangRu = document.getElementById('opt-lang-ru');
const optLangEn = document.getElementById('opt-lang-en');
optLangRu?.addEventListener('change', () => {
    if (optLangRu.checked) applyLangFromUi();
});
optLangEn?.addEventListener('change', () => {
    if (optLangEn.checked) applyLangFromUi();
});

syncPlayerCountRadios();

async function createPoseLandmarkerInstance() {
    const vision = visionTasksResolver;
    if (!vision) return;
    const np = playerModeCount === 1 ? 1 : 2;
    const poseOpts = (delegate) => ({
        baseOptions: {
            modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task',
            delegate
        },
        runningMode: 'VIDEO',
        numPoses: np,
        minPoseDetectionConfidence: trackTuning.minPoseDetectionConfidence,
        minTrackingConfidence: trackTuning.minTrackingConfidence,
        minPosePresenceConfidence: trackTuning.minPosePresenceConfidence
    });

    try {
        poseLandmarker = await PoseLandmarker.createFromOptions(vision, poseOpts('GPU'));
        mediapipePoseDelegate = 'GPU';
    } catch (e) {
        console.warn('PoseLandmarker GPU failed, CPU:', e);
        poseLandmarker = await PoseLandmarker.createFromOptions(vision, poseOpts('CPU'));
        mediapipePoseDelegate = 'CPU';
    }
    console.info(`[RoofLeak] pose delegate: ${mediapipePoseDelegate}, numPoses=${np}, mobile=${trackTuning.mobile}`);
}

let gameLayout = { w: 800, h: 600, minSide: 600 };

let loggedCanvasBufferCap = false;

let poseDetectTsMs = 0;

function readViewportSize() {
    const vv = window.visualViewport;
    const w = Math.max(1, Math.floor(vv?.width ?? window.innerWidth));
    const h = Math.max(1, Math.floor(vv?.height ?? window.innerHeight));
    return { w, h };
}

let lastResizeW = 0;
let lastResizeH = 0;

function resizeCanvas() {
    const { w: vw, h: vh } = readViewportSize();
    if (vw === lastResizeW && vh === lastResizeH) return;
    lastResizeW = vw;
    lastResizeH = vh;

    let iw = vw;
    let ih = vh;
    const longEdge = Math.max(iw, ih);
    const maxLong = trackTuning.maxCanvasLongEdge;
    if (longEdge > maxLong) {
        const s = maxLong / longEdge;
        iw = Math.max(1, Math.floor(vw * s));
        ih = Math.max(1, Math.floor(vh * s));
    }

    if ((iw < vw || ih < vh) && !loggedCanvasBufferCap) {
        loggedCanvasBufferCap = true;
        console.info(`[RoofLeak] canvas buffer capped ${iw}×${ih} px (window ${vw}×${vh})`);
    }

    gameLayout.w = iw;
    gameLayout.h = ih;
    gameLayout.minSide = Math.min(iw, ih);

    canvasElement.width = iw;
    canvasElement.height = ih;
    canvasElement.style.width = `${vw}px`;
    canvasElement.style.height = `${vh}px`;

    const gc = document.getElementById('game-container');
    if (gc) {
        gc.style.width = `${vw}px`;
        gc.style.height = `${vh}px`;
    }
    document.documentElement.style.height = `${vh}px`;
    document.body.style.height = `${vh}px`;
    document.documentElement.style.width = `${vw}px`;
    document.body.style.width = `${vw}px`;
}

let resizeCanvasDebounce = 0;
function scheduleResizeCanvas() {
    if (isPlaying) {
        clearTimeout(resizeCanvasDebounce);
        resizeCanvasDebounce = 0;
        resizeCanvas();
        return;
    }
    clearTimeout(resizeCanvasDebounce);
    resizeCanvasDebounce = setTimeout(() => {
        resizeCanvasDebounce = 0;
        resizeCanvas();
        if (menuDropsAnimating) resizeMenuDropsCanvas();
    }, trackTuning.resizeDebounceMs);
    if (menuDropsAnimating) resizeMenuDropsCanvas();
}

window.addEventListener('resize', scheduleResizeCanvas);
window.visualViewport?.addEventListener('resize', scheduleResizeCanvas);
document.addEventListener('visibilitychange', handlePageVisibilityChange);
window.addEventListener('pagehide', () => {
    if (isPageHidden()) suspendAppForBackground();
});
window.addEventListener('pageshow', () => {
    if (!isPageHidden()) resumeAppFromBackground();
});
document.addEventListener('freeze', suspendAppForBackground);
document.addEventListener('resume', resumeAppFromBackground);
resizeCanvas();

function stopVideoTracks() {
    const s = video.srcObject;
    if (s && typeof s.getTracks === 'function') {
        s.getTracks().forEach((t) => t.stop());
    }
    video.srcObject = null;
}

function waitForVideoReady(el, timeoutMs = 20000) {
    return new Promise((resolve, reject) => {
        if (el.readyState >= 2 && el.videoWidth > 0) {
            resolve();
            return;
        }
        let done = false;
        const finish = (ok) => {
            if (done) return;
            done = true;
            clearTimeout(timer);
            el.removeEventListener('loadedmetadata', onMeta);
            el.removeEventListener('loadeddata', onData);
            el.removeEventListener('canplay', onPlay);
            if (ok) resolve();
            else reject(new Error('Video metadata timeout'));
        };
        const onMeta = () => {
            if (el.videoWidth > 0) finish(true);
        };
        const onData = () => finish(true);
        const onPlay = () => finish(true);
        const timer = setTimeout(() => finish(false), timeoutMs);
        el.addEventListener('loadedmetadata', onMeta);
        el.addEventListener('loadeddata', onData);
        el.addEventListener('canplay', onPlay);
    });
}

async function setupWebcam() {
    const nav = window.navigator;
    if (!nav.mediaDevices?.getUserMedia) {
        throw new Error('Webcam not supported.');
    }

    video.muted = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('autoplay', '');

    const mobile = trackTuning.mobile;
    const constraintSets = mobile
        ? [
              {
                  video: {
                      facingMode: 'user',
                      width: { ideal: 640, max: 960 },
                      height: { ideal: 480, max: 720 },
                      frameRate: { ideal: 30, max: 30 }
                  }
              },
              { video: { facingMode: 'user', frameRate: { ideal: 30, max: 30 } } },
              { video: { facingMode: 'user' } },
              { video: true }
          ]
        : [
              { video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } },
              { video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' } },
              { video: { facingMode: 'user' } },
              { video: true }
          ];

    let lastErr;
    for (const constraints of constraintSets) {
        try {
            stopVideoTracks();
            const stream = await nav.mediaDevices.getUserMedia(constraints);
            video.srcObject = stream;
            await waitForVideoReady(video, 25000);
            await video.play();
            return;
        } catch (e) {
            lastErr = e;
            console.warn('Webcam attempt failed:', constraints, e);
            stopVideoTracks();
        }
    }
    throw lastErr ?? new Error('Could not open webcam');
}

async function initializeModels() {
    let vision;
    const wasmLocal = getMediapipeWasmUrl();
    let visionWasmSource = 'same-origin';
    try {
        vision = await FilesetResolver.forVisionTasks(wasmLocal);
    } catch (e) {
        console.warn('MediaPipe wasm failed locally, CDN fallback:', e);
        visionWasmSource = 'jsdelivr-fallback';
        vision = await FilesetResolver.forVisionTasks(
            `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_TASKS_VISION_WASM_VER}/wasm`
        );
    }
    console.info(`[RoofLeak] MediaPipe WASM: ${visionWasmSource}`);

    visionTasksResolver = vision;
    refreshTrackTuning();
    await createPoseLandmarkerInstance();

    preloadGameAudio();
    loadingElement.classList.remove('visible');
    showMainMenu();
}

function randSpawnDelay() {
    const { spawnIntervalMinMs, spawnIntervalMaxMs } = GAME_CFG;
    return spawnIntervalMinMs + Math.random() * (spawnIntervalMaxMs - spawnIntervalMinMs);
}

function randRedSpawnDelay() {
    const { redDropSpawnMinMs, redDropSpawnMaxMs } = GAME_CFG;
    return redDropSpawnMinMs + Math.random() * (redDropSpawnMaxMs - redDropSpawnMinMs);
}

function tryStartDropGrowth(kind = 'normal') {
    if (drops.length >= GAME_CFG.maxDrops) return;
    if (kind === 'red') {
        const growingRed = leakSpots.filter((s) => s.growing && s.kind === 'red').length;
        if (growingRed >= GAME_CFG.maxGrowingRedDrops) return;
    } else {
        const growingNormal = leakSpots.filter((s) => s.growing && s.kind !== 'red').length;
        if (growingNormal >= GAME_CFG.maxGrowingDrops) return;
    }

    const pos = randomLeakSpotPosition();
    leakSpots.push({
        x: pos.x,
        y: pos.y,
        grow: 0,
        growing: true,
        kind
    });
}

function updateGrowingSpots(dt) {
    for (let i = leakSpots.length - 1; i >= 0; i--) {
        const spot = leakSpots[i];
        if (!spot.growing) {
            leakSpots.splice(i, 1);
            continue;
        }
        spot.grow += dt / (GAME_CFG.dropGrowDurationMs / (1000 / 60));
        if (spot.grow >= 1) {
            releaseFallDrop(spot);
            leakSpots.splice(i, 1);
        }
    }
}

function releaseFallDrop(spot) {
    const { minSide } = gameLayout;
    const r = minSide * GAME_CFG.dropRadiusMul;
    const hang = r * 1.75;
    drops.push({
        x: spot.x,
        y: spot.y + hang,
        vy: minSide * GAME_CFG.dropSpeedMul * (0.88 + Math.random() * 0.24),
        r,
        kind: spot.kind === 'red' ? 'red' : 'normal',
        dead: false
    });
}

function traceTeardropPath(ctx, x, y, r) {
    const tipY = y - r * 1.38;
    const botY = y + r * 0.52;
    const w = r * 0.76;
    ctx.moveTo(x, tipY);
    ctx.bezierCurveTo(x + w * 1.05, tipY + r * 0.82, x + w * 0.98, botY - r * 0.08, x, botY);
    ctx.bezierCurveTo(x - w * 0.98, botY - r * 0.08, x - w * 1.05, tipY + r * 0.82, x, tipY);
    ctx.closePath();
}

function drawDropBulb(ctx, x, y, r, alpha = 1, variant = 'normal') {
    if (r <= 0.5) return;

    ctx.save();
    ctx.globalAlpha = alpha;

    traceTeardropPath(ctx, x, y, r);
    const tipY = y - r * 1.38;
    const botY = y + r * 0.52;
    const bodyGrad = ctx.createLinearGradient(x, tipY, x, botY);
    if (variant === 'rust') {
        bodyGrad.addColorStop(0, 'rgba(225, 195, 145, 0.24)');
        bodyGrad.addColorStop(0.32, 'rgba(175, 115, 65, 0.58)');
        bodyGrad.addColorStop(0.72, 'rgba(125, 68, 38, 0.76)');
        bodyGrad.addColorStop(1, 'rgba(78, 42, 22, 0.86)');
    } else {
        bodyGrad.addColorStop(0, 'rgba(210, 240, 255, 0.18)');
        bodyGrad.addColorStop(0.32, 'rgba(110, 195, 255, 0.42)');
        bodyGrad.addColorStop(0.72, 'rgba(55, 145, 235, 0.58)');
        bodyGrad.addColorStop(1, 'rgba(25, 85, 175, 0.72)');
    }
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    ctx.strokeStyle = variant === 'rust' ? 'rgba(185, 125, 75, 0.5)' : 'rgba(190, 235, 255, 0.42)';
    ctx.lineWidth = Math.max(0.8, r * 0.07);
    ctx.stroke();

    ctx.fillStyle = variant === 'rust' ? 'rgba(240, 210, 165, 0.52)' : 'rgba(255, 255, 255, 0.62)';
    ctx.beginPath();
    ctx.ellipse(x - r * 0.24, y - r * 0.12, r * 0.17, r * 0.3, -0.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = variant === 'rust' ? 'rgba(210, 160, 110, 0.28)' : 'rgba(255, 255, 255, 0.22)';
    ctx.beginPath();
    ctx.ellipse(x + r * 0.14, y + r * 0.08, r * 0.07, r * 0.11, 0.25, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

const menuDropsCanvas = document.getElementById('menu-drops-canvas');
let menuDropsCtx = null;
let menuDropsAnimating = false;
let menuDropsRaf = 0;
let menuDropsLastTs = 0;
let menuDropsLastW = 0;
let menuDropsLastH = 0;
const menuFallingDrops = [];

function resizeMenuDropsCanvas() {
    if (!menuDropsCanvas || !mainMenu) return;
    const w = mainMenu.clientWidth;
    const h = mainMenu.clientHeight;
    if (w <= 0 || h <= 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    menuDropsCanvas.width = Math.floor(w * dpr);
    menuDropsCanvas.height = Math.floor(h * dpr);
    menuDropsCanvas.style.width = `${w}px`;
    menuDropsCanvas.style.height = `${h}px`;
    menuDropsCtx = menuDropsCanvas.getContext('2d');
    menuDropsCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    menuDropsLastW = w;
    menuDropsLastH = h;
}

function spawnMenuDrop(w, h, spreadY = false) {
    const minSide = Math.min(w, h);
    const r = minSide * (0.016 + Math.random() * 0.014);
    menuFallingDrops.push({
        x: Math.random() * w,
        y: spreadY ? Math.random() * h : -r * 4 - Math.random() * h * 0.2,
        r,
        vy: minSide * (0.0016 + Math.random() * 0.0012),
        alpha: 0.62 + Math.random() * 0.28
    });
}

function tickMenuDrops(dt) {
    if (!menuDropsCtx || !mainMenu) return;
    const w = mainMenu.clientWidth;
    const h = mainMenu.clientHeight;
    if (w !== menuDropsLastW || h !== menuDropsLastH) resizeMenuDropsCanvas();

    if (menuFallingDrops.length < 8 && Math.random() < 0.022) {
        spawnMenuDrop(w, h);
    }

    for (let i = menuFallingDrops.length - 1; i >= 0; i--) {
        const d = menuFallingDrops[i];
        d.y += d.vy * dt;
        if (d.y - d.r * 2 > h) menuFallingDrops.splice(i, 1);
    }

    menuDropsCtx.clearRect(0, 0, w, h);
    for (const d of menuFallingDrops) {
        drawDropBulb(menuDropsCtx, d.x, d.y, d.r, d.alpha, 'normal');
    }
}

function menuDropsLoop(ts) {
    if (!menuDropsAnimating) return;
    if (!menuDropsLastTs) menuDropsLastTs = ts;
    let dt = (ts - menuDropsLastTs) / (1000 / 60);
    if (dt > 3) dt = 3;
    if (dt < 0) dt = 0;
    menuDropsLastTs = ts;
    tickMenuDrops(dt);
    menuDropsRaf = requestAnimationFrame(menuDropsLoop);
}

function startMenuDrops() {
    if (!menuDropsCanvas || mainMenu?.classList.contains('is-hidden') || backgroundSuspended) return;
    stopMenuDrops();
    resizeMenuDropsCanvas();
    menuFallingDrops.length = 0;
    const w = mainMenu.clientWidth;
    const h = mainMenu.clientHeight;
    for (let i = 0; i < 4; i++) spawnMenuDrop(w, h, true);
    menuDropsAnimating = true;
    menuDropsLastTs = 0;
    menuDropsRaf = requestAnimationFrame(menuDropsLoop);
}

function stopMenuDrops() {
    menuDropsAnimating = false;
    if (menuDropsRaf) cancelAnimationFrame(menuDropsRaf);
    menuDropsRaf = 0;
    menuDropsLastTs = 0;
    menuFallingDrops.length = 0;
    if (menuDropsCtx && menuDropsCanvas && mainMenu) {
        menuDropsCtx.clearRect(0, 0, mainMenu.clientWidth, mainMenu.clientHeight);
    }
}

function drawLeakSpots(ctx) {
    const { minSide } = gameLayout;
    const rMax = minSide * GAME_CFG.dropRadiusMul;

    for (const spot of leakSpots) {
        const isRust = spot.kind === 'red';
        ctx.fillStyle = isRust ? 'rgba(92, 58, 32, 0.68)' : 'rgba(55, 70, 90, 0.55)';
        ctx.beginPath();
        ctx.ellipse(spot.x, spot.y, rMax * 0.85, rMax * 0.46, 0, 0, Math.PI * 2);
        ctx.fill();

        if (!spot.growing || spot.grow <= 0) continue;

        const t = spot.grow * spot.grow;
        const r = rMax * (0.12 + 0.88 * t);
        const hang = rMax * 1.75 * t;
        const tipY = spot.y + hang;
        const dropTipY = tipY - r * 1.38;

        const threadGrad = ctx.createLinearGradient(spot.x, spot.y, spot.x, dropTipY);
        if (isRust) {
            threadGrad.addColorStop(0, `rgba(195, 140, 85, ${0.2 + 0.28 * t})`);
            threadGrad.addColorStop(1, `rgba(155, 95, 52, ${0.48 + 0.42 * t})`);
        } else {
            threadGrad.addColorStop(0, `rgba(150, 205, 255, ${0.15 + 0.25 * t})`);
            threadGrad.addColorStop(1, `rgba(120, 200, 255, ${0.45 + 0.45 * t})`);
        }
        ctx.strokeStyle = threadGrad;
        ctx.lineCap = 'round';
        ctx.lineWidth = Math.max(1, r * 0.14 + t * 1.2);
        ctx.beginPath();
        ctx.moveTo(spot.x, spot.y);
        ctx.lineTo(spot.x, dropTipY + r * 0.08);
        ctx.stroke();

        drawDropBulb(ctx, spot.x, tipY, r, 0.55 + 0.45 * t, isRust ? 'rust' : 'normal');
    }
}

class SplashParticle {
    constructor(x, y, color, kind = 'dot') {
        this.x = x;
        this.y = y;
        this.color = color;
        this.kind = kind;
        this.life = 1;
        const ang = Math.random() * Math.PI * 2;
        const spd = kind === 'ring' ? 0 : 2 + Math.random() * 8;
        this.vx = Math.cos(ang) * spd;
        this.vy = Math.sin(ang) * spd - (kind === 'dot' ? 3 : 0);
        this.r = 2 + Math.random() * 4;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.vy += 0.18 * dt;
        this.life -= (this.kind === 'ring' ? 0.06 : 0.045) * dt;
    }

    draw(ctx) {
        const a = Math.max(0, this.life);
        if (a <= 0) return;
        ctx.save();
        ctx.globalAlpha = a;
        if (this.kind === 'ring') {
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, (1 - a) * 28 + 6, 0, Math.PI * 2);
            ctx.stroke();
        } else {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.r * a, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}

function spawnSplash(x, y, color) {
    particles.push(new SplashParticle(x, y, color, 'ring'));
    for (let i = 0; i < 8; i++) particles.push(new SplashParticle(x, y, color, 'dot'));
}

function computeBucket(leftWrist, rightWrist, shoulderW, poseKey, nowMs) {
    const cx = (leftWrist.x + rightWrist.x) * 0.5;
    const topY = (leftWrist.y + rightWrist.y) * 0.5;
    const isMug = isMugMode(poseKey, nowMs);
    const vesselMul = isMug ? GAME_CFG.mugSizeMul : 1;
    const width = shoulderW * GAME_CFG.bucketShoulderMul * vesselMul;
    const height = getVesselDisplayHeight(width, isMug);

    const dx = rightWrist.x - leftWrist.x;
    const dy = rightWrist.y - leftWrist.y;
    const angle = Math.atan2(dy, dx) + BUCKET_ANGLE_FUDGE;
    const catchHalfW = width * 0.44;
    const catchBottomY = topY + height * 0.38;

    return {
        cx,
        topY,
        bottomY: topY + height,
        width,
        height,
        angle,
        shoulderW,
        leftWrist,
        rightWrist,
        catchHalfW,
        catchBottomY,
        isMug,
        poseKey
    };
}

function dropCaughtByBucket(drop, bucket) {
    if (!bucket) return false;
    const inX = Math.abs(drop.x - bucket.cx) <= bucket.catchHalfW + drop.r * 0.5;
    const inY = drop.y + drop.r >= bucket.topY - drop.r && drop.y - drop.r <= bucket.catchBottomY;
    return inX && inY;
}

function drawCeiling(ctx) {
    const { w, minSide } = gameLayout;
    const grad = ctx.createLinearGradient(0, 0, 0, minSide * 0.14);
    grad.addColorStop(0, 'rgba(30, 28, 24, 0.95)');
    grad.addColorStop(1, 'rgba(30, 28, 24, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, minSide * 0.14);

    ctx.fillStyle = 'rgba(55, 50, 45, 0.85)';
    ctx.fillRect(0, 0, w, minSide * 0.018);
}

function drawWater(ctx) {
    const { w, h } = gameLayout;
    const surfaceY = h - waterLevel * h;
    if (waterLevel <= 0.001) return;

    const grad = ctx.createLinearGradient(0, surfaceY, 0, h);
    grad.addColorStop(0, 'rgba(60, 160, 255, 0.72)');
    grad.addColorStop(0.35, 'rgba(30, 110, 220, 0.82)');
    grad.addColorStop(1, 'rgba(10, 50, 120, 0.92)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, surfaceY, w, h - surfaceY);

    ctx.strokeStyle = 'rgba(180, 230, 255, 0.65)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    const waveAmp = Math.min(8, waterLevel * h * 0.025);
    for (let x = 0; x <= w; x += 6) {
        const y = surfaceY + Math.sin(x * 0.025 + gameTime * 0.08) * waveAmp;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();

    const dangerY = h - GAME_CFG.waterGameOverFrac * h;
    if (waterLevel >= GAME_CFG.waterGameOverFrac * 0.6) {
        ctx.strokeStyle = 'rgba(255, 80, 80, 0.45)';
        ctx.setLineDash([8, 8]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, dangerY);
        ctx.lineTo(w, dangerY);
        ctx.stroke();
        ctx.setLineDash([]);
    }
}

function drawBucket(ctx, bucket) {
    if (!bucket) return;

    const { cx, topY, width, height, angle, isMug } = bucket;
    const useCup = isMug && cupSpriteReady && cupSprite.naturalWidth;
    const useBucket = !isMug && bucketSpriteReady && bucketSprite.naturalWidth;

    if (!useCup && !useBucket) {
        ctx.save();
        ctx.translate(cx, topY);
        ctx.rotate(angle);
        ctx.fillStyle = isMug ? 'rgba(255, 210, 80, 0.85)' : 'rgba(200, 140, 60, 0.85)';
        ctx.fillRect(-width * 0.5, 0, width, height);
        ctx.restore();
        return;
    }

    const img = useCup ? cupSprite : bucketSprite;
    const pivotXFrac = useCup ? CUP_PIVOT_X_FRAC : BUCKET_PIVOT_X_FRAC;
    const pivotYFrac = useCup ? CUP_PIVOT_Y_FRAC : BUCKET_PIVOT_Y_FRAC;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const scale = width / iw;
    const pivotX = iw * pivotXFrac;
    const pivotY = ih * pivotYFrac;

    ctx.save();
    ctx.translate(cx, topY);
    ctx.rotate(angle + BUCKET_ANGLE_FUDGE);
    ctx.scale(scale, -scale);
    ctx.translate(-pivotX, -pivotY);
    ctx.drawImage(img, 0, 0);
    ctx.restore();
}

function drawDrop(ctx, drop) {
    drawDropBulb(ctx, drop.x, drop.y, drop.r, 1, drop.kind === 'red' ? 'rust' : 'normal');
}

function getOrderedPersons(poseResults) {
    const persons = poseResults?.landmarks;
    if (!persons?.length) return [];
    return persons
        .map((lm, idx) => {
            const lw = lm[15];
            const rw = lm[16];
            const xs = [];
            if (lw) xs.push(lw.x);
            if (rw) xs.push(rw.x);
            return { lm, idx, sortX: xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : idx };
        })
        .sort((a, b) => a.sortX - b.sortX)
        .map((p, i) => ({ lm: p.lm, key: `Pose#${i}` }));
}

function otherPoseKey(k) {
    return k === 'Pose#0' ? 'Pose#1' : 'Pose#0';
}

function shoulderMidScreen(lm, getScreenPoint) {
    const ls = lm[11];
    const rs = lm[12];
    if (!ls || !rs) return null;
    const a = getScreenPoint(ls);
    const b = getScreenPoint(rs);
    return { x: (a.x + b.x) * 0.5, y: (a.y + b.y) * 0.5 };
}

function bindStablePoseKeys(sortedPersons, getScreenPoint) {
    const items = [];
    for (const { lm } of sortedPersons) {
        const mid = shoulderMidScreen(lm, getScreenPoint);
        if (!mid) continue;
        items.push({ lm, mid });
    }
    if (items.length === 0) return [];

    if (items.length >= 3) {
        stablePoseShoulderMid = items.map((it, i) => ({
            key: `Pose#${i}`,
            x: it.mid.x,
            y: it.mid.y
        }));
        return items.map((it, i) => ({ lm: it.lm, key: `Pose#${i}` }));
    }

    if (items.length === 1) {
        if (stablePoseShoulderMid.length >= 2) {
            let bestKey = stablePoseShoulderMid[0].key;
            let bestD = Infinity;
            for (const s of stablePoseShoulderMid) {
                const d = Math.hypot(items[0].mid.x - s.x, items[0].mid.y - s.y);
                if (d < bestD) {
                    bestD = d;
                    bestKey = s.key;
                }
            }
            stablePoseShoulderMid = [{ key: bestKey, x: items[0].mid.x, y: items[0].mid.y }];
            return [{ lm: items[0].lm, key: bestKey }];
        }
        if (stablePoseShoulderMid.length === 1) {
            stablePoseShoulderMid[0].x = items[0].mid.x;
            stablePoseShoulderMid[0].y = items[0].mid.y;
            return [{ lm: items[0].lm, key: stablePoseShoulderMid[0].key }];
        }
        stablePoseShoulderMid = [{ key: 'Pose#0', x: items[0].mid.x, y: items[0].mid.y }];
        return [{ lm: items[0].lm, key: 'Pose#0' }];
    }

    const t0 = items[0];
    const t1 = items[1];

    if (stablePoseShoulderMid.length === 1) {
        const old = stablePoseShoulderMid[0];
        const d0 = Math.hypot(t0.mid.x - old.x, t0.mid.y - old.y);
        const d1 = Math.hypot(t1.mid.x - old.x, t1.mid.y - old.y);
        if (d0 <= d1) {
            stablePoseShoulderMid = [
                { key: old.key, x: t0.mid.x, y: t0.mid.y },
                { key: otherPoseKey(old.key), x: t1.mid.x, y: t1.mid.y }
            ];
            return [
                { lm: t0.lm, key: old.key },
                { lm: t1.lm, key: otherPoseKey(old.key) }
            ];
        }
        stablePoseShoulderMid = [
            { key: otherPoseKey(old.key), x: t0.mid.x, y: t0.mid.y },
            { key: old.key, x: t1.mid.x, y: t1.mid.y }
        ];
        return [
            { lm: t0.lm, key: otherPoseKey(old.key) },
            { lm: t1.lm, key: old.key }
        ];
    }

    if (stablePoseShoulderMid.length !== 2) {
        stablePoseShoulderMid = [
            { key: 'Pose#0', x: t0.mid.x, y: t0.mid.y },
            { key: 'Pose#1', x: t1.mid.x, y: t1.mid.y }
        ];
        return [
            { lm: t0.lm, key: 'Pose#0' },
            { lm: t1.lm, key: 'Pose#1' }
        ];
    }

    const s0 = stablePoseShoulderMid[0];
    const s1 = stablePoseShoulderMid[1];
    const d00 = Math.hypot(t0.mid.x - s0.x, t0.mid.y - s0.y);
    const d10 = Math.hypot(t1.mid.x - s0.x, t1.mid.y - s0.y);
    const d01 = Math.hypot(t0.mid.x - s1.x, t0.mid.y - s1.y);
    const d11 = Math.hypot(t1.mid.x - s1.x, t1.mid.y - s1.y);
    const straight = d00 + d11;
    const crossed = d01 + d10;
    let itemForS0 = 0;
    let itemForS1 = 1;
    if (crossed + 12 < straight) {
        itemForS0 = 1;
        itemForS1 = 0;
    }
    const mS0 = items[itemForS0];
    const mS1 = items[itemForS1];
    s0.x = mS0.mid.x;
    s0.y = mS0.mid.y;
    s1.x = mS1.mid.x;
    s1.y = mS1.mid.y;
    return [
        { lm: mS0.lm, key: s0.key },
        { lm: mS1.lm, key: s1.key }
    ];
}

function playerIndexFromPoseKey(poseKey) {
    const m = poseKey.match(/^Pose#(\d+)$/);
    return m ? parseInt(m[1], 10) : 0;
}

function holdBucketDuringGrace(poseKey, nowMs) {
    if (!trackTuning.bucketGraceMs) {
        bucketByPoseKey.delete(poseKey);
        bucketGraceByPoseKey.delete(poseKey);
        return null;
    }
    const last = bucketByPoseKey.get(poseKey);
    const graceUntil = bucketGraceByPoseKey.get(poseKey) ?? 0;
    if (last && nowMs < graceUntil) return last;
    bucketByPoseKey.delete(poseKey);
    bucketGraceByPoseKey.delete(poseKey);
    return null;
}

function updateHandsFromPose(landmarks, getScreenPoint, poseKey) {
    const nowMs = performance.now();
    const lw = landmarks[15];
    const rw = landmarks[16];
    const ls = landmarks[11];
    const rs = landmarks[12];
    if (!lw || !rw || !ls || !rs) {
        return holdBucketDuringGrace(poseKey, nowMs);
    }
    const vis = Math.min(lw.visibility ?? 1, rw.visibility ?? 1, ls.visibility ?? 1, rs.visibility ?? 1);
    if (vis < trackTuning.wristMinVisibility) {
        return holdBucketDuringGrace(poseKey, nowMs);
    }

    const leftRaw = getScreenPoint(lw);
    const rightRaw = getScreenPoint(rw);
    leftRaw.visibility = lw.visibility;
    rightRaw.visibility = rw.visibility;

    const p11 = getScreenPoint(ls);
    const p12 = getScreenPoint(rs);
    const shoulderWRaw = Math.hypot(p12.x - p11.x, p12.y - p11.y);
    if (shoulderWRaw < GAME_CFG.shoulderMinPx) {
        return holdBucketDuringGrace(poseKey, nowMs);
    }
    const shoulderW = smoothShoulderWidth(poseKey, shoulderWRaw);

    let state = wristSmoothByPoseKey.get(poseKey);
    if (!state) state = { left: null, right: null };

    state.left = smoothWristPoint(state.left, leftRaw);
    state.right = smoothWristPoint(state.right, rightRaw);
    wristSmoothByPoseKey.set(poseKey, state);

    const bucket = smoothBucketDisplay(
        poseKey,
        computeBucket(state.left, state.right, shoulderW, poseKey, nowMs)
    );
    bucketByPoseKey.set(poseKey, bucket);
    if (trackTuning.bucketGraceMs) {
        bucketGraceByPoseKey.set(poseKey, nowMs + trackTuning.bucketGraceMs);
    }
    return bucket;
}

function updateTrackingDisplay(orderedPersons, activeBuckets) {
    if (!trackingDisplay) return;
    const n = orderedPersons.length;
    const buckets = activeBuckets.length;

    if (playerModeCount === 1) {
        trackingDisplay.textContent = buckets >= 1 ? t('trackingActive') : t('trackingNeedHands');
        return;
    }

    if (n >= 2 && buckets >= 2) {
        trackingDisplay.textContent = t('tracking2Active');
    } else if (n >= 1 && buckets >= 1) {
        trackingDisplay.textContent = t('tracking2NeedSecond');
    } else {
        trackingDisplay.textContent = t('tracking2NeedBoth');
    }
}

function drawWristMarkers(ctx, bucket, playerColor = '#00f3ff') {
    if (!bucket) return;
    for (const pt of [bucket.leftWrist, bucket.rightWrist]) {
        ctx.fillStyle = playerColor;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

let perfFrameSumMs = 0;
let perfFrameCount = 0;
let perfLastLogMs = 0;

function gameLoop(nowTime) {
    if (!isPlaying) return;

    if (!nowTime) nowTime = performance.now();
    let dt = (nowTime - lastFrameTime) / (1000 / 60);
    if (dt > 3) dt = 3;
    if (dt < 0) dt = 0;
    lastFrameTime = nowTime;
    gameTime += dt;

    const startTimeMs = performance.now();

    let poseFrameIsNew = false;
    if (lastVideoTime !== video.currentTime) {
        lastVideoTime = video.currentTime;
        const rawTsMs = Number.isFinite(video.currentTime) ? video.currentTime * 1000 : startTimeMs;
        poseDetectTsMs = Math.max(poseDetectTsMs + 1, rawTsMs);
        try {
            const pRes = poseLandmarker.detectForVideo(video, poseDetectTsMs);
            if (pRes) {
                currentPoseResults = pRes;
                poseFrameIsNew = true;
            }
        } catch (err) {
            console.warn('PoseLandmarker detectForVideo:', err);
        }
    }

    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    const vRatio = canvasElement.width / video.videoWidth;
    const hRatio = canvasElement.height / video.videoHeight;
    const ratio = Math.max(vRatio, hRatio);
    const centerShift_x = (canvasElement.width - video.videoWidth * ratio) / 2;
    const centerShift_y = (canvasElement.height - video.videoHeight * ratio) / 2;

    canvasCtx.drawImage(
        video,
        0,
        0,
        video.videoWidth,
        video.videoHeight,
        centerShift_x,
        centerShift_y,
        video.videoWidth * ratio,
        video.videoHeight * ratio
    );

    canvasCtx.fillStyle = 'rgba(0,0,0,0.52)';
    canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);

    function getScreenPoint(landmark) {
        return {
            x: landmark.x * video.videoWidth * ratio + centerShift_x,
            y: landmark.y * video.videoHeight * ratio + centerShift_y
        };
    }

    let orderedPersons = [];
    const activeBuckets = [];

    if (currentPoseResults?.landmarks) {
        orderedPersons = bindStablePoseKeys(getOrderedPersons(currentPoseResults), getScreenPoint);
        const activeKeys = new Set(orderedPersons.map((p) => p.key));

        // Сглаживание/перерасчёт ведра — только на новом кадре камеры (~30 fps),
        // иначе на экранах 120 Гц сглаживание прокручивается лишние разы и дрожит.
        // На кадрах без обновления переиспользуем последнее положение ведра.
        for (const { lm, key } of orderedPersons) {
            const bucket = poseFrameIsNew
                ? updateHandsFromPose(lm, getScreenPoint, key)
                : bucketByPoseKey.get(key) ?? null;
            if (bucket) activeBuckets.push(bucket);
        }

        for (const k of [...bucketByPoseKey.keys()]) {
            if (activeKeys.has(k)) continue;
            const held = holdBucketDuringGrace(k, nowTime);
            if (held && !activeBuckets.includes(held)) activeBuckets.push(held);
        }

        for (const k of [...wristSmoothByPoseKey.keys()]) {
            if (!activeKeys.has(k) && !bucketByPoseKey.has(k)) wristSmoothByPoseKey.delete(k);
        }
        for (const k of [...shoulderWidthByPoseKey.keys()]) {
            if (!activeKeys.has(k) && !bucketByPoseKey.has(k)) shoulderWidthByPoseKey.delete(k);
        }
        for (const k of [...bucketDisplayByPoseKey.keys()]) {
            if (!activeKeys.has(k) && !bucketByPoseKey.has(k)) bucketDisplayByPoseKey.delete(k);
        }
    } else if (trackTuning.bucketGraceMs) {
        for (const k of [...bucketByPoseKey.keys()]) {
            const held = holdBucketDuringGrace(k, nowTime);
            if (held) activeBuckets.push(held);
        }
    } else {
        bucketByPoseKey.clear();
    }

    lastTrackingPersons = orderedPersons;
    lastTrackingBuckets = activeBuckets;
    updateTrackingDisplay(orderedPersons, activeBuckets);
    updateMugTimerHud(activeBuckets, nowTime);

    drawCeiling(canvasCtx);
    drawLeakSpots(canvasCtx);
    drawWater(canvasCtx);

    updateGrowingSpots(dt);

    if (nowTime - lastSpawnTime >= nextSpawnDelay) {
        tryStartDropGrowth('normal');
        lastSpawnTime = nowTime;
        nextSpawnDelay = randSpawnDelay();
        const difficulty = Math.min(0.25, score * 0.006);
        nextSpawnDelay *= 1 - difficulty;
    }

    if (nowTime - lastRedSpawnTime >= nextRedSpawnDelay) {
        tryStartDropGrowth('red');
        lastRedSpawnTime = nowTime;
        nextRedSpawnDelay = randRedSpawnDelay();
    }

    const floorY = gameLayout.h - waterLevel * gameLayout.h;

    for (let i = drops.length - 1; i >= 0; i--) {
        const drop = drops[i];
        drop.y += drop.vy * dt;

        let catcher = null;
        for (const bucket of activeBuckets) {
            if (dropCaughtByBucket(drop, bucket)) {
                catcher = bucket;
                break;
            }
        }

        if (catcher) {
            drop.dead = true;
            if (drop.kind === 'red') {
                applyMugMode(catcher.poseKey, nowTime);
                spawnSplash(drop.x, drop.y, '#b87333');
            } else {
                score += 1;
                updateHud();
                spawnSplash(drop.x, drop.y, '#7ec8ff');
                playCatchSound();
            }
            drops.splice(i, 1);
            continue;
        }

        if (drop.y + drop.r >= floorY) {
            drop.dead = true;
            if (drop.kind !== 'red') {
                waterLevel = Math.min(1, waterLevel + GAME_CFG.waterRisePerMiss);
                updateHud();
                playSplashSound();
            }
            spawnSplash(drop.x, floorY, drop.kind === 'red' ? '#9a5c2e' : '#4a9eff');
            drops.splice(i, 1);

            if (waterLevel >= GAME_CFG.waterGameOverFrac) {
                triggerGameOver();
            }
            continue;
        }

        if (drop.y > gameLayout.h + drop.r * 2) {
            drops.splice(i, 1);
        }
    }

    for (const drop of drops) {
        drawDrop(canvasCtx, drop);
    }

    for (const bucket of activeBuckets) {
        const pi = playerIndexFromPoseKey(bucket.poseKey);
        const color = PLAYER_COLORS[pi] ?? PLAYER_COLORS[0];
        drawBucket(canvasCtx, bucket);
        drawWristMarkers(canvasCtx, bucket, color);
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update(dt);
        p.draw(canvasCtx);
        if (p.life <= 0) particles.splice(i, 1);
    }

    if (DEBUG_FRAME_PERF) {
        const elapsed = performance.now() - startTimeMs;
        perfFrameSumMs += elapsed;
        perfFrameCount += 1;
        const t = performance.now();
        if (t - perfLastLogMs >= 2500) {
            perfLastLogMs = t;
            const avg = perfFrameSumMs / perfFrameCount;
            console.info(`[perf] среднее за кадр ${avg.toFixed(1)} ms (n=${perfFrameCount})`);
            perfFrameSumMs = 0;
            perfFrameCount = 0;
        }
    }

    if (isPlaying) requestAnimationFrame(gameLoop);
}

function showStartError(e) {
    console.error(e);
    const name = e?.name || '';
    const msg = e?.message || String(e);
    let hint = t('startErrorHintDefault');
    if (name === 'NotAllowedError' || /Permission/i.test(msg)) {
        hint = t('startErrorCameraBlocked');
    } else if (name === 'NotFoundError' || /DevicesNotFound/i.test(msg)) {
        hint = t('startErrorNoCamera');
    } else if (
        name === 'AbortError' ||
        /Timeout starting video source|metadata timeout/i.test(msg)
    ) {
        hint = t('startErrorTimeout');
    }
    loadingElement.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.style.cssText = 'max-width:28rem;margin:0 auto;text-align:left;line-height:1.45;font-size:0.95rem;';
    const titleEl = document.createElement('p');
    titleEl.textContent = t('startErrorTitle');
    titleEl.style.fontWeight = '700';
    titleEl.style.marginBottom = '0.5rem';
    wrap.appendChild(titleEl);
    const d = document.createElement('p');
    d.style.opacity = '0.9';
    d.style.fontSize = '0.85rem';
    d.style.wordBreak = 'break-word';
    d.textContent = msg ? `${name ? `[${name}] ` : ''}${msg}` : hint;
    wrap.appendChild(d);
    const h = document.createElement('p');
    h.style.marginTop = '0.75rem';
    h.style.fontSize = '0.82rem';
    h.style.opacity = '0.75';
    h.textContent = hint;
    wrap.appendChild(h);
    loadingElement.appendChild(wrap);
    loadingElement.classList.add('visible');
}

async function start() {
    try {
        await setupWebcam();
        await Promise.all([initializeModels(), preloadSprites()]);
        if (isPageHidden()) suspendAppForBackground();
    } catch (e) {
        showStartError(e);
    }
}

start();
