<script>
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution';
import 'monaco-editor/esm/vs/language/json/monaco.contribution.js';

import * as esprima from 'esprima';
import * as escodegen from 'escodegen';

import JsonViewer from 'vue-json-viewer';
import 'vue-json-viewer/style.css';

export default {
  components: { JsonViewer },
  data() {
    return {
      simple: `let x = 10;\nx = 20;\nlet y = 30;\nconsole.log(x);`,
      output: null,
      globalScope: {},
      executionTime: {},
      editor: null,
      isSettingsOpen: false,
      activeTab: "about",
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

    const editor = monaco.editor.create(this.$refs.editorContainer, {
      value: this.simple,
      language: 'javascript',
      theme: 'my-custom-theme',
      wordWrap: 'on',
      overflow: 'hidden',
      padding: { top: 15, bottom: 15 },
      horizontalScrollbarSize: 0,
      scrollBeyondLastLine: false,
      automaticLayout: true,
    });

    this.editor = editor;
    editor.getModel().updateOptions({ tabSize: 2, insertSpaces: true });

    editor.onDidChangeModelContent(() => {
      this.simple = editor.getValue();
    });

    window.addEventListener('resize', () => editor.layout());
    this.setupEditor();
  },
  beforeUnmount() {
    if (this.editor) this.editor.dispose();
    const editorContainer = this.$refs.editorContainer;
    if (editorContainer) editorContainer.removeEventListener('keydown', this.handleKeyDown);
  },
  methods: {
    setupEditor() {
      const editorContainer = this.$refs.editorContainer;
      editorContainer.addEventListener('keydown', this.handleKeyDown);
    },
    handleKeyDown(event) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        this.output = '';
        this.makeJsResultOutput();
      }
    },
    makeJsResultOutput() {
      this.output = '';
      this.executionTime = {};
      const originalConsoleLog = console.log;
      console.log = (message) => {
        if (typeof message === 'object') this.output += `\n${JSON.stringify(message, null, 2)}\n`;
        else this.output += `${message}\n`;
        originalConsoleLog(message);
      };

      try {
        const startTime = performance.now();
        const result = eval(this.simple.replace(/console\.log/g, 'this.customConsoleLog'));
        const endTime = performance.now();
        const duration = endTime - startTime;

        this.executionTime = {
          full: `${duration} ms`,
          microseconds: `${(duration * 1000).toFixed(2)} µs`,
          seconds: `${(duration / 1000).toFixed(6)} s`
        };
        this.globalScope.executionTime = this.executionTime;

        if (result !== undefined) this.output += result;
        this.displayGlobalVariables();
      } catch (error) {
        this.output += error.message;
      } finally {
        console.log = originalConsoleLog;
      }
    },
    displayGlobalVariables() {
      const ast = esprima.parseScript(this.simple, { range: true });
      const variables = {};
      const executionContext = {};

      const traverse = (node) => {
        if (!node) return;

        // Handle variable declarations
        if (node.type === 'VariableDeclaration') {
          node.declarations.forEach((decl) => {
            if (decl.id && decl.id.type === 'Identifier') {
              const name = decl.id.name;
              let value;
              try {
                const keys = Object.keys(executionContext);
                const values = Object.values(executionContext);
                value = decl.init ? new Function(...keys, `return ${escodegen.generate(decl.init)}`)(...values) : undefined;
              } catch { value = undefined; }

              if (variables[name]) {
                variables[name].history.push(variables[name].current);
                variables[name].current = value;
              } else {
                variables[name] = { history: [], current: value };
              }
              executionContext[name] = value;
            }
          });
        }

        // Handle assignments
        if (node.type === 'AssignmentExpression' && node.left.type === 'Identifier') {
          const name = node.left.name;
          try {
            const keys = Object.keys(executionContext);
            const values = Object.values(executionContext);
            const value = new Function(...keys, `return ${escodegen.generate(node.right)}`)(...values);

            if (variables[name]) {
              variables[name].history.push(variables[name].current);
              variables[name].current = value;
            } else {
              variables[name] = { history: [], current: value };
            }
            executionContext[name] = value;
          } catch { executionContext[name] = undefined; if (variables[name]) variables[name].current = undefined; }
        }

        // Recursively traverse child nodes
        if (Array.isArray(node)) node.forEach(traverse);
        else if (typeof node === 'object') {
          if (node.body) node.body.forEach(traverse);
          for (const key in node) if (node[key] && typeof node[key] === 'object') traverse(node[key]);
        }
      };

      traverse(ast);
      this.globalScope.variables = variables;
    },
    startResize(event) { event.preventDefault(); window.addEventListener('mousemove', this.resize); window.addEventListener('mouseup', this.stopResize); },
    resize(event) { const repl = this.$refs.replContainer; const editor = this.$refs.editorContainer; repl.style.height = `${event.clientY - repl.getBoundingClientRect().top}px`; editor.style.height = 'auto'; },
    stopResize() { window.removeEventListener('mousemove', this.resize); window.removeEventListener('mouseup', this.stopResize); },
    customConsoleLog(message) {
      if (typeof message === 'object') this.output += `\n${JSON.stringify(message, null, 2)}\n`;
      else this.output += `${message}\n`;
    }
  }
}
</script>

