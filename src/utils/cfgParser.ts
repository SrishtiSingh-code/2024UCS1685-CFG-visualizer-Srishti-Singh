export type Grammar = {
  variables: Set<string>;
  terminals: Set<string>;
  rules: Record<string, string[][]>;
  startSymbol: string;
  productive: Set<string>;
};

export type DerivationStep = {
  nt: string;
  rhs: string[];
};

export type TreeNode = {
  id: number;
  name: string;
  children?: TreeNode[];
  ruleApplied?: string;
};

export type DerivationSequenceStep = {
  form: string[];
  rule?: string;
  activeNtIndex?: number;
};

export function parseGrammar(text: string): Grammar {
  const rules: Record<string, string[][]> = {};
  let startSymbol = '';
  const variables = new Set<string>();
  const rhsLines: { lhs: string, rhsRaw: string }[] = [];

  // First pass: collect all variables from LHS
  const lines = text.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(/(?:->|→)/);
    if (parts.length !== 2) {
      throw new Error(`Invalid rule format: "${trimmed}". Use "->" or "→".`);
    }

    const lhs = parts[0].trim();
    if (!lhs) {
      throw new Error(`Invalid rule: Left-hand side cannot be empty in "${trimmed}".`);
    }
    
    // Validate LHS: must be uppercase for CFG convention in this app
    if (!/^[A-Z]+$/.test(lhs)) {
      throw new Error(`Invalid variable "${lhs}": Variables must be uppercase letters (e.g., S, A, B).`);
    }

    if (!startSymbol) startSymbol = lhs;
    variables.add(lhs);
    rhsLines.push({ lhs, rhsRaw: parts[1] });
  }

  const symbolsInRhs = new Set<string>();

  // Second pass: parse RHS using collected variables
  for (const { lhs, rhsRaw } of rhsLines) {
    if (!rules[lhs]) rules[lhs] = [];

    const rhsAlternatives = rhsRaw.split('|');
    // Sort alternatives to put non-left-recursive rules first
    rhsAlternatives.sort((a, b) => {
      const aSymbols = a.trim().split(/\s+/);
      const bSymbols = b.trim().split(/\s+/);
      const aIsRecursive = aSymbols[0] === lhs;
      const bIsRecursive = bSymbols[0] === lhs;
      if (aIsRecursive && !bIsRecursive) return 1;
      if (!aIsRecursive && bIsRecursive) return -1;
      return 0;
    });
    
    for (const alt of rhsAlternatives) {
      const trimmedAlt = alt.trim();
      let symbols: string[] = [];

      if (/\s+/.test(trimmedAlt)) {
        // If it contains spaces, trust the user's spacing but filter out the spaces themselves
        symbols = trimmedAlt.split(/\s+/).filter(s => s.length > 0);
      } else if (trimmedAlt.length > 0) {
        // Otherwise, try to tokenize based on variables
        let i = 0;
        const sortedVars = Array.from(variables).sort((a, b) => b.length - a.length);
        
        while (i < trimmedAlt.length) {
          // Skip any leading whitespace if it somehow got here
          if (/\s/.test(trimmedAlt[i])) {
            i++;
            continue;
          }

          let matched = false;
          for (const v of sortedVars) {
            if (trimmedAlt.startsWith(v, i)) {
              symbols.push(v);
              i += v.length;
              matched = true;
              break;
            }
          }
          if (!matched) {
            let j = i;
            while (j < trimmedAlt.length && !/\s/.test(trimmedAlt[j])) {
              let nextVarMatched = false;
              for (const v of sortedVars) {
                if (trimmedAlt.startsWith(v, j)) {
                  nextVarMatched = true;
                  break;
                }
              }
              if (nextVarMatched) break;
              j++;
            }
            symbols.push(trimmedAlt.substring(i, j));
            i = j;
          }
        }
      }

      const cleanSymbols = symbols.length === 1 && (
        ['ε', 'ϵ', 'λ', 'epsilon', 'lambda', 'empty', 'null', "''", '""', '`', '´'].includes(symbols[0].toLowerCase())
      ) ? [] : symbols;
      rules[lhs].push(cleanSymbols);
      cleanSymbols.forEach(s => symbolsInRhs.add(s));
    }
  }

  const terminals = new Set<string>();
  symbolsInRhs.forEach(s => {
    if (!variables.has(s)) terminals.add(s);
  });

  // Productivity check: Ensure start symbol can derive a terminal string
  const productive = new Set<string>();
  let changed = true;
  while (changed) {
    changed = false;
    for (const v of variables) {
      if (productive.has(v)) continue;
      const alternatives = rules[v] || [];
      for (const rhs of alternatives) {
        if (rhs.every(sym => !variables.has(sym) || productive.has(sym))) {
          productive.add(v);
          changed = true;
          break;
        }
      }
    }
  }

  const grammar: Grammar = { variables, terminals, rules, startSymbol, productive };

  if (startSymbol && !productive.has(startSymbol)) {
    throw new Error(`Invalid Grammar: No terminal derivation possible (infinite recursion or unproductive rules detected). The start symbol "${startSymbol}" cannot derive any string of terminals.`);
  }

  return grammar;
}

