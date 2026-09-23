# Рушії курсу (`src/engines`)

Чистий TypeScript без DOM і React: однакові для сайту (React-острови) і SCORM-пакетів.

Спільні правила:

- Функції чисті, вхідні дані не змінюються, стан — незмінні серіалізовні об'єкти.
- Помилки користувача повертаються як `Result` (`{ ok: true, value }` або `{ ok: false, error }`) із кодом і повідомленням українською. Винятки лишаються тільки для помилок програміста.
- Випадковість іде лише через `RandomSource` (`shared/random.ts`, `createSeededRandom(seed)`). Результат відтворюється за зерном.
- Числа показуємо через `shared/number-format.ts` (`Intl.NumberFormat('uk-UA')`), а читаємо через `shared/decimal-input.ts`. Парсер приймає «1,5», «1.5» і «1 234,5» зі звичайним, нерозривним (U+00A0) або вузьким нерозривним (U+202F) пробілом.

## `shared/`

| Модуль | API |
|---|---|
| `random.ts` | `createSeededRandom(seed)`, `randomInt`, `shuffled` (повертає копію), `pickOne` |
| `decimal-input.ts` | `parseMoodleNumber(text)` → `{ value, rest }` (порт `apply_units` Moodle), `parseDecimalInput(text)` → `number \| null` |
| `number-format.ts` | `formatNumber`, `formatMoney` («32,50 грн»), `formatPercent` («12,5 %»), `roundTo` (округлення «від нуля», як у PHP) |
| `result.ts` | `Result<T, E>`, `ok`, `err` |

## `quiz/` — тренувальний тест з оцінюванням як у Moodle 5.2

Типи питань відповідають схемі банку (`src/content/schemas/questions.ts`). Як оцінюється кожен тип і де можливі розбіжності з Moodle, описано в коментарі `quiz/index.ts`.

Цикл спроби:

```ts
const attempt0 = startAttempt({ quizId, questions, random: createSeededRandom(seed), now, mode: 'immediate' });
const step = answerQuestion(attempt0, questions, slotIndex, response, now); // Result<QuizAttempt, AttemptError>
const finished = finishAttempt(attempt, questions, now);
const summary = summarizeAttempt(finished);          // бали, percent, score 0..1, лічильники станів
const review = reviewQuestion(question, slot.layout, slot.response); // пояснення до кожного варіанта
```

Контракт для UI-островів:

- Порядок показу бере `slot.layout` (`order`, `stemOrder`, `choiceOrder`, `partOrders`). Відповідь (`QuestionResponse`) завжди містить індекси в масивах банку, а не в перемішаному порядку.
- `mode: 'immediate'`: відповідь оцінюється одразу і більше не змінюється. `mode: 'deferred'`: оцінка з'являється тільки після `finishAttempt`.
- Якщо відповідь неповна або некоректна, `answerQuestion` повертає `invalid-response` з `issue.message` для показу біля поля. Повідомлення зібрано в `RESPONSE_ISSUE_MESSAGES`.
- `attemptSummaryText(summary)` дає текст для `aria-live`, `questionStateLabel(state)` — підпис поруч зі знаком стану.
- `validateFormula(formula, { variables })` — окремий валідатор формул calculated для схеми банку. `generateDatasetItems(question)` — стабільний набір значень, який варто вивантажити в Moodle XML, щоб варіанти на сайті й у Moodle збігалися.

SCORM:

- `toScormReport(summary, { passPercent? })` → `{ scoreRaw (0..100), scoreMin, scoreMax, lessonStatus }`.
- `toScormCmiValues(report)` → рядки для `LMSSetValue`. `score.raw` обмежено відрізком 0..100, хоча в Moodle сума балів може бути від'ємною.

## `progress/` — сховище прогресу (схема v2)

