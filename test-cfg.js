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
  console.log('allNodes order:', allNodes.map(n => n.data.name).join(' '));
  
  const leaves = allNodes.filter(node => !node.children);
  console.log('leaves order:', leaves.map(l => l.data.name).join(' '));
} else {
  console.log('No derivations found');
}
