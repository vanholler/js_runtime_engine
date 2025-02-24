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
      },
      isExecuting: false
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
      <div id="editor" style="height: 100%;"></div>
    
      <div class="resizer" data-direction="horizontal"></div> <!-- Горизонтальный разделитель -->
      <div id="global-scope-display">
      </div>
    </div>

    <div class="resizer" data-direction="vertical"></div> <!-- Вертикальный разделитель -->
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