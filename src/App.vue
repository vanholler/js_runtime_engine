<script>
// import * as monaco from 'monaco-editor';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution';
import 'monaco-editor/esm/vs/language/json/monaco.contribution.js';

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
      }
    }
  },

  mounted() {
    this.editor = monaco.editor.create(document.getElementById('editor'), {
      value: this.simple,
      language: 'javascript',
      theme: 'vs-dark',
      automaticLayout: true
    });
  },

  methods: {
    onChange(value) {
      console.log(value);
    },
    minimizeWindow() {
    },
    maximizeWindow() {
    },
    closeWindow() {
    },
    startResize(event) {
      const resizer = event.target;
      const container = resizer.previousElementSibling; // repl-container
      const output = resizer.nextElementSibling; // console-output

      const startY = event.clientY;
      const startHeight = parseInt(window.getComputedStyle(container).height, 10);
      const startOutputHeight = parseInt(window.getComputedStyle(output).height, 10);
      const minHeight = 300; // Минимальная высота для блоков

      const doDrag = (dragEvent) => {
        const newHeight = startHeight + (dragEvent.clientY - startY);
        const minHeight = 300; // Минимальная высота для блоков

        // Ограничение минимальной высоты для repl-container
        if (newHeight >= minHeight) {
          container.style.height = `${newHeight}px`;
          output.style.height = `calc(100% - ${newHeight}px - ${startOutputHeight}px)`;
        }
        //TODO fix .
        // Ограничение минимальной высоты для console-output
        if (startOutputHeight + (startHeight - newHeight) >= minHeight) {
          output.style.height = `calc(100% - ${newHeight}px - ${startOutputHeight}px)`;
        }
      };

      const stopDrag = () => {
        document.removeEventListener('mousemove', doDrag);
        document.removeEventListener('mouseup', stopDrag);
      };

      document.addEventListener('mousemove', doDrag);
      document.addEventListener('mouseup', stopDrag);
    },
    handleExecute() {
      this.simple = this.editor.getValue(); // Получаем код из редактора
      // Ждем обновления DOM и данных Vue
      this.$nextTick(() => {
        this.executeCodeInWorker(this.simple);
        this.collectVariables(this.simple); // Собираем переменные после выполнения кода
      });
    },
    collectVariables(code) {
      const variables = {};
      const func = new Function(code + '; return this;'); // Создаем новую функцию
      const result = func.call(variables); // Выполняем код в контексте объекта variables
      this.simple = result; // Обновляем simple для отображения
    },
    executeCodeInWorker() {
      // Очищаем output перед выполнением нового кода
      this.output = '';

      // Перехватываем console.log
      const originalConsoleLog = console.log;
      console.log = (...args) => {
        this.output += args.join(' ') + '\n'; // Добавляем вывод console.log
      };

      try {
        // Выполняем код с помощью eval
        eval(this.simple);
      } catch (e) {
        this.output += e.message; // Добавляем сообщение об ошибке
      } finally {
        // Восстанавливаем оригинальный console.log
        console.log = originalConsoleLog;
      }

    },
    handleInput(event) {
      this.simple = event.target.innerText; // Обновляем переменную simple
    },
  },

  watch: {

  },
}
</script>

<template>
  <div id="main">
    <div id="custom-titlebar">
      <button id="minimize-btn" @click="minimizeWindow">−</button>
      <button id="maximize-btn" @click="maximizeWindow">□</button>
      <button id="close-btn" @click="closeWindow">×</button>
    </div>

    <div id="repl-container">
      <div id="console-input" data-placeholder="Введите JavaScript код..." class="code theme-atom-one-dark"
        @keydown="handleKeydown" @paste="handlePaste">
        <div id="editor" style="height: 100%;"></div> <!-- Замените console-input на editor -->
      </div>
    
      <div class="resizer" data-direction="horizontal"></div> <!-- Горизонтальный разделитель -->
      <div id="global-scope-display">
      </div>
    </div>

    <div class="resizer" data-direction="vertical" @mousedown="startResize"></div> <!-- Вертикальный разделитель -->
    <button @click="handleExecute">Выполнить код</button>
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