- Інтерфейс `ProgressStore` лишився тим самим: `load`, `save`, `clear`, `flush`, `isPersistent`. Реалізації — localStorage, пам'ять і SCORM 1.2 (`scorm-store.ts`).
- **SCORM** (`createScormProgressStore({ activityId, masteryPercent, onNotice })`): API шукається за алгоритмом ADL (`findScormApi`: предки вікна до 7 рівнів, потім `opener`). Увесь стан — у `cmi.suspend_data` (≤ 4096 символів): короткий JSON як є, довгий — `z1:` + base64(deflate), а якщо й так не вміщається — відкидаються найстаріші `recentEventIds` з повідомленням `history-trimmed` (`suspend-data.ts`). Бал `cmi.core.score.raw` = найкращий результат `activities[activityId]` × 100, `lesson_status` — `passed`/`failed` за прохідним балом (перевага в `cmi.student_data.mastery_score` від LMS), без результату — `incomplete`. Кожне `save` одразу робить `LMSCommit`; `terminate` (на `pagehide` через `attachScormLifecycle`) пише `exit = suspend`, `session_time` і `LMSFinish`. Без API або після збою LMS стан живе в пам'яті, а `scormNoticeText(notice)` дає пояснення українською.
- Острови підставляють сховище через `installProgressStore(store)` з `components/progress/client.ts` до першого `getProgressClient()`; сайт цю функцію не викликає.
- **Версія 2** додала `xpLedger` (уже нараховані XP за сутністю), `badges` як запис `{ [id]: { awardedAt } }` (раніше це був масив), `recentEventIds` (останні 100 ID подій) і необов'язкове `activities[id].solvedVariants`.
- Міграція 1 → 2 (`migrate-v1-to-v2.ts`) перевіряє дані за замороженою схемою `schema-v1.ts`, відновлює журнал XP із записаного прогресу, ніколи не зменшує XP і ставить бейджам дату останнього оновлення v1.
- `exportProgressCode(state)` тепер повертає `{ ok: true, code }` або `{ ok: false, error: 'too-large' | 'invalid-state' }`. Повідомлення лежать у `PROGRESS_CODE_EXPORT_ERROR_MESSAGES`.
- `importProgressCode` перевіряє довжину сирого тексту до нормалізації: межа — `MAX_PROGRESS_CODE_INPUT_LENGTH`.
- Якщо запис завеликий, у резервну копію localStorage потрапляє лише маркер `{ truncated, originalLength, prefix }`.

## `gamification/` — XP, рівні, бейджі

```ts
const result = applyLearningEvent(state, { id: 'quiz:t04-training:1757930400000', type: 'quiz-finished', quizId: 't04-training', score: summary.score }, now);
if (result.ok) { store.save(result.value.state); announce(eventOutcomeText(result.value)); }
```

