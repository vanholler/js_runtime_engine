<script>
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution';
import 'monaco-editor/esm/vs/language/json/monaco.contribution.js';

import * as esprima from 'esprima'; // Импортируем Esprima
import * as escodegen from 'escodegen'; // Импортируем Escodegen (опционально)

export default {
  components: {
  },
  data() {
    return {
      simple: `console.log("Привет, мир!");\nconst x = 10;\nconst y = 20;\nconsole.log(x + y);`, // Пример кода
      output: '', // Переменная для хранения результата выполнения
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

    const container = this.$refs.editorContainer;

    const editor = monaco.editor.create(container, {
      value: this.simple,
      language: 'javascript',
      theme: 'my-custom-theme',
      wordWrap: 'on',
      overflow: 'hidden',
      horizontalScrollbarSize: 0,
      scrollBeyondLastLine: false
    });
    this.editor = editor;

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

      // Перенаправляем консольные логи
      const originalConsoleLog = console.log;
      console.log = (message) => {
        // Форматируем вывод для массивов и объектов
        if (typeof message === 'object') {
          this.output += JSON.stringify(message, null, 2) + '\n'; // Красивый вывод объектов и массивов
        } else {
          this.output += message + '\n'; // Добавляем сообщение в вывод
        }
        originalConsoleLog(message); // Выводим в консоль
      };

      try {
        // Выполняем код из переменной simple
        const result = eval(this.simple); // Выполняем код
        this.output += result !== undefined ? JSON.stringify(result, null, 2) : ''; // Добавляем результат выполнения

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

        console.log(variables)
        // const globalScopeDisplay = this.$refs.globalScopeDisplay;
        // globalScopeDisplay.innerHTML = JSON.stringify(variables, null, 2);
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
  },

  watch: {},
}
</script>

<template>
  <div id="main">

    <div id="repl-container" ref="replContainer">
      <div id="editor" ref="editorContainer" style="height: 100%;"></div>
      <div class="resizer" data-direction="horizontal"></div> <!-- Горизонтальный разделитель -->
      <div id="global-scope-display" ref="globalScopeDisplay">
      </div>
    </div>

    <div class="resizer" data-direction="vertical" @mousedown="startResize"></div> <!-- Вертикальный разделитель -->
    <div id="console-output">{{ output }}</div>
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
</style>