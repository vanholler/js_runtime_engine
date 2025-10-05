let parserPromise = null;

async function loadParser() {
  if (!parserPromise) parserPromise = import('@babel/parser');
  const { parse } = await parserPromise;
  return { parse };
}

export async function analyzeGlobalScope(code) {
  const { parse } = await loadParser();

  const astFile = parse(code, {
    sourceType: 'script',
    plugins: [
      'optionalChaining',
      'nullishCoalescingOperator',
      'numericSeparator',
      'logicalAssignment',
      'topLevelAwait',
      'classProperties',
      'classPrivateProperties',
      'classPrivateMethods',
      'objectRestSpread',
      'asyncGenerators',
      'bigInt'
    ]
  });

  const root = astFile.program || astFile;
  const variables = {};
  const executionContext = {};

  const evalExpr = (node) => {
    try {
      const exprSrc = code.slice(node.start, node.end);
      const keys = Object.keys(executionContext);
      const values = Object.values(executionContext);
      // Скобки на случай бинарных/тернарных выражений
      return new Function(...keys, `return (${exprSrc})`)(...values);
    } catch {
      return undefined;
    }
  };

  const handleVariable = (decl) => {
    if (!decl.id || decl.id.type !== 'Identifier') return;
    const name = decl.id.name;
    const value = decl.init ? evalExpr(decl.init) : undefined;

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
    const value = evalExpr(node.right);

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
    if (Array.isArray(node)) { node.forEach(traverse); return; }
    if (typeof node !== 'object') return;

    if (node.type === 'VariableDeclaration' && Array.isArray(node.declarations)) {
      node.declarations.forEach(handleVariable);
    } else if (node.type === 'VariableDeclarator') {
      handleVariable(node);
    } else if (node.type === 'AssignmentExpression') {
      handleAssignment(node);
    }

    for (const key in node) {
      if (key === 'loc' || key === 'start' || key === 'end') continue;
      const child = node[key];
      if (child && typeof child === 'object') traverse(child);
    }
  };

  traverse(root);
  return { variables };
}