- Типи подій: `topic-read`, `self-check-passed`, `quiz-finished`, `flashcards-reviewed`, `case-completed`, `trainer-completed` (з необов'язковим `variantId`).
- XP за подію (`XP_RULES`): тема — 100, самоперевірка — 20, тест — 150 × найкращий результат, колода карток — 30 × частка засвоєних, кейс — 80 × результат, тренажер — 60 × результат.
- Повтор дає лише приріст понад попередній найкращий результат. Подію з уже обробленим `id` просто ігнорують.
- Рівні `LEVELS` — кар'єрні сходинки операційного менеджменту (0 / 500 / 1200 / 2200 / 3400 XP): стажист дільниці →
  майстер зміни → начальник дільниці → начальник виробництва → директор з операцій. ID мають збігатися з
  `src/lib/player-levels.ts` (статичні заготовки гідруються за `data-level-id`) — цей файл лежить поза `src/engines`
  і оновлюється окремо. `levelProgress(xp)` повертає дані для метра.
- `BADGES` — 13 бейджів із предикатами над станом: по одному на кожен ID з `BADGE_ACTIVITY_IDS` (тренажери цієї
  дисципліни, див. нижче) плюс «Уважний читач» (п'ять прочитаних тем, не прив'язаний до тренажера). Тренажери
  мають надсилати події `trainer-completed` з `activityId` із `BADGE_ACTIVITY_IDS`.
- Тексти: `formatXp`, `xpGainText`, `nextLevelText`, `levelPositionText`, `badgesEarnedText`, `newBadgesText`, `eventOutcomeText`.

## Як додати тренажер

Контракт для нового тренажера не залежить від дисципліни:

1. Чистий модуль рушія (без DOM і React) у `src/engines/<name>/`: типи, `Result`-функції для перевірки
   відповіді, за потреби — генератор варіантів на `RandomSource` (`shared/random.ts`) і функція ID активності
   за зразком `matrixActivityId` (`matrix/events.ts`).
2. React-острів у `src/components/trainers/`: каркас режиму «Задача» — `ui/TaskShell.tsx` +
   `ui/use-trainer-task.ts`, поля — `ui/fields.tsx`, спільні блоки — `ui/parts.tsx` (`SourceNotes` /
   `SourceRefLink` для джерел і формул із перевіреною датою, `CheckParts` для розбору за частинами).
3. Активність — запис у `BADGE_ACTIVITY_IDS` і бейдж з предикатом у `src/engines/gamification/badges.ts`.
4. Реєстрація — запис у `CALCULATOR_TRAINERS` (власна сторінка `trenazhery/<slug>/`) або `PRACTICAL_TRAINERS`
   (сторінка практичної) в `src/components/trainers/catalog.ts`, плюс підпис у `TRAINER_KIND_LABELS`.
5. `practicals[].trainers` у `content/course.yaml` — ID реєстру тренажера при потрібній практичній.
6. За потреби — пакет SCORM: новий literal `ScormPackageKind` і `*PackageData extends PackageBase` у
   `tools/export/scorm/app/data.ts`, функція специфікації в `tools/export/scorm/catalog.ts`, острів-точка входу
   `tools/export/scorm/app/<kind>-entry.tsx` (за зразком `matrix-entry.tsx`).

Активності цієї дисципліни вже зарезервовано в `BADGE_ACTIVITY_IDS`, тренажерів під них ще не написано:
`little-law`, `production-cycle`, `line-balancing`, `forecasting`, `eoq`, `mrp`,
`aggregate-planning`, `sequencing`.
`productivity`, `cpm-pert`, `control-charts`, `process-capability` описано нижче.

## `productivity/` — калькулятор продуктивності операційної системи

Еталонний приклад тренажера «Задача» (не матриці): дані — `content/practicals/p01.yaml` →
`trainer.tasks` (список типів розрахунку з формулою, посиланням на formula-baseline і, для часткової
продуктивності, назвою ресурсу). Схема контенту — дискримінований варіант `calculation-tasks`
(`src/content/schemas/practical.ts`), реюзабельний для інших калькуляторів: `method` — вільний рядок,
який трактує лише конкретний тренажер, тому рушій сам звіряє його з відомими собі методами
(`toProductivityTaskChoices`, `src/components/trainers/model/productivity.ts`) і кидає помилку на
невідомий — контентна помилка, а не тиха відмова.

```ts
const variant = createProductivityVariant(random, [{ method: 'partial-productivity', resource: 'labor' }, { method: 'capacity-usage' }]);
// variant.given — вихідні дані для фабули, variant.answers — поля з expected/tolerance, variant.solution — розбір
const check = checkProductivityTask(variant, { p1: '2,5', p2: '3' });     // model/productivity.ts: checkNumberPart + combineParts на answers
```

- `partialProductivity`, `multifactorProductivity`, `productivityIndex`, `capacityUsage`, `capacityEfficiency` —
  формули PROD-01, PROD-02, PROD-03, CAP-01, CAP-02; усі повертають `Result` з кодом (`negative-value`,
  `non-positive-denominator`, `empty-resources`, `period-mismatch`).
- `createProductivityVariant(random, tasks)` — один варіант на випадково обраний метод із переданого пулу;
  числа підбираються «в охайний, але не очевидний результат» (ратіо конструюється назад від чистого
  дробу), а не навпаки, тож розв’язок завжди рахується без нескінченних дробів.
- React-острів `ProductivityTrainer.tsx` на каркасі `ui/TaskShell.tsx` + `ui/use-trainer-task.ts` — це і є
  контракт «Як додати тренажер» вище, застосований уперше; наступні 11 калькуляторів повторюють ту саму
  форму (свій `src/engines/<name>/`, свій `model/<name>.ts`, свій React-острів, свій варіант схеми).

## `cpm-pert/`, `control-charts/`, `process-capability/` — сітьове планування і контроль якості (практична 7)

Три тренажери практичної 7 ділять один контентний файл — `content/practicals/p07.yaml` →
`trainer.tasks` (`kind: calculation-tasks`); кожен острів фільтрує собі лише відомі йому методи
(`toCpmPertTaskChoices` / `toControlChartTaskChoices` / `toProcessCapabilityTaskChoices`,
`src/components/trainers/model/*.ts`) і мовчки ігнорує чужі.

- `cpm-pert/` — прямий і зворотний прохід (PRJ-01, PRJ-02, `computeNetwork`), повний і вільний резерв
  (PRJ-03, PRJ-09), критичний шлях (PRJ-04); PERT: очікуваний час і дисперсія роботи (PRJ-05, PRJ-06),
  Z = (D − TE) / σ, округлений до 0,01 як у лекції (PRJ-07), Φ(Z) — наближення Абрамовіца — Стігана
  (похибка до 7,5·10⁻⁸, `standardNormalCdf`). Топологія мережі фіксована — та сама, що в прикладі
  лекції теми 7. `computePertProject` сумує дисперсії всіх робіт з нульовим резервом, тож коректний
  лише для мережі з одним критичним шляхом; генератор PERT-варіантів перетягує оцінки, доки гілки
  за te не розійдуться.
- `control-charts/` — x̄-R (QC-01, `xbarRLimits`) і p-карта (QC-02, `pChartLimits`, LCL обрізається
  до 0). Константи A2, D3, D4 для n = 2..10 (`constants.ts`) — стандартна таблиця SPC; базою курсу вони
  не підтверджені (formula-baseline.md, «Не підтверджено», п. 2).
- `process-capability/` — Cp (QC-04) і Cpk (QC-05); середнє генератор тримає всередині поля допуску.

## `matrix/` — тренажер-матриця практичних

Дані — `content/practicals/pNN.yaml` → `trainer` (моделі, ознаки, клітинки з поясненням і джерелом, завдання «визнач модель»).

```ts
let session = startMatrixSession({ matrix, seed: `p01:${Date.now()}:0`, now });   // спроба 1 — навчальна
let attempt = currentAttempt(session);
attempt = unwrap(selectModel(attempt, matrix, itemId, 'model-a'));                  // null — зняти вибір
attempt = unwrap(checkFeature(attempt, matrix, featureId));                          // лише навчальна: фіксує ознаку, відкриває розбір
session = replaceCurrentAttempt(session, unwrap(finishMatrixAttempt(attempt, matrix, now)));
session = unwrap(startGradedAttempt(session, matrix, now));                          // спроба 2 — оцінювана, інше перемішування
const summary = summarizeMatrixAttempt(finished, matrix);                            // right, total, share, за ознаками й моделями
const mark = rubricMark(unwrap(rubricBandsFromLevels(criterion.levels)), summary.right, summary.total);
const event = matrixCompletedEvent(finished, summary, 'p01');                        // trainer-completed, activityId p01-model-matrix
```

- `reviewItem` до розкриття (навчальна — до перевірки ознаки, оцінювана — до завершення) не повертає правильної моделі й пояснення; `attemptProgress` рахує правильні лише серед розкритих.
- Пропуски в оцінюваній спробі — неправильні. Помилки користувача — `Result` з повідомленням з `MATRIX_ERROR_MESSAGES`.
- Поріг рубрики читається з опису рівня реєстру («не менше 90%», «60–89%»); межа включна й без похибки округлення (`right·100 ≥ min·total`).
- `gradeCompanyTask(task, matrix, { model, features })`: рівно дві ознаки; `right` / `partial` (модель правильна, ознаки не ключові) / `wrong`, з формулюваннями ключових ознак для правильної моделі.
- Тексти для `aria-live`: `featureCheckText`, `matrixSummaryText`, `recordedResultText`, `itemStateLabel`.

## `simulations/`

Рушії симуляцій — механіка без прив'язки до дисципліни; конкретний сценарій (запитання, наслідки, тексти)
приходить ззовні. Наразі без тренажера-споживача в цьому курсі — підключаються за контрактом вище, коли
з'явиться сценарій операційного менеджменту (наприклад, аукціон виробничих потужностей чи кейс-гра з рішеннями
диспетчера).

