# Протечка крыши (Roof Leak)

Игра перед веб-камерой на **MediaPipe Pose**: разведите руки — между запястьями появится ведро, ловите капли с протекающей крыши.

Режим на **1 или 2 игроков** перед одной камерой.

## Геймплей

- Разведите руки — ведро появляется между запястьями и следует за ними.
- Капли растут в случайных местах под «протечкой» и падают вниз.
- Пойманная капля даёт очко; промах поднимает уровень воды на полу.
- Если вода заполнит **50%** экрана — game over.
- Иногда падает **ржавая капля**: поймав её, вы на **5 секунд** ловите капли в кружку вместо ведра (без очков; промах ржавой капли воду не поднимает).

## Запуск

```bash
npm install
npm run dev
```

Откройте HTTPS URL из терминала — камера работает только в безопасном контексте. Для локальной сети см. адрес **Network** в выводе Vite.

## Сборка

```bash
npm run build
npm run preview
```

## Репозиторий

- GitHub: [https://github.com/megaigrovoy/RoofLeak](https://github.com/megaigrovoy/RoofLeak)
- Локальная копия: `E:\BlagoGames\web-mediapipe 3 - roof leak`

```bash
git clone https://github.com/megaigrovoy/RoofLeak.git
cd RoofLeak
npm install
npm run dev
```

## Стек

- Vite
- [@mediapipe/tasks-vision](https://www.npmjs.com/package/@mediapipe/tasks-vision) (Pose Landmarker, WASM)
