/**
 * Тексты голосовых клипов для генерации через ElevenLabs (scripts/generate-voice.mjs).
 * id = имя файла в src/assets/sounds/voice/<lang>/<id>.mp3.
 * Варианты одной реплики: <base>, <base>-2, <base>-3 … — игра выбирает случайный.
 */
export const VOICE_LINES = {
    // --- Инструкции и события ---
    'howto-spread-bucket': {
        ru: 'Разведи руки в стороны — и появится ведро!',
        en: 'Spread your arms wide, and a bucket will appear!',
        el: 'Άνοιξε τα χέρια σου διάπλατα και θα εμφανιστεί ένας κουβάς!'
    },
    'bucket-ready': {
        ru: 'Ведро готово! Лови капли!',
        en: 'Bucket ready! Catch the drops!',
        el: 'Ο κουβάς είναι έτοιμος! Πιάσε τις σταγόνες!'
    },
    'need-hands': {
        ru: 'Покажи обе руки в кадре!',
        en: 'Show both hands to the camera!',
        el: 'Δείξε και τα δύο χέρια στην κάμερα!'
    },
    'need-both': {
        ru: 'Встаньте в кадр вдвоём!',
        en: 'Both players, step into the frame!',
        el: 'Μπείτε και οι δύο στο κάδρο!'
    },
    'team-ready': {
        ru: 'Второй игрок с нами! Играем вместе!',
        en: "Player two is here! Let's play together!",
        el: 'Ήρθε και ο δεύτερος παίκτης! Παίζουμε μαζί!'
    },
    'first-catch': {
        ru: 'Первая капля! Так держать!',
        en: 'First drop! Way to go!',
        el: 'Η πρώτη σταγόνα! Μπράβο σου!'
    },
    'water-warning': {
        ru: 'Осторожно, вода поднимается!',
        en: 'Watch out, the water is rising!',
        el: 'Προσοχή, το νερό ανεβαίνει!'
    },
    'mug-oops': {
        ru: 'Ой, кружка!',
        en: 'Oops, a mug!',
        el: 'Ωχ, μια κούπα!'
    },
    'mug-over': {
        ru: 'Ведро вернулось! Лови дальше!',
        en: 'Your bucket is back! Keep catching!',
        el: 'Ο κουβάς γύρισε! Συνέχισε να πιάνεις!'
    },

    // --- Бонусы ---
    'powerup-slowmo': { ru: 'Замедление!', en: 'Slow motion!', el: 'Αργή κίνηση!' },
    'powerup-magnet': { ru: 'Магнит!', en: 'Magnet!', el: 'Μαγνήτης!' },
    'powerup-big': { ru: 'Большое ведро!', en: 'Big bucket!', el: 'Μεγάλος κουβάς!' },
    'powerup-drain': { ru: 'Вода уходит!', en: 'The water is draining!', el: 'Το νερό φεύγει!' },

    // --- Похвала за серию ---
    'praise-5': { ru: 'Хорошо!', en: 'Nice!', el: 'Ωραία!' },
    'praise-5-2': { ru: 'Так держать!', en: 'Keep it up!', el: 'Συνέχισε έτσι!' },
    'praise-5-3': { ru: 'Отлично ловишь!', en: 'Great catching!', el: 'Πιάνεις τέλεια!' },
    'praise-10': { ru: 'Супер!', en: 'Super!', el: 'Σούπερ!' },
    'praise-10-2': { ru: 'Десять подряд! Ух ты!', en: 'Ten in a row! Wow!', el: 'Δέκα στη σειρά! Ουάου!' },
    'praise-10-3': { ru: 'Вот это ловкость!', en: 'What great moves!', el: 'Τι ωραίες κινήσεις!' },
    'praise-15': { ru: 'Ты в ударе!', en: "You're on fire!", el: 'Είσαι φωτιά!' },
    'praise-15-2': {
        ru: 'Продолжай в том же духе!',
        en: "Keep going, you're doing great!",
        el: 'Συνέχισε, τα πας υπέροχα!'
    },
    'praise-20': { ru: 'Класс!', en: 'Awesome!', el: 'Φοβερό!' },
    'praise-20-2': {
        ru: 'Двадцать подряд! Ты супер!',
        en: "Twenty in a row! You're amazing!",
        el: 'Είκοσι στη σειρά! Καταπληκτικό!'
    },
    'praise-20-3': {
        ru: 'Ни одной капли мимо!',
        en: 'Not a single drop missed!',
        el: 'Ούτε μία σταγόνα δεν χάθηκε!'
    },
    'praise-30': { ru: 'Невероятно!', en: 'Incredible!', el: 'Απίστευτο!' },
    'praise-30-2': { ru: 'Ты суперзвезда!', en: "You're a superstar!", el: 'Είσαι αστέρι!' },
    'praise-30-3': { ru: 'Фантастика!', en: 'Fantastic!', el: 'Φανταστικό!' },

    // --- Похвала для режима «2 игрока» ---
    'team-praise': { ru: 'Отличная командная работа!', en: 'Great teamwork!', el: 'Υπέροχη ομαδική δουλειά!' },
    'team-praise-2': { ru: 'Вместе вы — сила!', en: "Together you're unstoppable!", el: 'Μαζί είστε ασταμάτητοι!' },
    'team-praise-3': { ru: 'Какая дружная команда!', en: 'What a team!', el: 'Τι ομάδα!' },

    // --- Общий счёт ---
    'score-25': { ru: 'Уже двадцать пять капель!', en: 'Twenty-five drops already!', el: 'Ήδη είκοσι πέντε σταγόνες!' },
    'score-50': { ru: 'Пятьдесят капель! Ух ты!', en: 'Fifty drops! Wow!', el: 'Πενήντα σταγόνες! Ουάου!' },
    'score-100': { ru: 'Сто капель! Это легендарно!', en: 'One hundred drops! Legendary!', el: 'Εκατό σταγόνες! Θρυλικό!' },

    // --- Поддержка после промаха ---
    'miss-encourage': {
        ru: 'Ничего страшного, лови следующую!',
        en: 'No worries, catch the next one!',
        el: 'Δεν πειράζει, πιάσε την επόμενη!'
    },
    'miss-encourage-2': {
        ru: 'Не сдавайся, у тебя получится!',
        en: "Don't give up, you can do it!",
        el: 'Μην τα παρατάς, μπορείς!'
    },

    // --- Итог раунда ---
    'result-title': { ru: 'Молодец! Отличная игра!', en: 'Well done! Great game!', el: 'Μπράβο! Υπέροχο παιχνίδι!' },
    'result-title-2': { ru: 'Ура! Отличная работа!', en: 'Hooray! Great job!', el: 'Ζήτω! Εξαιρετική δουλειά!' },
    'result-new-best': { ru: 'Новый рекорд! Ура!', en: 'New record! Hooray!', el: 'Νέο ρεκόρ! Ζήτω!' },
    'result-team': { ru: 'Отличная игра, команда!', en: 'Great game, team!', el: 'Υπέροχο παιχνίδι, ομάδα!' }
};

/** Голоса ElevenLabs по языку (можно переопределить через VOICE_ID_RU / _EN / _EL в .env) */
export const DEFAULT_VOICE_IDS = {
    ru: 'xyu8HSCv1JYrhLx4m8UG', // Ariana — Energetic and Inspiring
    en: 'cgSgspJ2msm6clMCkdW9', // Jessica — Playful, Bright, Warm
    el: 'wykE1oPxFaMrxdpOtFt6' // Niki — native Greek female VO
};
