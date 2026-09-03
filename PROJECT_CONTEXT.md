# PROJECT_CONTEXT.md

## 1. Назначение проекта

Веб-приложение для преподавателя японского языка и его учеников.

Основной сценарий:

**Teacher:** создаёт курс → создаёт уроки → заполняет теорию → создаёт
практику → получает работы учеников → проверяет → оставляет комментарии.

**Student:** открывает доступные курсы → проходит урок → читает теорию →
решает практику → отправляет работу → после проверки видит комментарии
учителя.

Дополнительная игровая механика --- коллекционная гача с карточками.

Проект уже существует и содержит значительную часть функционала. **Не
начинать реализацию заново, пока не изучен существующий код.**

------------------------------------------------------------------------

## 2. Технологии

Frontend: - Vite - React - TypeScript - React Router - Tailwind CSS -
Prettier

Backend: - Supabase - Supabase Auth - PostgreSQL - Row Level Security -
Supabase Storage - PostgreSQL RPC functions

Разработка ведётся преимущественно через Cursor.

Главный принцип: сначала изучить существующую архитектуру и
переиспользовать её. Не добавлять новую библиотеку, если задача
нормально решается текущим стеком.

------------------------------------------------------------------------

## 3. Роли и доступ

Основные роли: - `student` - `teacher`

Профиль пользователя хранится в `profiles`.

Для защиты маршрутов существуют: - `ProtectedRoute` - `TeacherRoute`

Teacher имеет доступ к teacher routes. Student не должен получать доступ
к teacher-функциональности.

------------------------------------------------------------------------

## 4. Основные маршруты

На момент последней работы `src/shared/config/routes.ts` содержал
примерно:

``` ts
export const routes = {
  home: '/',
  register: '/register',
  login: '/login',

  teacherCourses: '/teacher/courses',
  teacherCreateCourse: '/teacher/courses/create',
  teacherEditCourse: '/teacher/courses/:courseId/edit',

  teacherCourseLessons: '/teacher/courses/:courseId/lessons',
  teacherCreateLesson: '/teacher/courses/:courseId/lessons/create',
  teacherEditLesson: '/teacher/courses/:courseId/lessons/:lessonId/edit',
  teacherLessonPractice: '/teacher/courses/:courseId/lessons/:lessonId/practice',

  teacherGachaCards: '/teacher/courses/:courseId/gacha/cards',

  courses: '/courses',
  course: '/courses/:courseId',
  lesson: '/courses/:courseId/lessons/:lessonId',

  courseGacha: '/courses/:courseId/gacha',
  courseCollection: '/courses/:courseId/collection',
  lessonResults: '/courses/:courseId/lessons/:lessonId/results',

  teacherLessonSubmissions:
    '/teacher/courses/:courseId/lessons/:lessonId/submissions',

  teacherLessonSubmissionReview:
    '/teacher/courses/:courseId/lessons/:lessonId/submissions/:submissionId',
} as const;
```

**Всегда проверить актуальный файл перед изменениями.**

------------------------------------------------------------------------

## 5. Курсы и уроки

Teacher уже умеет: - создавать курсы; - редактировать курсы; - создавать
уроки; - редактировать уроки; - добавлять теорию; - добавлять
практические задания.

Student умеет: - смотреть список доступных курсов; - открывать курс; -
смотреть уроки; - открывать урок.

Основная цепочка:

`CoursesPage → CoursePage → LessonPage`

Teacher:

`TeacherCoursesPage → TeacherCourseLessonsPage → Create/Edit Lesson`

------------------------------------------------------------------------

## 6. Теория урока

Теория хранится в Markdown (`theoryMarkdown` / соответствующее DB-поле).

Поддержана вставка изображений. Изображения загружаются в Supabase
Storage, после чего URL вставляется в Markdown.

Ранее был реализован удобный сценарий вставки изображения, включая
работу с изображением из clipboard.

**При изменениях не ломать существующую Markdown/image систему.**

------------------------------------------------------------------------

## 7. Практические задания

Типы:

``` ts
export type LessonPracticeItemType =
  | 'multiple_choice'
  | 'input'
  | 'textarea';
```

