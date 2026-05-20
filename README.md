# Roof Leak

A webcam game powered by **MediaPipe Pose**: spread your hands to summon a bucket between your wrists and catch drops from a leaking roof.

Supports **1 or 2 players** in front of a single camera.

## Gameplay

- Spread your hands — a bucket appears between your wrists and follows them.
- Drops grow at random leak spots under the ceiling, then fall.
- A caught drop adds to your score; a miss raises the water level on the floor.
- If the water reaches **50%** of the screen — game over.
- Occasionally a **rusty drop** appears: catch it and you’ll use a mug instead of a bucket for **5 seconds** (no score; missing a rusty drop does not raise the water level).

## Run locally

```bash
npm install
npm run dev
```

Open the HTTPS URL from the terminal — the camera requires a secure context. For LAN access, use the **Network** address shown by Vite.

## Build

```bash
npm run build
npm run preview
```

## Repository

- GitHub: [https://github.com/megaigrovoy/RoofLeak](https://github.com/megaigrovoy/RoofLeak)
- Local copy: `E:\BlagoGames\web-mediapipe 3 - roof leak`

```bash
git clone https://github.com/megaigrovoy/RoofLeak.git
cd RoofLeak
npm install
npm run dev
```

## Stack

- Vite
- [@mediapipe/tasks-vision](https://www.npmjs.com/package/@mediapipe/tasks-vision) (Pose Landmarker, WASM)