export function generateValidString(grammar: Grammar, maxLength: number = 20): string | null {
  const expand = (symbol: string, depth: number): string | null => {
    if (depth > maxLength) return null;
    if (!grammar.variables.has(symbol)) return symbol === 'ε' ? '' : symbol;
    
    const alternatives = grammar.rules[symbol];
    const productiveAlternatives = alternatives.filter(rhs => 
      rhs.every(sym => !grammar.variables.has(sym) || grammar.productive.has(sym))
    );
    
    if (productiveAlternatives.length === 0) return null;
    
    // Prefer non-epsilon rules if possible to avoid empty suggestions
    let chosenRhs;
    const nonEpsilonRules = productiveAlternatives.filter(rhs => rhs.length > 0);
    if (nonEpsilonRules.length > 0 && depth < maxLength / 2) {
      chosenRhs = nonEpsilonRules[Math.floor(Math.random() * nonEpsilonRules.length)];
    } else {
      chosenRhs = productiveAlternatives[Math.floor(Math.random() * productiveAlternatives.length)];
    }
    
    let result = "";
    for (const s of chosenRhs) {
      const expanded = expand(s, depth + 1);
      if (expanded === null) return null;
      result += expanded;
    }
    return result;
  };
  
  return expand(grammar.startSymbol, 0);
}

export function generateExactLengthString(grammar: Grammar, targetLength: number): string | null {
  const MAX_DEPTH = targetLength * 5 + 20;
  const MAX_ITERATIONS = 100000;
  let iterations = 0;

  function dfs(form: string[], depth: number): string | null {
    iterations++;
    if (iterations > MAX_ITERATIONS) return null;
    if (depth > MAX_DEPTH) return null;

    const terminalsCount = form.filter(sym => !grammar.variables.has(sym) && sym !== 'ε').length;
    if (terminalsCount > targetLength) return null;

    const ntIndex = form.findIndex(sym => grammar.variables.has(sym));
    if (ntIndex === -1) {
      if (terminalsCount === targetLength) return form.filter(s => s !== 'ε').join('');
      return null;
    }

    const nt = form[ntIndex];
    const rules = grammar.rules[nt] || [];
    
    // Sort rules: prefer rules that might help reach the target length
    // Randomize to avoid getting stuck in the same path
    const shuffledRules = [...rules].sort(() => Math.random() - 0.5);

    for (const rhs of shuffledRules) {
      const newForm = [...form.slice(0, ntIndex), ...rhs, ...form.slice(ntIndex + 1)];
      const result = dfs(newForm, depth + 1);
      if (result !== null) return result;
    }

    return null;
  }

  return dfs([grammar.startSymbol], 0);
}

export interface DerivationResult {
  derivations: DerivationStep[][];
  closestPrefix: string;
  closestForm: string[];
  closestSteps: DerivationStep[];
}

export function findDerivations(grammar: Grammar, target: string, limit: number = 2): DerivationResult {
  let targetStr = target.replace(/\s+/g, '');
  
  // Normalize epsilon input to empty string
  if (['ε', 'ϵ', 'λ', 'e', 'epsilon', 'lambda', 'empty', 'null', "''", '""', '`', '´'].includes(targetStr.toLowerCase())) {
    targetStr = '';
  }

  const successfulDerivations: DerivationStep[][] = [];
  let closestPrefix = '';
  let closestForm: string[] = [grammar.startSymbol];
  let closestSteps: DerivationStep[] = [];

  // Use a queue for BFS with an index to avoid O(n) shift()
  const queue: { form: string[], steps: DerivationStep[], seenForms: Set<string> }[] = [];
  queue.push({ 
    form: [grammar.startSymbol], 
    steps: [], 
    seenForms: new Set([grammar.startSymbol]) 
  });
  let head = 0;

  let iterations = 0;
  const MAX_ITERATIONS = 200000; 
  const MAX_DEPTH = 100; 
  const START_TIME = performance.now();
  const TIMEOUT = 2000; // 2 seconds

  while (head < queue.length && iterations < MAX_ITERATIONS) {
    iterations++;
    
    // Check timeout every 1000 iterations
    if (iterations % 1000 === 0) {
      if (performance.now() - START_TIME > TIMEOUT) break;
    }

    const { form, steps, seenForms } = queue[head++];
    
    if (steps.length > MAX_DEPTH) continue;

    const firstNtIndex = form.findIndex(sym => grammar.variables.has(sym));

    let terminalPrefix = '';
    for (const sym of form) {
      if (grammar.variables.has(sym)) break;
      if (sym !== 'ε') terminalPrefix += sym;
    }
    
    if (targetStr.startsWith(terminalPrefix) && terminalPrefix.length >= closestPrefix.length) {
      closestPrefix = terminalPrefix;
      closestForm = form;
      closestSteps = steps;
    }

    if (firstNtIndex === -1) {
      const formStr = form.filter(s => s !== 'ε').join('');
      if (formStr === targetStr) {
        successfulDerivations.push(steps);
        if (successfulDerivations.length >= limit) return { derivations: successfulDerivations, closestPrefix, closestForm, closestSteps };
      }
      continue;
    }

    // Pruning: check if the prefix of terminals matches the target
    const prefix = form.slice(0, firstNtIndex).filter(s => s !== 'ε').join('');
    if (!targetStr.startsWith(prefix)) {
      continue;
    }
    
    // Pruning: if terminal count already exceeds target length
    const currentTerminalsStr = form.filter(sym => !grammar.variables.has(sym) && sym !== 'ε').join('');
    if (currentTerminalsStr.length > targetStr.length) {
      continue;
    }

    // Pruning: heuristic to prevent infinite loops or excessively deep searches
    if (form.length > targetStr.length + 20) continue;

    // Pruning: Limit number of non-terminals to prevent S -> SS -> SSS... explosion
    const ntCount = form.filter(sym => grammar.variables.has(sym)).length;
    if (ntCount > targetStr.length + 5) continue;

    const nt = form[firstNtIndex];
    const alternatives = grammar.rules[nt] || [];

    for (const rhs of alternatives) {
      const newForm = [...form.slice(0, firstNtIndex), ...rhs, ...form.slice(firstNtIndex + 1)];
      
      const formStr = newForm.join('|');
      if (seenForms.has(formStr)) continue;

      const newSeenForms = new Set(seenForms);
      newSeenForms.add(formStr);

      queue.push({
        form: newForm,
        steps: [...steps, { nt, rhs }],
        seenForms: newSeenForms
      });
    }
  }

  return { derivations: successfulDerivations, closestPrefix, closestForm, closestSteps };
}

