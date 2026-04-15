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
  
  console.log('leaves():', root.leaves().map(l => l.data.name).join(' '));
}
