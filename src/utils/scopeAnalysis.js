import * as esprima from 'esprima';
import * as escodegen from 'escodegen';

export function analyzeGlobalScope(code) {
  const ast = esprima.parseScript(code, { range: true });
  const variables = {};
  const executionContext = {};

  const handleVariable = (decl) => {
    if (!decl.id || decl.id.type !== 'Identifier') return;
    const name = decl.id.name;
    let value;

    try {
      const keys = Object.keys(executionContext);
      const values = Object.values(executionContext);
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

    if (node.type === 'VariableDeclaration') node.declarations.forEach(handleVariable);
    else if (node.type === 'AssignmentExpression') handleAssignment(node);

    for (const key in node) {
      if (key === 'body') continue;
      if (node[key] && typeof node[key] === 'object') traverse(node[key]);
    }

    if (node.body) traverse(node.body);
  };

  traverse(ast);

  return { variables };
}