Актуальная модель была примерно такой:

``` ts
export type LessonPracticeItem = {
  id: string;
  lesson_id: string;
  type: LessonPracticeItemType;
  question: string;
  options: string[] | null;
  correct_answer: string | string[];
  explanation: string | null;
  image_url: string | null;
  order_index: number;
  created_at: string;
};
```

Проверить актуальные типы в репозитории.

### `multiple_choice`

Teacher задаёт: - вопрос; - варианты; - правильный ответ; -
необязательное пояснение; - необязательную картинку.

Student выбирает один вариант. Ответ автоматически проверяется.

### `input`

Короткий текстовый ответ.

Правильных вариантов может быть несколько. Например, для японского слова
допустимы:

``` text
行く
いく
```

Teacher вводит их одной строкой:

``` text
行く; いく
```

Поддерживается и японская точка с запятой:

``` text
行く；いく
```

В БД эту строку специально не превращаем в массив. Разбор выполняется на
student-side:

``` ts
correctAnswer.split(/[;；]/)
```

Перед сравнением ответы нормализуются: - `trim`; - `lowercase`; -
повторяющиеся пробелы схлопываются.

Это сознательное решение.

### `textarea`

Свободный развёрнутый ответ: - сочинение; - перевод; - письменное
задание.

У него нет обязательного `correct_answer`. Он не проходит автоматическую
проверку. Teacher проверяет вручную и оставляет комментарий.

------------------------------------------------------------------------

## 8. Изображение в практическом задании

К вопросу можно прикрепить **одно необязательное изображение**.

DB:

``` sql
alter table public.lesson_practice_items
add column if not exists image_url text null;
```

Storage bucket:

``` text
practice-item-images
```

Teacher: - выбирает изображение; - оно загружается в Storage; - получает
preview; - может удалить/заменить; - URL сохраняется в `image_url`.

Student-side порядок элементов:

1.  номер задания;
2.  вопрос;
3.  изображение;
4.  варианты ответа / input / textarea.

То есть изображение находится **между вопросом и полем ответа**.

Картинка также должна отображаться: - при teacher review; - на student
results page.

------------------------------------------------------------------------

## 9. Домашние работы / submissions

Для ручной проверки введена система submissions.

Исходная схема была:

``` sql
create table public.lesson_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  status text not null default 'draft',
  submitted_at timestamptz null,
  reviewed_at timestamptz null,
  reviewed_by uuid null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lesson_submission_answers (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.lesson_submissions(id) on delete cascade,
  practice_item_id uuid not null references public.lesson_practice_items(id) on delete cascade,
  answer_text text null,
  is_auto_correct boolean null,
  teacher_comment text null,
  teacher_score text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (submission_id, practice_item_id)
);
```

Схема могла позднее измениться. **Проверять актуальную БД/migrations.**

### Submission flow

Student: 1. проходит практику; 2. ответы сохраняются; 3. отправляет
работу; 4. submission получает статус `submitted`; 5. teacher получает
работу; 6. student видит «На проверке».

Teacher: 1. открывает список работ урока; 2. выбирает submission; 3.
видит каждый вопрос; 4. видит изображение вопроса, если оно есть; 5.
видит ответ ученика; 6. для автоматически проверяемого задания видит
результат; 7. оставляет `teacher_comment` каждому ответу; 8. отправляет
результат ученику; 9. submission становится `reviewed`.

Student после проверки: 1. видит, что урок проверен; 2. получает кнопку
«Узнать результаты»; 3. открывает отдельный `LessonResultsPage`; 4.
видит вопрос, изображение, свой ответ, правильный ответ для auto-check,
результат auto-check, комментарий teacher и explanation.

------------------------------------------------------------------------

## 10. Важный нюанс Supabase relation

В `getLessonSubmissionById` была проблема.

Supabase relation `lesson_practice_items` могла
возвращаться/типизироваться как объект или массив:

``` ts
PracticeItemRow | PracticeItemRow[] | null
```

Из-за ожидания только массива ответы отбрасывались, и teacher видел
submission без заданий.

