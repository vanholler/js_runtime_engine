# JS Play (Electron + Vite + Vue)

Небольшой десктоп‑инструмент для экспериментов с JavaScript-кодом:
- Редактор кода на базе Monaco.
- Быстрый запуск через Vite + Electron.
- Парсинг AST (Esprima) и вычисление значений (Escodegen) с отображением глобального состояния в `json-viewer`.

## Стек
- Electron ^34 (electron-forge)
- Vite ^5
- Vue ^3
- Monaco Editor
- Esprima / Escodegen
- vue-json-viewer
- Prism.js / highlight.js

## Требования
- Node.js LTS
- npm (или pnpm/yarn)

## Установка
```bash
npm install
```

## Команды
- Запуск в dev-режиме:
```bash
npm run start
```

- Сборка пакета приложения:
```bash
npm run package
```

- Создание инсталлятора/дистрибутива (для вашей ОС):
```bash
npm run make
```

- Публикация (если настроено):
```bash
npm run publish
```

- Линт (заглушка):
```bash
npm run lint
```

## Что внутри
- `Monaco` для редактирования кода.
- Разбор кода в AST (`esprima`), генерация и вычисление выражений (`escodegen`).
- Отображение глобального состояния и метрик выполнения в `vue-json-viewer`.
- Готово к упаковке в настольное приложение через `electron-forge`.

## Лицензия
MIT