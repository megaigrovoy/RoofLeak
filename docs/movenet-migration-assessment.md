# Оценка миграции: MediaPipe Pose → TF.js MoveNet MultiPose

Пункт 3 плана из [two-player-tracking-research.md](./two-player-tracking-research.md).
Это **оценка, не реализация**. Решение принимается после теста текущего трекинга на проде.

---

## 1. Зачем вообще рассматривать

MediaPipe `PoseLandmarker` **не отдаёт track ID** — поэтому мы написали и отлаживаем
`bindStablePoseKeys` (ассоциация, предсказание движения, lifecycle, цветовая подпись).
Это ~200 строк собственного трекера, который мы сами и дебажим.

У TF.js `pose-detection` + **MoveNet MULTIPOSE_LIGHTNING** это встроено:

```js
const detector = await poseDetection.createDetector(
    poseDetection.SupportedModels.MoveNet,
    {
        modelType: poseDetection.movenet.modelType.MULTIPOSE_LIGHTNING,
        enableTracking: true,                                  // ← track ID из коробки
        trackerType: poseDetection.TrackerType.Keypoint,       // OKS по скелету
        trackerConfig: { maxTracks: 2, maxAge: 2000, minSimilarity: 0.2 }
    }
);
const poses = await detector.estimatePoses(video);
// poses[i].id — устойчивый идентификатор трека между кадрами
```

Внутри — та же схема, что мы реализовали руками (матрица похожести → сопоставление →
треки живут `maxAge`), но уже оттестированная Google.

---

## 2. Что даёт

| Плюс | Детали |
|---|---|
| **Track ID из коробки** | `poses[i].id` — убирает необходимость в нашем `bindStablePoseKeys` целиком |
| **Keypoint tracker (OKS)** | Похожесть по всему скелету, а не только по центру плеч — устойчивее нашей эвристики |
| **Тюнинг lifecycle** | `maxAge`, `minSimilarity`, `maxTracks`, `keypointThreshold` — конфигом, а не кодом |
| **Быстрее в браузере** | MoveNet Lightning ≈ **34 FPS** vs BlazePose (MediaPipe) **11–12 FPS** на Pixel 5; multipose 54–87 FPS |
| **Меньше своего кода** | Уходит ~200 строк самописного трекинга + связанные баги |

---

## 3. Что стоит (реальная цена)

### 3.1 Нужные точки — есть ✅

Мы используем **всего 4 лендмарка**: плечи `11/12`, запястья `15/16` (+ бёдра `23/24` для
цветовой подписи). MoveNet отдаёт **COCO-17**, где все они присутствуют — но **под другими
индексами**. Это простой маппинг, а не блокер.

| Наше | MediaPipe (33) | MoveNet COCO-17 |
|---|---|---|
| Левое плечо | 11 | 5 |
| Правое плечо | 12 | 6 |
| Левое запястье | 15 | 9 |
| Правое запястье | 16 | 10 |
| Левое бедро | 23 | 11 |
| Правое бедро | 24 | 12 |

### 3.2 Что придётся переделать

- **Загрузчик модели.** Уходит `FilesetResolver` + WASM-пайплайн MediaPipe, приходит
  `@tensorflow/tfjs` + `@tensorflow-models/pose-detection` + выбор бэкенда (WebGL/WASM).
  Скрипт [`scripts/copy-mediapipe-wasm.mjs`](../scripts/copy-mediapipe-wasm.mjs) и правила
  `/mediapipe-wasm/*` в [`public/_headers`](../public/_headers) становятся не нужны — вместо них
  свои артефакты TF.js.
- **`visibility` → `score`.** У MediaPipe у лендмарка есть `visibility`; у MoveNet — `score` на
  keypoint. Пороги (`wristMinVisibility`, `minPoseDetectionConfidence`, `minTrackingConfidence`,
  `minPosePresenceConfidence`) придётся **подбирать заново** — прямого соответствия нет.
- **Координаты.** MediaPipe даёт нормализованные (0..1), MoveNet — **в пикселях входного
  изображения**. `getScreenPoint` и `sampleTorsoColor` (работает в нормализованных) надо переписать.
