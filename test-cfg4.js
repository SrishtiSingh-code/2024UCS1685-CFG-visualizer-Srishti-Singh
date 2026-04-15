import { parseGrammar, findDerivations, buildParseTree } from './src/utils/cfgParser.js';
import * as d3 from 'd3';

const grammarText = `S -> E
E -> E + T | T
T -> T * F | F
F -> ( E ) | a | b`;

const grammar = parseGrammar(grammarText);
const target = 'a + b * a';
const derivations = findDerivations(grammar, target, 1);

if (derivations.length > 0) {
  const tree = buildParseTree(grammar.startSymbol, derivations[0]);
  const root = d3.hierarchy(tree);
  const allNodes = root.descendants();
  
  const internalNodes = allNodes.filter(n => n.children && n.children.length > 0);
  internalNodes.sort((a, b) => a.children[0].data.id - b.children[0].data.id);
  
  for (let step = 0; step <= internalNodes.length; step++) {
    const visibleNodesSet = new Set();
    visibleNodesSet.add(root);
    for (let i = 0; i < step; i++) {
      const parent = internalNodes[i];
      parent.children.forEach(child => visibleNodesSet.add(child));
    }
    
    const leaves = [];
    const traverse = (node) => {
      if (!visibleNodesSet.has(node)) return;
      if (!node.children || !visibleNodesSet.has(node.children[0])) {
        leaves.push(node);
      } else {
        node.children.forEach(traverse);
      }
    };
    traverse(root);
    
    console.log(`Step ${step}:`, leaves.map(l => l.data.name).filter(n => n !== 'ε').join(''));
  }
}
