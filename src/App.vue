<template>
  <div id="main">
    <div id="repl-container" ref="replContainer">
      <div id="editor" ref="editorContainer"></div>
      <div class="resizer" data-direction="horizontal"></div>

      <div id="staticCodeData">
        <div id="global-scope-display" ref="globalScopeDisplay">
          <h3>Global Scope</h3>

          <div class="scope-controls">
            <button @click="collapseAll">Collapse All</button>
            <button @click="expandAll">Expand All</button>
          </div>

          <json-viewer
            :value="globalScope"
            :expand-depth="expandDepth"
            theme="dark"
            copyable
            sort
            :key="`gv-${expandDepth}-${globalScopeVersion}`"
          />
        </div>

        <div id="controls">
          <button id="run-button" @click="makeJsResultOutput" title="Run Code">▶️</button>
          <button id="settings-button" @click="isSettingsOpen = true" title="About & Settings">⚙️</button>
        </div>
        
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
      <h3>Console Output</h3>

      <button class="copy-btn" @click="copyConsoleOutput">Copy</button>

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
import JsonViewer from 'vue-json-viewer';
import 'vue-json-viewer/style.css';

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
    
    // REMOVED: this.setupEditor() call
  },
  beforeUnmount() {
    if (this.editor) this.editor.dispose();
    // REMOVED: code to remove event listener
  },
  methods: {
    // REMOVED: setupEditor() method
    // REMOVED: handleKeyDown() method
    
    makeJsResultOutput() {
      this.output = '';
      this.executionTime = {};
      const originalConsoleLog = console.log;
      
      // Temporarily redirect console.log to our custom method
      // We must use a global redirection (`window.console.log`) 
      // instead of overriding the function pointer (`console.log`) 
      // if `eval` is used and expecting a global function.
      const originalWindowConsoleLog = window.console.log;
      window.console.log = this.customConsoleLog.bind(this);

      try {
        const startTime = performance.now();
        
        // Execute code directly. No string replacement needed anymore 
        // because we redirected the global window.console.log.
        const result = eval(this.simple); 
        
        const endTime = performance.now();
        const duration = endTime - startTime;

        this.executionTime = {
          full: `${duration.toFixed(2)} ms`, // Fixed toFixed for display consistency
          microseconds: `${(duration * 1000).toFixed(2)} µs`,
          seconds: `${(duration / 1000).toFixed(6)} s`
        };

        this.globalScope = { ...this.globalScope, executionTime: this.executionTime };

        if (result !== undefined) this.output += result;
        this.displayGlobalVariables();
      } catch (error) {
        this.output += error.message;
      } finally {
        // IMPORTANT: Restore the original console.log function
        window.console.log = originalWindowConsoleLog;
      }
    },
    displayGlobalVariables() {
      try {
        const ast = esprima.parseScript(this.simple, { range: true });
        const variables = {};
        const executionContext = {};

        const handleFunctionDeclaration = (node) => {
            if (!node.id || node.id.type !== 'Identifier') return;
            const name = node.id.name;

            if (!variables[name]) {
                variables[name] = { history: [], current: 'function' };
            }
        };

        const handleVariable = (decl) => {
          if (!decl.id || decl.id.type !== 'Identifier') return;
          const name = decl.id.name;
          let value;

          try {
            const keys = Object.keys(executionContext);
            const values = Object.values(executionContext);
            // Re-evaluating variable initialization using Function constructor
            value = decl.init ? new Function(...keys, `return ${escodegen.generate(decl.init)}`)(...values) : undefined;
          } catch {
            value = undefined;
          }

          if (variables[name]) {
            if (variables[name].current !== value) variables[name].history.push(variables[name].current);
            variables[name].current = value;
          } else {
            variables[name] = { history: [], current: value };
          }

          executionContext[name] = value;
        };

        const handleAssignment = (node) => {
          if (!node.left || node.left.type !== 'Identifier') return;
          const name = node.left.name;
          let value;

          try {
            const keys = Object.keys(executionContext);
            const values = Object.values(executionContext);
            // Re-evaluating assignment expression
            value = new Function(...keys, `return ${escodegen.generate(node.right)}`)(...values);
          } catch {
            value = undefined;
          }

          if (variables[name]) {
            if (variables[name].current !== value) variables[name].history.push(variables[name].current);
            variables[name].current = value;
          } else {
            variables[name] = { history: [], current: value };
          }

          executionContext[name] = value;
        };

        const traverse = (node) => {
          if (!node) return;
          if (Array.isArray(node)) return node.forEach(traverse);
          if (typeof node !== 'object') return;
          
          if (node.type === 'FunctionDeclaration') handleFunctionDeclaration(node);
          else if (node.type === 'VariableDeclaration') node.declarations.forEach(handleVariable);
          else if (node.type === 'AssignmentExpression') handleAssignment(node);

          for (const key in node) {
            if (key === 'body' || key === 'declarations') continue;
            if (node[key] && typeof node[key] === 'object') traverse(node[key]);
          }

          if (node.body) traverse(node.body);
        };

        traverse(ast);

        this.globalScope = { ...this.globalScope, variables };
        this.globalScopeVersion++;
      } catch (error) {
         console.error("Error parsing AST:", error);
         // You might want to update globalScope to show the parsing error here
      }
    },
    
    // Global Scope Controls
    collapseAll() { this.expandDepth = 0; },
    expandAll() { 
      // Compute max depth to fully expand nested objects/arrays
      this.expandDepth = Math.max(1, this.computeMaxDepth(this.globalScope)); 
    },
    computeMaxDepth(obj) {
      // Logic for computing max depth (copied from your original code)
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

    // Resizing Logic
    startResize(event) { 
      event.preventDefault(); 
      window.addEventListener('mousemove', this.resize); 
      window.addEventListener('mouseup', this.stopResize); 
    },
    resize(event) { 
      const repl = this.$refs.replContainer; 
      repl.style.height = `${event.clientY - repl.getBoundingClientRect().top}px`; 
      this.$refs.editorContainer.style.height = 'auto'; 
    },
    stopResize() { 
      window.removeEventListener('mousemove', this.resize); 
      window.removeEventListener('mouseup', this.stopResize); 
    },
    
    // Console Output Logic
    customConsoleLog(message) {
      if (typeof message === 'object') this.output += JSON.stringify(message, null, 2) + "\n";
      else this.output += message + "\n";
    },
    highlightJSON(obj) {
      // JSON Highlighting logic (copied from your original code)
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
      // Copy to clipboard logic (copied from your original code)
      navigator.clipboard.writeText(this.output).then(() => {
        alert('Console output copied!');
      }).catch(err => console.error('Copy failed', err));
    }
  }
};
</script>

