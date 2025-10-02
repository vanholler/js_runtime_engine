<template>
  <div id="main">
    <div id="repl-container" ref="replContainer">
      <div id="editor" ref="editorContainer"></div>
      <div class="resizer" data-direction="horizontal"></div>
      
      <div id="staticCodeData">
        <!-- Global Scope (colored JSON) -->
        <div id="global-scope-display" ref="globalScopeDisplay">
          <h3>Global Scope</h3>
          <pre v-html="highlightJSON(globalScope)"></pre>
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

    <!-- Console Output (colored JSON/stringified view) -->
    <div id="console-output" ref="outputContainer">
      <h3>Console Output</h3>
      <pre v-html="highlightJSON(output)"></pre>
    </div>
  </div>
</template>

<script>
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution';
import 'monaco-editor/esm/vs/language/json/monaco.contribution.js';
import * as esprima from 'esprima';
import * as escodegen from 'escodegen';

export default {
  data() {
    return {
      simple: `let x = 10;\nx = 20;\nlet y = 30;\nconsole.log(x);`,
      output: "",
      globalScope: {},
      executionTime: {},
      editor: null,
      isSettingsOpen: false,
      activeTab: "about",
    };
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
    editor.onDidChangeModelContent(() => { this.simple = editor.getValue(); });
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
        if (typeof message === 'object') this.output += JSON.stringify(message, null, 2);
        else this.output += message;
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

        if (Array.isArray(node)) node.forEach(traverse);
        else if (typeof node === 'object') {
          if (node.body) node.body.forEach(traverse);
          for (const key in node) if (node[key] && typeof node[key] === 'object') traverse(node[key]);
        }
      };

      traverse(ast);
      this.globalScope.variables = variables;
    },
    startResize(event) { 
      event.preventDefault(); 
      window.addEventListener('mousemove', this.resize); 
      window.addEventListener('mouseup', this.stopResize); 
    },
    resize(event) { 
      const repl = this.$refs.replContainer; 
      const editor = this.$refs.editorContainer; 
      repl.style.height = `${event.clientY - repl.getBoundingClientRect().top}px`; 
      editor.style.height = 'auto'; 
    },
    stopResize() { 
      window.removeEventListener('mousemove', this.resize); 
      window.removeEventListener('mouseup', this.stopResize); 
    },
    customConsoleLog(message) {
      if (typeof message === 'object') this.output += JSON.stringify(message, null, 2);
      else this.output += message;
    },

    // ✅ Highlight JSON with colors
    highlightJSON(obj) {
      let json = typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2);
      json = json
        .replace(/(&|<|>)/g, (m) => ({ '&':'&amp;','<':'&lt;','>':'&gt;' }[m]))
        .replace(/("(\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"):/g, '<span class="jv-key">$1</span>:')
        .replace(/: "(.*?)"/g, ': <span class="jv-string">"$1"</span>')
        .replace(/: (\d+)/g, ': <span class="jv-number">$1</span>')
        .replace(/\b(true|false)\b/g, '<span class="jv-boolean">$1</span>')
        .replace(/\bnull\b/g, '<span class="jv-null">null</span>')
        .replace(/\bundefined\b/g, '<span class="jv-undefined">undefined</span>');
      return json;
    }
  }
}
</script>

<style lang="scss">
#settings-button { position: absolute; top: 10px; right: 10px; font-size: 1.5em; color: #fff; background: none; border: none; cursor: pointer; z-index: 10; }
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 50; }
.modal-content { background: #1e1e1e; color: #fff; border-radius: 8px; width: 400px; max-width: 95%; padding: 16px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #444; padding-bottom: 8px; }
.close-btn { color: #f55; background: none; border: none; cursor: pointer; font-size: 1.2em; }
.modal-tabs { display: flex; gap: 10px; margin-top: 10px; border-bottom: 1px solid #444; }
.tab { cursor: pointer; padding: 4px 8px; }
.active-tab { font-weight: bold; border-bottom: 2px solid #42b983; }
.modal-body { margin-top: 10px; font-size: 0.9em; }

/* Global Scope + Console */
#global-scope-display, #console-output { background-color: #1e1e1e; color: #f8f8f2; padding: 12px; border-radius: 6px; width: 100%; max-width: 100%; max-height: 750px; overflow: auto; font-family: Consolas, Menlo, Courier, monospace; }

/* Scrollbar green */
#global-scope-display::-webkit-scrollbar, #console-output::-webkit-scrollbar { width: 8px; height: 8px; }
#global-scope-display::-webkit-scrollbar-thumb, #console-output::-webkit-scrollbar-thumb { background: #42b983; border-radius: 4px; }
#global-scope-display::-webkit-scrollbar-thumb:hover, #console-output::-webkit-scrollbar-thumb:hover { background: #36a372; }

/* JSON Viewer Colors */
.jv-object { color: #ff79c6; }       
.jv-key { color: #8be9fd; }         
.jv-node:after { color: #bd93f9; }  
.jv-number { color: #ffb86c; }     
.jv-array { color: #50fa7b; }      
.jv-string { color: #f1fa8c; }     
.jv-boolean { color: #ff5555; }    
.jv-null { color: #6272a4; }       
.jv-undefined { color: #44475a; } 
.jv-ellipsis { color: #8b8b74; }

pre { margin: 0; white-space: pre-wrap; word-wrap: break-word; font-size: 14px; line-height: 1.4; }
</style>
