<script>
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution';
import 'monaco-editor/esm/vs/language/json/monaco.contribution.js';

import * as esprima from 'esprima'; // Импортируем Esprima
import * as escodegen from 'escodegen'; // Импортируем Escodegen (опционально)

import JsonViewer from 'vue-json-viewer'
import 'vue-json-viewer/style.css'

export default {
  components: {
    JsonViewer
  },
  data() {
    return {
      simple: `console.log("Привет, мир!");\nconst x = 10;\nconst y = 20;\nconsole.log(x + y);`, // Пример кода
      output: '{"language":"json","theme":"my-custom-theme"}', // Переменная для хранения результата выполнения
      globalScope : {},
      executionTime: {},
      editor: null, // Переменная для хранения экземпляра редактора
      options: {
        //Monaco Editor Options
      },
    }
  },

  async mounted() {
    monaco.editor.defineTheme('my-custom-theme', {
      base: 'vs-dark',
      inherit: true,
      rules: [{ token: '', background: '#282a36' }],
      colors: {
        'editor.background': '#282a36',
        'editor.foreground': '#f8f8f2',
        'editorCursor.foreground': '#f8f8f2'
      }
    });

    const inputContainer = this.$refs.editorContainer;
    const outputContainer = this.$refs.outputContainer;
    // const helperJsContainer = this.$refs.globalScopeDisplay;

    const editor = monaco.editor.create(inputContainer, {
      value: this.simple,
      language: 'javascript',
      theme: 'my-custom-theme',
      wordWrap: 'on',
      overflow: 'hidden',
      padding: {
        top: 15,
        bottom: 15,
      },
      horizontalScrollbarSize: 0,
      scrollBeyondLastLine: false,

    });
    this.editor = editor;
    editor.getModel().updateOptions({ tabSize: 2, insertSpaces: true });


    // Добавляем обработчик события изменения содержимого модели
    await editor.onDidChangeModelContent(() => {
      this.simple = editor.getValue(); // Обновляем значение переменной simple
    });

    window.addEventListener('resize', () => {
      editor.layout();
    });

    this.setupEditor();
  },
  beforeUnmount() {
    if (this.editor) {
      this.editor.dispose();
    }
    // Убираем обработчик события при уничтожении компонента
    const editorContainer = this.$refs.editorContainer;
    if (editorContainer) {
      editorContainer.removeEventListener('keydown', this.handleKeyDown);
    }
  },
  methods: {
    setupEditor() {
      const editorContainer = this.$refs.editorContainer;

      // Добавляем обработчик события keydown
      editorContainer.addEventListener('keydown', this.handleKeyDown);
    },
    handleKeyDown(event) {
      // Проверяем, была ли нажата клавиша Enter и не нажата клавиша Shift
      if (event.key === 'Enter' && !event.shiftKey) {
        // Отменяем стандартное поведение (создание новой строки)
        event.preventDefault();

        this.output = ''; // Очищаем вывод перед новым запуском
        // Собираем данные из .view-line span
        this.makeJsResultOutput();
      }
    },
    makeJsResultOutput() {
      // Очищаем предыдущий вывод
      this.output = '';
      this.executionTime = {}; // сброс замера

      // Перенаправляем консольные логи
      const originalConsoleLog = console.log;
      console.log = (message) => {
        // Форматируем вывод для массивов и объектов
        if (typeof message === 'object') {
          this.output += `\n${JSON.stringify(message, null, 2)}\n`; // Объекты выводим отдельно
        } else if (typeof message === 'string') {
          this.output += `${message}\n`; // Строки выводим отдельно
        } else {
          this.output += `${message}\n`; // Добавляем сообщение в вывод
        }
        originalConsoleLog(message); // Выводим в консоль
      };

      try {
        const startTime = performance.now(); // Начинаем отсчет времени
        const result = eval(this.simple.replace(/console\.log/g, 'this.customConsoleLog')); // Выполняем код с перенаправлением console.log
        const endTime = performance.now(); // Заканчиваем отсчет времени

        // Вычисление времени выполнения
        const duration = endTime - startTime;
        const microseconds = duration * 1000; // Микросекунды (1 мс = 1000 µs)
        const seconds = duration / 1000; // Секунды (1 мс = 0.001 с)
        this.executionTime = {
          full: `${duration} ms`, // Полный формат
          microseconds: `${microseconds.toFixed(2)} µs`, // Микросекунды
          seconds: `${seconds.toFixed(6)} s`, // Секунды
        }

        if (result !== undefined) {
          this.output += result; // Добавляем результат выполнения
        }

        // Собираем все переменные и их значения
        this.displayGlobalVariables();
      } catch (error) {
        this.output += error.message; // Обрабатываем ошибки
      } finally {
        console.log = originalConsoleLog; // Восстанавливаем оригинальный console.log
      }
    },
    displayGlobalVariables() {
      const variables = {};

      try {
        // Парсим код в AST (абстрактное синтаксическое дерево)
        const ast = esprima.parseScript(this.simple, { range: true });

        // Рекурсивно обходим AST
        const traverse = (node) => {
          if (!node) return;

          // Обрабатываем объявления переменных
          if (node.type === 'VariableDeclaration') {
            node.declarations.forEach((declaration) => {
              if (declaration.id && declaration.id.type === 'Identifier') {
                const variableName = declaration.id.name;

                // Если переменная инициализирована, получаем её значение
                if (declaration.init) {
                  try {
                    // Используем new Function для вычисления значения
                    variables[variableName] = new Function(`return ${escodegen.generate(declaration.init)}`)();
                  } catch (error) {
                    console.error(`Ошибка при вычислении значения переменной ${variableName}:`, error);
                    variables[variableName] = undefined;
                  }
                } else {
                  variables[variableName] = undefined; // Переменная без инициализации
                }
              }
            });
          }

          // Рекурсивно обходим дочерние узлы
          for (const key in node) {
            if (node[key] && typeof node[key] === 'object') {
              traverse(node[key]);
            }
          }
        };

        traverse(ast);

        this.globalScope = variables;
      } catch (error) {
        console.error('Ошибка при анализе кода:', error);
      }
    },
    startResize(event) {
      event.preventDefault();
      window.addEventListener('mousemove', this.resize);
      window.addEventListener('mouseup', this.stopResize);
    },
    resize(event) {
      const replContainer = this.$refs.replContainer;
      const editorContainer = this.$refs.editorContainer; // Получаем ссылку на редактор
      const newHeight = event.clientY - replContainer.getBoundingClientRect().top;

      // Устанавливаем новую высоту для repl-container и editor
      replContainer.style.height = `${newHeight}px`;
      editorContainer.style.height = 'auto'; // Устанавливаем высоту в auto


    },
    stopResize() {
      window.removeEventListener('mousemove', this.resize);
      window.removeEventListener('mouseup', this.stopResize);
    },
    updateReadOnlyEditor() {
      // this.readOnlyEditor.setValue(this.output); // Обновляем значение редактора
      console.log("updateReadOnlyEditor")
    },
    customConsoleLog(message) {
      // Форматируем вывод для массивов и объектов
      if (typeof message === 'object') {
        this.output += `\n${JSON.stringify(message, null, 2)}\n`; // Объекты выводим отдельно
      } else if (typeof message === 'string') {
        this.output += `${message}\n`; // Строки выводим отдельно
      } else {
        this.output += `${message}\n`; // Добавляем сообщение в вывод
      }
    },
  },
  watch: {
    output(newValue) {
      this.updateReadOnlyEditor(); // Обновляем редактор при изменении output
    }
  },
}
</script>

