    // // Сохраняем оригинальные методы console
    // const originalConsole = { ...console };

    // // Объект для хранения переменных
    // let globalScope = {};

    // // Переопределяем методы console
    // function overrideConsoleMethods() {
    //     const outputElement = document.getElementById('console-output');

    //     // Функция для добавления сообщения в console-output
    //     function addOutput(message, className) {
    //         const line = document.createElement('div');
    //         line.className = className;
    //         line.textContent = message;
    //         outputElement.appendChild(line);
    //         outputElement.scrollTop = outputElement.scrollHeight; // Автопрокрутка вниз
    //     }

    //     // Переопределяем console.log
    //     console.log = function (...args) {
    //         originalConsole.log(...args);
    //         const formattedArgs = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg);
    //         addOutput(formattedArgs.join(' '), 'log');
    //     };

    //     // Переопределяем console.error
    //     console.error = function (...args) {
    //         originalConsole.error(...args);
    //         const error = args.join(' ');
    //         addOutput(error, 'error');
    //     };

    //     // Переопределяем console.warn
    //     console.warn = function (...args) {
    //         originalConsole.warn(...args);
    //         addOutput(args.join(' '), 'warn');
    //     };

    //     // Переопределяем console.info
    //     console.info = function (...args) {
    //         originalConsole.info(...args);
    //         addOutput(args.join(' '), 'info');
    //     };
    // }

    // // Вызываем функцию для переопределения методов console
    // overrideConsoleMethods();

    // // Функция для обновления отображения globalScope
    // function updateGlobalScopeDisplay() {
    //     const displayElement = document.getElementById('global-scope-display');
    //     displayElement.textContent = JSON.stringify(globalScope, null, 2);
    // }

    // // Функция для выполнения кода и обновления globalScope
    // function executeCode(code) {
    //     const outputElement = document.getElementById('console-output');
    //     outputElement.innerHTML = ''; // Очищаем console-output перед выполнением нового кода

    //     try {
    //         // Создаем Proxy для перехвата присваиваний переменных
    //         const proxy = new Proxy(globalScope, {
    //             set: function(target, property, value) {
    //                 target[property] = value;
    //                 updateGlobalScopeDisplay(); // Обновляем globalScopeDisplay при изменении переменной
    //                 return true;
    //             },
    //             get: function(target, property) {
    //                 if (target.hasOwnProperty(property)) {
    //                     return target[property];
    //                 }
    //                 return window[property]; // Fallback to window
    //             }
    //         });

    //         // Выполняем код в контексте Proxy
    //         const result = new Function('with (this) { ' + code + ' }').call(proxy);

    //         // Если результат не undefined, выводим его в console-output
    //         if (result !== undefined) {
    //            // outputElement.textContent = result;  // Простое отображение результата
    //             console.log(result); // Используем переопределенный console.log
    //         }

    //     } catch (e) {
    //        console.error(e); // Используем переопределенный console.error
    //        // outputElement.textContent = e; // Отображаем ошибку в console-output
    //     }
    // }


    // // Обработчик ввода кода
    // document.getElementById('console-input').addEventListener('keydown', function (event) {
    //     if (event.key === 'Enter') {
    //         event.preventDefault(); // Предотвращаем добавление новой строки в contenteditable

    //         const code = this.textContent.trim(); // Получаем текст из contenteditable блока
    //         // this.textContent = ''; // Очищаем поле ввода

    //         if (code) {
    //             executeCode(code);
    //         }
    //     }
    // });

    // // Первоначальное отображение globalScope
    // updateGlobalScopeDisplay();


import './style.css';

import { createApp } from 'vue';

import App from './App.vue'

const myApp = createApp(App)




// Assumes you have a <div id="app"></div> in your index.html
myApp.mount('#app')