<template>
  <div id="main">
    <div id="repl-container" ref="replContainer">
      <div id="editorParent" ref="editorParentContainer">
        <div id="editor" ref="editorContainer"></div>
        <div class="resizer" data-direction="horizontal" @mousedown="startHorizontalResize"></div>

      </div>
      <div id="staticCodeData" ref="horizontalContainer">
        <div id="global-scope-display" ref="globalScopeDisplay">
          <h3>Global Scope</h3>

          <!-- Expand/Collapse Controls -->
          <div class="scope-controls">
            <button @click="collapseAll">Collapse All</button>
            <button @click="expandAll">Expand All</button>
          </div>

          <!-- JSON Viewer -->
          <json-viewer :value="globalScope" :expand-depth="expandDepth" theme="dark" copyable sort
            :key="`gv-${expandDepth}-${globalScopeVersion}`" />
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
                <div class="setting-item">
                  <label>
                    <input type="checkbox" v-model="autoRunEnabled"> Auto-run code on Enter
                  </label>
                </div>
                <div class="setting-item">
                  <label>
                    <input type="checkbox" v-model="darkThemeEnabled"> Dark Theme
                  </label>
                </div>
                <div class="setting-item">
                  <label for="fontSize">Font Size:</label>
                  <select id="fontSize" v-model="fontSize">
                    <option value="12">12px</option>
                    <option value="14">14px</option>
                    <option value="16">16px</option>
                    <option value="18">18px</option>
                    <option value="20">20px</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="resizer" data-direction="vertical" @mousedown="startVerticalResize"></div>

    <div id="console-output" ref="outputContainer">
      <h3>Console Output</h3>

      <!-- Copy Button -->
      <button class="copy-btn" @click="copyConsoleOutput">Copy</button>

      <pre v-html="highlightJSON(output)"></pre>
    </div>
  </div>
</template>

<script>
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution';
import 'monaco-editor/esm/vs/language/json/monaco.contribution.js';
import JsonViewer from 'vue-json-viewer';
import 'vue-json-viewer/style.css';
import { analyzeGlobalScope } from './utils/scopeAnalysis';