- **`detectForVideo` → `estimatePoses`.** У MediaPipe синхронный вызов с монотонным таймстампом
  (мы специально чинили скачки `video.currentTime`); у TF.js — `async` вызов. Игровой цикл
  придётся адаптировать под промис.
- **Наш трекинг-код удаляется:** `bindStablePoseKeys`, `predictedShoulderMid`, `updateStableTrack`,
  `stablePoseShoulderMid`, цветовая подпись — всё заменяется на `pose.id`. (Цветовую подпись можно
  сохранить как страховку, если встроенный трекер окажется хуже.)

### 3.3 Главный риск ⚠️

**Android-фикса с CPU-делегатом придётся проходить заново.**
[`docs/mobile-tracking-fix.md`](./mobile-tracking-fix.md) описывает выстраданное решение:
на Android GPU-делегат MediaPipe грузил кадр с неучтённой ориентацией → лендмарки рук дрожали
и путались местами; вылечилось принудительным **CPU-делегатом на мобильных**.

Это решение **привязано к MediaPipe и на MoveNet не переносится**. У TF.js своя пара бэкендов
(WebGL / WASM / WebGPU) со своими особенностями на Android. Нет никакой гарантии, что:
- та же проблема не всплывёт в другой форме;
- WASM-бэкенд TF.js будет достаточно быстр на слабых Android (CPU-путь MediaPipe нас устраивал).

**Это делает миграцию не «заменой пары строк», а полноценным циклом с тестированием на реальных
Android-устройствах.**

---

## 4. Вердикт

**Не мигрировать прямо сейчас.** Обоснование:

1. **Проблема, ради которой рассматривали миграцию, уже решена** своими силами: lifecycle с
   `maxAge` + предсказание движения + цветовая подпись. Все сценарии (мелькание, окклюзия 600мс,
   пересечение, одиночный игрок) проходят тесты.
2. **Главный риск — Android.** Мы уже один раз прошли болезненный цикл отладки трекинга на
   Android и зафиксировали рабочее решение. Миграция обнуляет эту гарантию, а выигрыш
   (готовый track ID) мы только что получили и без неё.
3. **Выигрыш в FPS реален, но не является нашим узким местом** — жалоб на производительность нет,
   жалоба была на потерю второго игрока.

### Когда возвращаться к вопросу

Мигрировать стоит, если после прод-теста окажется, что:
- самописный трекинг **всё ещё** путает/теряет игроков в реальных условиях, ИЛИ
- упрёмся в производительность на слабых устройствах (MoveNet заметно быстрее), ИЛИ
- понадобится **>2 игроков** (MoveNet MultiPose держит до 6 и трекает их из коробки — наш
  самописный трекер на это не рассчитан: ветка `items.length >= 3` просто раздаёт ключи по порядку).

Последний пункт — самый вероятный триггер. **Если захотим 3–4 игроков (как в Nex Playground),
миграция на MoveNet становится оправданной**, потому что переписывать свой трекер под N игроков
дороже, чем взять готовый.

### Если решим мигрировать — порядок

1. Ветка + параллельная реализация детектора за общим интерфейсом
   (`detectPoses(video) → [{ id, keypoints }]`), чтобы игровой код не знал о движке.
2. Маппинг COCO-17 → наши 4–6 точек; подбор score-порогов.
3. **Прогон на Android** (тот же Samsung, что в mobile-tracking-fix.md) — WebGL vs WASM бэкенд.
4. Только после подтверждения на Android — удаление MediaPipe и самописного трекинга.

---

## Источники

- [TF.js pose-detection README](https://github.com/tensorflow/tfjs-models/blob/master/pose-detection/README.md)
- [MoveNet docs (enableTracking, trackerType, trackerConfig)](https://github.com/tensorflow/tfjs-models/tree/master/pose-detection/src/movenet)
- tracker.md — keypoint tracker (OKS) vs bounding-box tracker (IoU)
- [Бенчмарк pose-моделей в браузере, 2026](https://medium.com/@fabrice_77308/the-best-human-pose-estimation-model-in-2026-db7f7cfe6dab)
