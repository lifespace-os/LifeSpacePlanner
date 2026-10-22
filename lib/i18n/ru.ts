import type { en } from "@/lib/i18n/en"

/** Every interface word in Russian. It must have every key the English list has. */
export const ru: Record<keyof typeof en, string> = {
  // common
  "common.cancel": "Отмена",
  "common.working": "Подождите…",
  "common.remove": "Удалить",
  "common.close": "Закрыть",
  "common.save": "Сохранить",
  "common.delete": "Удалить",
  "common.enterTime": "Введите время.",
  "common.localTime": "Местное время.",

  // header and menus
  "nav.whiteboard": "Доска",
  "nav.kanban": "Канбан",
  "nav.dashboard": "Дашборд",
  "nav.settings": "Настройки",
  "nav.main": "Главное меню",
  "nav.views": "Виды",
  "nav.tagline": "Планировщик кайдзен",
  "nav.saving": "Сохранение",
  "nav.saved": "Сохранено",
  "nav.saveError": "Не удалось сохранить",
  "nav.saveConflict": "Данные изменились в другой вкладке. Перезагрузите, чтобы увидеть последние.",
  "view.calendar": "Календарь",
  "view.gantt": "Диаграмма Ганта",
  "view.life-in-weeks": "Жизнь в неделях",
  "view.todo-list": "Список дел",

  // built-in themes
  "theme.morning-paper": "Утренняя бумага",
  "theme.daylight": "Дневной свет",
  "theme.warm-noon": "Тёплый полдень",
  "theme.dusk": "Сумерки",
  "theme.evening": "Вечер",
  "theme.night": "Ночь",
  "theme.late-night": "Глубокая ночь",

  // settings
  "settings.title": "Настройки",
  "settings.footer":
    "Ваши карточки хранятся в файле на этом компьютере: ~/Library/Application Support/LifeSpace Planner/workspace.json. Аккаунта нет.",
  "settings.language.title": "Язык",
  "settings.language.help":
    "Меняет слова интерфейса, а также даты и время. Ваши собственные слова остаются как вы их написали, как и каждый хештег.",
  "settings.language.group": "Язык интерфейса",
  "settings.theme.title": "Тема",
  "settings.theme.help":
    "Меняет цвета приложения. Цвета карточек на доске не меняются, а экспорт Дашборда всегда светлый.",
  "settings.theme.light": "Светлые",
  "settings.theme.dark": "Тёмные",
  "settings.theme.loaded": "Загруженные",
  "settings.theme.follow": "Следовать времени суток",
  "settings.theme.showingNow": "Сейчас показана тема «{name}». Пока приложение открыто, оно меняет тему в эти часы, а при запуске выбирает подходящую.",
  "settings.theme.day": "День",
  "settings.theme.evening": "Вечер",
  "settings.theme.dayTheme": "Дневная тема",
  "settings.theme.eveningTheme": "Вечерняя тема",
  "settings.theme.startsAt": "Начинается в",
  "settings.theme.sameTimes": "Оба времени совпадают, поэтому дневная тема остаётся весь день.",
  "settings.theme.followNote":
    "Если выключить, останется текущая тема. Это не связано с ежедневным напоминанием, а смена темы не отправляет уведомлений.",
  "settings.theme.fileHelp": "Файл темы перечисляет десять цветов интерфейса по именам, каждый в виде hex-цвета. «Скачать тему» сохраняет тему «{name}», которая сейчас включена.",
  "settings.theme.download": "Скачать тему",
  "settings.theme.load": "Загрузить тему",
  "settings.theme.chooseFile": "Выберите файл темы",
  "settings.theme.loadedList": "Загруженные темы",
  "settings.theme.darkTag": " (тёмная)",
  "settings.theme.lightTag": " (светлая)",
  "settings.theme.removeNamed": "Удалить тему «{name}»",
  "settings.theme.saved": "Тема «{name}» сохранена как {file}.",
  "settings.theme.tooLarge": "Этот файл слишком большой для темы, поэтому ничего не загружено.",
  "settings.theme.limit": "Можно хранить не более {max} загруженных тем. Сначала удалите одну, затем загрузите файл снова.",
  "settings.theme.loadedMsg": "Тема «{name}» загружена. Выберите её в списке выше.",
  "settings.theme.updatedMsg": "Тема «{name}» обновлена. Выберите её в списке выше.",
  "settings.theme.removedMsg": "Тема «{name}» удалена.",
  "settings.theme.err.notTheme": "Этот файл не является темой, поэтому ничего не загружено.",
  "settings.theme.err.noName": "В файле темы нет названия, поэтому ничего не загружено.",
  "settings.theme.err.noColors": "В файле темы нет цветов, поэтому ничего не загружено.",
  "settings.theme.err.badColor": "Цвет «{color}» отсутствует или не является hex-цветом вроде #2f5d50, поэтому тема не загружена.",
  "settings.theme.err.faintInk": "Чернила слишком бледные для чтения на фоне «{surface}» ({ratio} к 1, нужно не меньше {min} к 1), поэтому тема не загружена.",
  "settings.theme.err.notJson": "Этот файл не является корректным JSON, поэтому ничего не загружено.",
  "settings.theme.surface.board": "доска",
  "settings.theme.surface.card": "карточка",
  "settings.theme.surface.desk": "стол",

  "settings.sample.title": "Пример истории",
  "settings.sample.show": "Показывать пример истории",
  "settings.sample.help": "Если выключить, доска и канбан будут пустыми.",
  "settings.sample.putBackTitle": "Вернуть пример истории?",
  "settings.sample.putBackConfirm": "Заменить примером",
  "settings.sample.putBackBody":
    "Карточки, которые вы написали на доске и в канбане, будут заменены примером истории. Сначала скачайте резервную копию, если хотите их сохранить.",
  "settings.sample.emptyTitle": "Очистить доску?",
  "settings.sample.emptyConfirm": "Очистить доску",
  "settings.sample.emptyBody":
    "Будут удалены все карточки доски и задачи канбана, включая те, что вы написали. Сначала скачайте резервную копию, если хотите их сохранить.",

  "settings.backup.title": "Резервная копия",
  "settings.backup.help": "Скачайте свои карточки как файл JSON или загрузите его обратно.",
  "settings.backup.download": "Скачать JSON",
  "settings.backup.load": "Загрузить файл JSON",
  "settings.backup.chooseFile": "Выберите файл резервной копии JSON",
  "settings.backup.notJson": "Этот файл не является корректным JSON, поэтому ничего не загружено.",
  "settings.backup.nothingLoaded": "{reason} Ничего не загружено.",
  "settings.backup.confirmTitle": "Загрузить эту копию?",
  "settings.backup.confirmLabel": "Заменить мои карточки",
  "settings.backup.confirmBody":
    "В файле карточек доски: {notes}, задач канбана: {tasks}. Загрузка заменит всё, что сейчас на доске и в канбане.",

  "settings.life.title": "Жизнь в неделях",
  "settings.life.birth": "Дата рождения",
  "settings.life.birthError": "Введите дату, которая не в будущем.",
  "settings.life.years": "Лет в сетке",
  "settings.life.yearsError": "Введите целое число от {min} до {max}.",

  "settings.nudge.title": "Ежедневное напоминание",
  "settings.nudge.help": "Одно системное уведомление утром и одно вечером, по разу в день.",
  "settings.nudge.morning": "Утро",
  "settings.nudge.evening": "Вечер",
  "settings.nudge.morningTime": "Утреннее время",
  "settings.nudge.eveningTime": "Вечернее время",
  "settings.nudge.shows": "Показывает «{title}».",
  "settings.nudge.allow": "Разрешить уведомления",
  "settings.nudge.needsPermission": "Приложению нужно ваше разрешение, чтобы их показывать.",
  "settings.nudge.blocked": "Уведомления для этого приложения заблокированы, поэтому они не появятся. Разрешите их в настройках системы или браузера.",
  "settings.nudge.unsupported": "Это окно не умеет показывать системные уведомления.",

  // notifications
  "nudge.morning": "Спланируйте сегодня",
  "nudge.evening": "Спланируйте завтра",

  // END
}