<template>
  <div id="main">

    <div id="repl-container" ref="replContainer">
      <div id="editor" ref="editorContainer" style="height: 100%;"></div>
      <div class="resizer" data-direction="horizontal"></div> <!-- Горизонтальный разделитель -->
      <div id="global-scope-display" ref="globalScopeDisplay">
        <json-viewer :value="globalScope" :expand-depth=2></json-viewer>
        
      </div>
    </div>
    {{ executionTime }}
    <div class="resizer" data-direction="vertical" @mousedown="startResize"></div> <!-- Вертикальный разделитель -->
    <div id="console-output" ref="outputContainer">
      <json-viewer :value="output" :expand-depth=1 copyable boxed sort></json-viewer>
    </div>
  </div>
</template>


<style lang="scss">
.theme-atom-one-dark pre code.hljs {
  padding: 0;
}

.resizer {
  cursor: ew-resize;
  /* Изменение курсора при наведении */
}

#editor {
  border: 1px solid #ccc;
}


// values are default one from jv-light template
.my-awesome-json-theme {
  background-color: #3e4451;
  white-space: nowrap;
  color: #525252;
  font-size: 14px;
  font-family: Consolas, Menlo, Courier, monospace;

  .jv-ellipsis {
    color: #999;
    background-color: #eee;
    display: inline-block;
    line-height: 0.9;
    font-size: 0.9em;
    padding: 0px 4px 2px 4px;
    border-radius: 3px;
    vertical-align: 2px;
    cursor: pointer;
    user-select: none;
  }
  .jv-button { color: #49b3ff }
  .jv-key { color: #111111 }
  .jv-item {
    &.jv-array { color: #111111 }
    &.jv-boolean { color: #fc1e70 }
    &.jv-function { color: #067bca }
    &.jv-number { color: #fc1e70 }
    &.jv-number-float { color: #fc1e70 }
    &.jv-number-integer { color: #fc1e70 }
    &.jv-object { color: #111111 }
    &.jv-undefined { color: #e08331 }
    &.jv-string {
      color: #42b983;
      word-break: break-word;
      white-space: normal;
    }
  }
  .jv-code {
    .jv-toggle {
      &:before {
        padding: 0px 2px;
        border-radius: 2px;
      }
      &:hover {
        &:before {
          background: #eee;
        }
      }
    }
  }
}
</style>