export default {
  components: { JsonViewer },
  data() {
    return {
      simple: `let x = 10;\nx = 20;\nlet y = 30;\nconsole.log(x);`,
      output: "",
      globalScope: {},
      executionTime: {},
      editor: null,
      isSettingsOpen: false,
      activeTab: "about",
      expandDepth: 2,
      globalScopeVersion: 0,
      autoRunEnabled: true,
      darkThemeEnabled: true,
      fontSize: 14,
    };
  },
  async mounted() {
    // Define custom theme
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

    // Initialize editor
    const editor = monaco.editor.create(this.$refs.editorContainer, {
      value: this.simple,
      language: 'javascript',
      theme: this.darkThemeEnabled ? 'my-custom-theme' : 'vs',
      wordWrap: 'on',
      overflow: 'hidden',
      padding: { top: 15, bottom: 15 },
      horizontalScrollbarSize: 0,
      scrollBeyondLastLine: false,
      automaticLayout: true,
      fontSize: this.fontSize
    });

    this.editor = editor;
    editor.getModel().updateOptions({ tabSize: 2, insertSpaces: true });
    editor.onDidChangeModelContent(() => { this.simple = editor.getValue(); });
    window.addEventListener('resize', () => editor.layout());
    this.setupEditor();
    
    // Watch for settings changes
    this.$watch('darkThemeEnabled', (newVal) => {
      editor.updateOptions({ theme: newVal ? 'my-custom-theme' : 'vs' });
    });
    
    this.$watch('fontSize', (newVal) => {
      editor.updateOptions({ fontSize: newVal });
    });
    
    // Ensure theme is applied correctly on mount
    this.$nextTick(() => {
      if (this.editor) {
        this.editor.updateOptions({ theme: this.darkThemeEnabled ? 'my-custom-theme' : 'vs' });
      }
    });
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
        if (this.autoRunEnabled) {
          this.output = '';
          this.makeJsResultOutput();
        }
      }
    },
    async makeJsResultOutput() {
      this.output = '';
      this.executionTime = {};
      const originalConsoleLog = console.log;
      console.log = (message) => {
        if (typeof message === 'object') this.output += JSON.stringify(message, null, 2) + "\n";
        else this.output += message + "\n";
        originalConsoleLog(message);
      };

      const boundCustomConsoleLog = this.customConsoleLog.bind(this);

      try {
        const startTime = performance.now();
        const result = eval(this.simple.replace(/console\.log/g, 'boundCustomConsoleLog')); 
        const endTime = performance.now();
        const duration = endTime - startTime;

        this.executionTime = {
          full: `${duration} ms`,
          microseconds: `${(duration * 1000).toFixed(2)} µs`,
          seconds: `${(duration / 1000).toFixed(6)} s`
        };

        this.globalScope = { ...this.globalScope, executionTime: this.executionTime };

        if (result !== undefined) this.output += result;
        await this.displayGlobalVariables();
      } catch (error) {
        this.output += `Error: ${error.message}`;
      } finally {
        console.log = originalConsoleLog;
      }
    },
    async displayGlobalVariables() {
      const { variables } = await analyzeGlobalScope(this.simple);
      this.globalScope = { ...this.globalScope, variables };
      this.globalScopeVersion++;
    },

    collapseAll() { this.expandDepth = 0; },
    expandAll() { this.expandDepth = Math.max(1, this.computeMaxDepth(this.globalScope)); },
    computeMaxDepth(obj) {
      const seen = new WeakSet();
      const depth = (o) => {
        if (o === null || typeof o !== 'object') return 0;
        if (seen.has(o)) return 0;
        seen.add(o);
        let maxChild = 0;
        if (Array.isArray(o)) for (const v of o) maxChild = Math.max(maxChild, depth(v));
        else for (const k of Object.keys(o)) try { maxChild = Math.max(maxChild, depth(o[k])); } catch {}
        return maxChild + 1;
      };
      try { const computed = depth(obj); return Number.isFinite(computed) ? computed : 2; } catch { return 2; }
    },

    startVerticalResize(event) {
      event.preventDefault();
      window.addEventListener('mousemove', this.VerticalResize);
      window.addEventListener('mouseup', this.stopVerticalResize);
    },

    VerticalResize(event) {
      const repl = this.$refs.replContainer;
      repl.style.height = `${event.clientY - repl.getBoundingClientRect().top}px`;
      this.$refs.editorContainer.style.height = 'auto';
    },
    stopVerticalResize() {
      window.removeEventListener('mousemove', this.VerticalResize);
      window.removeEventListener('mouseup', this.stopVerticalResize);
    },
    startVerticalResize(event) {
      event.preventDefault();
      window.addEventListener('mousemove', this.VerticalResize);
      window.addEventListener('mouseup', this.stopVerticalResize);
    },
    HorizontalResize(event) {

      const editorParentBox = this.$refs.editorParentContainer;
      const editorBox = this.$refs.editorContainer;

      const newWidth = event.clientX;

      // Update editor section width
      editorBox.style.width = `${newWidth}px`;
      editorParentBox.style.width = `${newWidth}px`

    },
    stopHorizontalResize() {
      window.removeEventListener('mousemove', this.HorizontalResize);
      window.removeEventListener('mouseup', this.stopHorizontalResize);
    },
    startHorizontalResize(event) {
      event.preventDefault();
      window.addEventListener('mousemove', this.HorizontalResize);
      window.addEventListener('mouseup', this.stopHorizontalResize);
    },


    customConsoleLog(message) {
      if (typeof message === 'object') this.output += JSON.stringify(message, null, 2) + "\n";
      else this.output += message + "\n";
    },
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
    },
    copyConsoleOutput() {
      navigator.clipboard.writeText(this.output).then(() => {
        alert('Console output copied!');
      }).catch(err => console.error('Copy failed', err));
    }
  }
};
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

.setting-item {
  margin: 10px 0;
}

/* Global Scope + Console */
#global-scope-display, #console-output {
  position: relative;
  background-color: #111;
  color: #f8f8f2;
  padding: 12px;
  border-radius: 6px;
  width: 100%;
  max-width: 100%;
  max-height: 750px;
  overflow: auto;
  font-family: Consolas, Menlo, Courier, monospace;
}

/* Small Copy Button on top-right corner */
#console-output .copy-btn {
  position: absolute;
  top: 30px;
  right: 35px;
  background: #42b983;
  border: none;
  border-radius: 4px;
  color: #fff;
  padding: 2px 6px;
  font-size: 12px;
  cursor: pointer;
  line-height: 1;
}
#console-output .copy-btn:hover {
  background: rgba(0,0,0,0.6);
}

/* Expand/Collapse Buttons */
.scope-controls { margin-bottom: 6px; display: flex; gap: 6px; }
.scope-controls button, #console-output .copy-btn {
  background: #42b983;
  border: none;
  border-radius: 4px;
  color: #fff;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 12px;
}
.scope-controls button:hover, #console-output .copy-btn:hover { background: rgba(0,0,0,0.6); }

/* Scrollbar */
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