### `auction/` — аукціон заявок

- `clearCallAuction(orders, { referencePrice })` → ціна, обсяг, таблиця рівнів, крок правила вибору ціни (`decidedBy`) і виконання заявок.
- Раунди гри: `startAuctionGame`, `submitOrder` (резервує кошти й акції), `withdrawOrder`, `clearRound`, `nextRound`.
- `roundSummaryText(record)` дає текст для `aria-live`.

### `board-game/` — кейс-гра з рішеннями

- Граф: вузли-рішення з наслідками для `trust`, `value`, `risk` і умовними переходами, плюс фінали `best`, `good`, `poor`.
- `validateBoardGame(game)` перевіряє старт, цілі переходів, досяжність, тупики й цикли без виходу.
- Гра: `startBoardGame`, `chooseOption` (повертає новий стан, `feedback` і фактичні `effects`), `gameScore` (1 / 0,6 / 0,2), `metricsText` для скрінрідерів.
- `serializeGameState` / `restoreGameState` зберігають лише вибори (≤ 4000 символів, вміщується в `cmi.suspend_data`). Метрики відтворюються повторним проходженням, тому підробити їх не можна.

## Тести

`npm test`, `npm run test:coverage`. Покриття `src/engines/**` — щонайменше 80% рядків і гілок. Тести пишуться за AAA, фікстури лежать у `__fixtures__/`.