<style lang="scss">
/* --- CORE LAYOUT --- */
#main { display: flex; flex-direction: column; height: 100vh; background-color: #282a36; }
#repl-container { display: flex; flex-direction: row; flex-grow: 1; min-height: 50%; }
#editor, #staticCodeData { flex-grow: 1; flex-basis: 0; padding: 0; position: relative; }
#editor { background-color: #282a36; }
.resizer { background: #44475a; z-index: 10; }
.resizer[data-direction="horizontal"] { width: 4px; cursor: col-resize; }
.resizer[data-direction="vertical"] { height: 4px; cursor: row-resize; }
#staticCodeData { display: flex; flex-direction: column; padding: 0 10px 10px 10px; background-color: #282a36; }
#global-scope-display { flex-grow: 1; margin-bottom: 10px; }
#console-output { min-height: 50px; flex-grow: 1; padding: 12px; }

/* --- ICON BUTTONS (Settings and Run) --- */
#controls {
    position: absolute;
    top: 10px;
    right: 10px;
    z-index: 10;
    display: flex; 
    gap: 8px; 
}

#settings-button, #run-button { 
    /* Uniform icon styling */
    font-size: 1.5em; 
    color: #f8f8f2; /* White/Dracula foreground color */
    background: none; /* No background color */
    border: none; 
    padding: 0; /* Remove padding for tight icon display */
    cursor: pointer; 
    line-height: 1;
}

#settings-button:hover, #run-button:hover { 
    color: #42b983; /* Change color on hover to green/accent */
}

/* --- MODAL AND SCOPE CONTROLS (Existing Styles) --- */
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 50; }
.modal-content { background: #1e1e1e; color: #fff; border-radius: 8px; width: 400px; max-width: 95%; padding: 16px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #444; padding-bottom: 8px; }
.close-btn { color: #f55; background: none; border: none; cursor: pointer; font-size: 1.2em; }
.modal-tabs { display: flex; gap: 10px; margin-top: 10px; border-bottom: 1px solid #444; }
.tab { cursor: pointer; padding: 4px 8px; }
.active-tab { font-weight: bold; border-bottom: 2px solid #42b983; }
.modal-body { margin-top: 10px; font-size: 0.9em; }

/* Global Scope + Console */
#global-scope-display, #console-output {
  position: relative;
  background-color: #1e1e1e; /* Changed from #111 for consistency with component background */
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
  background: #44475a; /* Consistent color for small utility buttons */
  border: none;
  border-radius: 4px;
  color: #fff;
  padding: 2px 6px;
  font-size: 12px;
  cursor: pointer;
  line-height: 1;
}
#console-output .copy-btn:hover { background: #6272a4; }

/* Expand/Collapse Buttons */
.scope-controls { margin-bottom: 6px; display: flex; gap: 6px; }
.scope-controls button {
  background: #44475a; /* Consistent color for small utility buttons */
  border: none;
  border-radius: 4px;
  color: #fff;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 12px;
}
.scope-controls button:hover { background: #6272a4; }

/* Scrollbar */
#global-scope-display::-webkit-scrollbar, #console-output::-webkit-scrollbar { width: 8px; height: 8px; }
#global-scope-display::-webkit-scrollbar-thumb, #console-output::-webkit-scrollbar-thumb { background: #42b983; border-radius: 4px; }
#global-scope-display::-webkit-scrollbar-thumb:hover, #console-output::-webkit-scrollbar-thumb:hover { background: #36a372; }

/* JSON Viewer Colors */
/* (Styles for vue-json-viewer theme="dark") */
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