export function buildParseTree(startSymbol: string, steps: DerivationStep[]): TreeNode {
  let idCounter = 1;
  const root: TreeNode = { id: idCounter++, name: startSymbol };
  const frontier: TreeNode[] = [root];

  for (const step of steps) {
    const nodeIndex = frontier.findIndex(n => n.name === step.nt && !n.children);
    if (nodeIndex !== -1) {
      const node = frontier[nodeIndex];
      const rhsStr = step.rhs.length === 0 ? 'ε' : step.rhs.join(' ');
      node.ruleApplied = `${step.nt} → ${rhsStr}`;
      if (step.rhs.length === 0) {
        node.children = [{ id: idCounter++, name: 'ε' }];
        frontier.splice(nodeIndex, 1);
      } else {
        node.children = step.rhs.map(sym => ({ id: idCounter++, name: sym }));
        frontier.splice(nodeIndex, 1, ...node.children);
      }
    }
  }

  return root;
}

export function generateLMD(root: TreeNode): DerivationSequenceStep[] {
  if (!root) return [];
  const sequences: DerivationSequenceStep[] = [];
  const frontier: TreeNode[] = [root];
  
  // Initial state
  sequences.push({ 
    form: [root.name],
    activeNtIndex: root.children ? 0 : -1
  });

  while (true) {
    const ntIndex = frontier.findIndex(n => n.children);
    if (ntIndex === -1) break;

    const node = frontier[ntIndex];
    const rule = node.ruleApplied;
    frontier.splice(ntIndex, 1, ...(node.children || []));
    
    // Filtered form
    const form = frontier.map(n => n.name).filter(n => n !== 'ε');
    
    // Find the next NT to be expanded in the FILTERED form
    let nextNtIndex = -1;
    let currentFormIdx = 0;
    for (let i = 0; i < frontier.length; i++) {
      if (frontier[i].name === 'ε') continue;
      if (frontier[i].children) {
        nextNtIndex = currentFormIdx;
        break;
      }
      currentFormIdx++;
    }

    sequences.push({ 
      form,
      rule,
      activeNtIndex: nextNtIndex
    });
  }
  return sequences;
}

export function generateRMD(root: TreeNode): DerivationSequenceStep[] {
  if (!root) return [];
  const sequences: DerivationSequenceStep[] = [];
  const frontier: TreeNode[] = [root];
  
  // Initial state
  sequences.push({ 
    form: [root.name],
    activeNtIndex: root.children ? 0 : -1
  });

  while (true) {
    let ntIndex = -1;
    for (let i = frontier.length - 1; i >= 0; i--) {
      if (frontier[i].children) {
        ntIndex = i;
        break;
      }
    }
    if (ntIndex === -1) break;

    const node = frontier[ntIndex];
    const rule = node.ruleApplied;
    frontier.splice(ntIndex, 1, ...(node.children || []));
    
    // Filtered form
    const form = frontier.map(n => n.name).filter(n => n !== 'ε');
    
    // Find the next NT to be expanded in the FILTERED form (rightmost)
    let nextNtIndex = -1;
    let currentFormIdx = 0;
    for (let i = 0; i < frontier.length; i++) {
      if (frontier[i].name === 'ε') continue;
      if (frontier[i].children) {
        nextNtIndex = currentFormIdx;
      }
      currentFormIdx++;
    }

    sequences.push({ 
      form,
      rule,
      activeNtIndex: nextNtIndex
    });
  }
  return sequences;
}
