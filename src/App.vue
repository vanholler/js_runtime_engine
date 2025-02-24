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
      value: '// Введите код...',
      language: 'javascript',
      theme: 'my-custom-theme',
      wordWrap: 'on',
      overflow: 'hidden',
      horizontalScrollbarSize: 0,
      scrollBeyondLastLine: false
    });
    this.editor = editor;

     window.addEventListener('resize', () => {
        editor.layout();
      });
  },
  beforeUnmount() {
      if (this.editor) {
        this.editor.dispose();
      }
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
      <!-- <div id="editor" style="height: 100%;"></div> -->
      <div ref="editorContainer" style="width: 100%; height: 400px;"></div>
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