<template>
  <div id="main">
    <div id="repl-container" ref="replContainer">
      <div id="editor" ref="editorContainer"></div>
      <div class="resizer" data-direction="horizontal"></div>
      
      <div id="staticCodeData">
        <div id="global-scope-display" ref="globalScopeDisplay">
          <json-viewer 
            :value="globalScope" 
            theme="my-awesome-json-theme" 
            :expand-depth="2" 
            boxed>
          </json-viewer>
        </div>

        <button id="settings-button" @click="isSettingsOpen = true" title="About & Settings">⚙️</button>

        <div v-if="isSettingsOpen" class="modal-backdrop">
          <div class="modal-content">
            <div class="modal-header">
              <h2>Info / Settings</h2>
              <button @click="isSettingsOpen = false" class="close-btn">✖</button>
            </div>
            <div class="modal-tabs">
              <span :class="activeTab==='about'?'active-tab':'tab'" @click="activeTab='about'">About</span>
              <span :class="activeTab==='settings'?'active-tab':'tab'" @click="activeTab='settings'">Settings</span>
            </div>
            <div class="modal-body">
              <div v-if="activeTab==='about'">
                <p>This project is a JS Runtime Engine built with Vue, Monaco Editor, and Esprima/Escodegen.</p>
              </div>
              <div v-else-if="activeTab==='settings'">
                <p>⚙️ Settings will go here. Suggestions: toggle theme, font size, or auto-run code.</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>

    <div class="resizer" data-direction="vertical" @mousedown="startResize"></div>
    <div id="console-output" ref="outputContainer">
      <json-viewer :value="output" :expand-depth="1" copyable boxed sort></json-viewer>
    </div>
  </div>
</template>

<style lang="scss">
#settings-button {
  position: absolute;
  top: 10px;
  right: 10px;
  font-size: 1.5em;
  color: #fff;
  background: none;
  border: none;
  cursor: pointer;
  z-index: 10;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}

.modal-content {
  background: #1e1e1e;
  color: #fff;
  border-radius: 8px;
  width: 400px;
  max-width: 95%;
  padding: 16px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #444;
  padding-bottom: 8px;
}

.close-btn {
  color: #f55;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.2em;
}

.modal-tabs {
  display: flex;
  gap: 10px;
  margin-top: 10px;
  border-bottom: 1px solid #444;
}

.tab { cursor: pointer; padding: 4px 8px; }
.active-tab { font-weight: bold; border-bottom: 2px solid #42b983; }
.modal-body { margin-top: 10px; font-size: 0.9em; }

/* JSON Viewer Dark Theme */
.my-awesome-json-theme {
  background-color: #1e1e1e;
  color: #f8f8f2;
  font-family: Consolas, Menlo, Courier, monospace;
  font-size: 14px;

  .jv-key { color: #61dafb; }
  .jv-string { color: #42b983; }
  .jv-number { color: #f39c12; }
  .jv-boolean { color: #fc1e70; }
  .jv-null { color: #ff79c6; }
  .jv-undefined { color: #e08331; }
  .jv-object, .jv-array { color: #f8f8f2; }
  .jv-ellipsis { color: #999; }
}
</style>