Была введена нормализация:

``` ts
const getPracticeItemFromRelation = (
  relation: PracticeItemRow | PracticeItemRow[] | null,
): PracticeItemRow | null => {
  if (!relation) {
    return null;
  }

  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
};
```

Не возвращать старую реализацию вида:

``` ts
row.lesson_practice_items?.[0]
```

без проверки формы relation.

------------------------------------------------------------------------

## 11. Student results RPC

Использовалась функция:

``` text
get_my_lesson_results(uuid)
```

Она была расширена полем `image_url`.

PostgreSQL не позволил использовать `CREATE OR REPLACE`, потому что
изменился `RETURNS TABLE`, поэтому функция удалялась перед
пересозданием:

``` sql
drop function if exists public.get_my_lesson_results(uuid);
```

При работе с RPC сначала посмотреть её актуальную сигнатуру.

------------------------------------------------------------------------

## 12. RLS и безопасность

На ранней стадии разработки RLS был отключён почти на всех таблицах,
потому что мешал тестированию.

Перед production мы вернулись к RLS, настроили политики и проверили
основные сценарии. Ошибок при базовом тестировании обнаружено не было.

**Не отключать RLS глобально ради удобства разработки.**

Особенно проверить:

Student: - не может читать submissions другого student; - не может
менять teacher comments; - не может читать teacher-only данные; -
работает только со своими submissions.

Teacher: - может читать необходимые работы учеников; - может писать
comments; - может переводить submission в `reviewed`.

Storage также должен иметь соответствующие policies.

------------------------------------------------------------------------

## 13. AppLayout / Navbar

Последняя крупная UI-задача перед паузой --- общая верхняя навигация
внутри `AppLayout`.

План:

``` text
[logo] [temporary app name]          Курсы | Учительская панель | Выход
```

Логотип пока может быть квадратом-заглушкой, название временное.

Все authenticated страницы используют `AppLayout`.

`HomePage` предполагается публичной и может не использовать `AppLayout`,
поэтому внутри navbar не требуется отдельный anonymous UI.

Кнопки для всех: - Курсы - Выход

Дополнительно для teacher: - Учительская панель

После переноса Logout в AppLayout необходимо удалить дублирующиеся
`LogoutButton` и глобальные ссылки со страниц.

Эта чистка, вероятно, ещё не была закончена.

------------------------------------------------------------------------

## 14. Back navigation

Есть отдельное UX-требование: **с любой вложенной страницы пользователь
должен иметь понятный путь назад**.

Примеры:

`Lesson → Course`

`Course → Courses`

`Teacher lesson → Teacher course lessons`

Есть/планировался общий `BackButton` с fallback route.

Navbar не заменяет эту механику: - navbar = глобальная навигация; -
BackButton = контекстный возврат.

------------------------------------------------------------------------

# ГАЧА

## 15. Текущее состояние

Гача пока не закончена.

Маршруты уже существуют:

Teacher:

``` text
/teacher/courses/:courseId/gacha/cards
```

Student:

``` text
/courses/:courseId/gacha
/courses/:courseId/collection
```

Существуют/существовали: - `TeacherGachaCardsPage` - `GachaPage` -
`GachaCollectionPage`

На `CoursePage` были кнопки: - «Открыть гачу» - «Моя коллекция»

Была идея тестовой SQL-функции `add_test_pulls`, но она сознательно не
была добавлена, потому что механика гачи ещё не закончена.

------------------------------------------------------------------------

## 16. Концепция гача-карточки

Это актуальное продуктовое решение.

Карточка **односторонняя**.

У неё есть: - `title`; - `description`; - `rarity`; - `image`; -
`frame`.

В коллекции `description` не показывается.

Коллекция представляет собой сетку визуальных карточек.

При клике:

``` text
collection
    ↓
click card
    ↓
card enlarges / modal opens
    ↓
full card + information
```

В увеличенном состоянии показывается полная информация, включая
description.

------------------------------------------------------------------------

## 17. Изображение + рамка редкости

Предпочтительный вариант: **teacher НЕ собирает готовый PNG вручную в
Photoshop.**

Teacher: 1. загружает обычную иллюстрацию; 2. выбирает rarity.

Frontend автоматически подставляет нужную рамку.

Пример архитектуры:

``` ts
const rarityFrames = {
  common: '/gacha/frames/common.png',
  rare: '/gacha/frames/rare.png',
  epic: '/gacha/frames/epic.png',
  legendary: '/gacha/frames/legendary.png',
};
```

**Список rarity выше --- только пример, не окончательно утверждённая
модель.**

Визуально карточка собирается слоями:

``` tsx
<div className="relative aspect-[2/3]">
  <img src={card.image_url} />
  <img src={rarityFrames[card.rarity]} />
</div>
```

Frame --- прозрачный PNG поверх изображения.

Не генерировать отдельный склеенный PNG для каждой карточки без
необходимости.

Преимущества: - teacher только загружает art; - смена rarity
автоматически меняет frame; - можно заменить дизайн одной rarity сразу
для всех карточек; - исходная иллюстрация независима от рамки.

### Требования к frames

Все rarity frames должны иметь: - одинаковый canvas size; - одинаковое
aspect ratio; - одинаковое положение окна изображения; - одинаковую
геометрию.

Например, условно:

``` text
1000 × 1500
```

Размер пока не считать окончательно утверждённым.

Для MVP изображение можно размещать через:

``` css
object-fit: cover;
```

В будущем можно добавить: - crop; - zoom; - position adjustment.

Это не обязательно для первой версии.

------------------------------------------------------------------------

## 18. Предпочтительная модель GachaCard

Пример:

``` ts
type GachaCard = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  rarity: GachaRarity;
  image_url: string;
};
```

Не хранить `frame_url` на каждой карточке, если frame однозначно
определяется rarity.

Frame лучше считать частью frontend design system:

``` text
rarity = rare
→ automatically use rare.png
```

Перед реализацией проверить существующую таблицу gacha cards. Если
структура уже есть --- мигрировать/расширить существующую, а не
создавать параллельную.

------------------------------------------------------------------------

## 19. Монеты / pulls

Была идея игровой валюты для гачи.

Визуальная концепция монеты: - одна монета; - минималистичная; - без
отверстия.

Однако экономика пока **не зафиксирована**.

Не считать решёнными: - стоимость pull; - способы получения монет; -
количество pulls; - pity; - duplicate compensation; - rarity
probabilities; - награда за завершение урока; - возможность иметь
несколько копий одной карты.

Перед реализацией этих правил спросить пользователя.

------------------------------------------------------------------------

## 20. Что нельзя додумывать

Если в коде/БД нет подтверждения, спросить пользователя перед
продуктовым решением.

Особенно не утверждены: - окончательный список rarity; - drop rates; -
стоимость pull; - pity; - поведение duplicate cards; - способы получения
валюты; - окончательный визуальный дизайн frames; - правила открытия
gacha.

------------------------------------------------------------------------

## 21. UX-принципы

Проект рассчитан примерно на 10--20 пользователей.

Приоритет: 1. надёжность; 2. простота для teacher; 3. понятный student
flow; 4. минимальное количество ручных действий; 5. затем visual polish.

Teacher не должен: - использовать Photoshop для каждой карточки; -
вручную выполнять технические действия, которые можно
автоматизировать; - вручную формировать сложные ссылки/Markdown для
обычного наполнения.

------------------------------------------------------------------------

## 22. Стиль разработки и общения с пользователем

При изменении кода:

-   Если меняется существенная часть компонента --- предпочтительно
    давать **полный готовый файл**.
-   Если изменение локальное --- дать точный готовый фрагмент и указать
    место вставки.
-   Не показывать сначала десяток отдельных изменений, а затем повторять
    полный файл.
-   Если для корректного решения не хватает существующего кода ---
    сначала запросить нужные файлы.
-   Не угадывать структуру проекта.

Для SQL: - сразу давать готовый выполняемый запрос; - не расписывать
сначала каждую строку, а потом дублировать полный SQL.

------------------------------------------------------------------------

## 23. Правила работы Cursor Agent

Перед любой крупной задачей:

1.  Найти связанные файлы.
2.  Прочитать существующие типы.
3.  Прочитать API.
4.  Проверить routes.
5.  Проверить существующие Supabase migrations/schema.
6.  Найти все usages изменяемого типа/поля.
7.  Только после этого предлагать изменения.

Не создавать параллельную архитектуру рядом с существующей.

Если `GachaCard`, submission API, upload helper или UI component уже
существует --- расширить существующий.

**Не переписывать работающие части приложения только ради
стилистического рефакторинга.**

------------------------------------------------------------------------

## 24. Что сделать первым после возвращения к проекту

Не начинать сразу новую фичу.

### Phase 1 --- Repository audit

Сначала изучить весь репозиторий и сопоставить его с этим документом.

Проверить: - структуру `src`; - routes; - auth; - роли; - Supabase
integration; - существующие migrations; - Storage; - lesson practice; -
submissions; - gacha; - AppLayout.

Этот документ отражает решения предыдущей разработки, но код является
источником истины относительно того, что фактически реализовано.

### Phase 2 --- Build

Запустить существующие команды:

``` bash
npm install
npm run dev
```

Также, если scripts существуют:

``` bash
npm run lint
npm run typecheck
npm run build
```

Исправить compile/type errors до продуктовой разработки.

### Phase 3 --- Existing flows

Проверить Teacher:

-   login;
-   courses;
-   lessons;
-   Markdown;
-   theory images;
-   practice CRUD;
-   practice image upload;
-   submissions;
-   review;
-   comments.

Проверить Student:

-   login;
-   courses;
-   lesson;
-   practice;
-   multiple correct input answers;
-   textarea;
-   submit;
-   results.

### Phase 4 --- Security

Проверить RLS и Storage policies двумя разными аккаунтами.

### Phase 5 --- Navbar

Проверить текущий `AppLayout` и закончить удаление локальных
`LogoutButton` / дублирующей глобальной навигации.

### Phase 6 --- Gacha

После стабилизации основного MVP продолжить gacha.

Первой задачей по gacha предпочтительно сделать reusable:

``` text
GachaCard
```

Компонент должен уметь: - принять image; - принять rarity; -
автоматически выбрать frame; - показать title; - работать в нескольких
размерах; - использоваться в collection и modal.

Затем:

`Teacher card editor → Collection → Card modal → Pull mechanics`

------------------------------------------------------------------------

## 25. Текущая продуктовая цель

Получить стабильный production MVP.

Teacher: - создаёт учебный материал; - управляет курсами и уроками; -
создаёт практику; - проверяет работы.

Student: - проходит материал; - выполняет задания; - отправляет
работу; - получает обратную связь.

Gacha --- дополнительный engagement layer и не должна ломать основной
learning flow.

**Сначала стабильный learning flow, затем законченная gacha.**

------------------------------------------------------------------------

# INITIAL TASK FOR CURSOR AGENT

После прочтения этого файла агент должен **сначала провести аудит,
ничего не изменяя**.

Задача:

> Прочитай `PROJECT_CONTEXT.md` и самостоятельно изучи весь репозиторий.
>
> Пока ничего не изменяй.
>
> Сопоставь этот документ с фактическим состоянием проекта.
>
> Найди: 1. текущую архитектуру и структуру `src`; 2. реализованные
> teacher/student flows; 3. текущие Supabase API/RPC/Storage
> integrations; 4. состояние lesson submissions и review flow; 5.
> состояние AppLayout/navbar; 6. всё, что уже реализовано по gacha; 7.
> TODO, недоделанные или подозрительные места; 8. расхождения между
> `PROJECT_CONTEXT.md` и реальным кодом; 9. TypeScript/lint/build
> проблемы, если они есть.
>
> После анализа составь короткий отчёт: - Что уже работает - Что
> реализовано частично - Что отсутствует - Что сломано или сомнительно -
> Что из `PROJECT_CONTEXT.md` устарело - В каком порядке лучше
> продолжать разработку
>
> Не рефактори код и не создавай новые файлы до подтверждения
> пользователя.
