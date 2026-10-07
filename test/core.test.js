import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { TabExpansionFormatter, expandTabs, contractTabs } from '../src/index.js';

describe('TabExpansionFormatter construction', () => {
  it('stores the configured tab width', () => {
    const f = new TabExpansionFormatter(4);
    assert.equal(f.tabWidth, 4);
  });

  it('rejects zero', () => {
    assert.throws(() => new TabExpansionFormatter(0), /tabWidth/);
  });

  it('rejects negative numbers', () => {
    assert.throws(() => new TabExpansionFormatter(-2), /tabWidth/);
  });

  it('rejects non-integers', () => {
    assert.throws(() => new TabExpansionFormatter(4.5), /tabWidth/);
  });
});

describe('expandTabs', () => {
  it('expands a leading tab to the full tab width', () => {
    const result = expandTabs('\t', 4);
    assert.equal(result, '    ');
  });

  it('expands a tab after three characters to one space', () => {
    const result = expandTabs('abc\t', 4);
    assert.equal(result, 'abc ');
  });

  it('expands consecutive tabs', () => {
    const result = expandTabs('\t\t', 4);
    assert.equal(result, '        ');
  });

  it('expands a tab mid-line up to the next tab stop', () => {
    const result = expandTabs('a\tb', 4);
    assert.equal(result, 'a   b');
  });

  it('leaves non-tab characters untouched', () => {
    const result = expandTabs('hello world', 4);
    assert.equal(result, 'hello world');
  });

  it('handles multiple tabs and text mixed together', () => {
    const result = expandTabs('x\t\ty', 4);
    // x(1) -> tab to col4 (3 spaces) -> tab to col8 (4 spaces) -> y at col8
    assert.equal(result, 'x       y'); // 'x' + 3 spaces lands at col4, then 4 more lands at col8, 'y' appended
    // verify exact spacing
    assert.equal(result.length, 9);
  });

  it('handles empty input', () => {
    assert.equal(expandTabs('', 4), '');
  });

  it('processes each line independently across newlines', () => {
    const result = expandTabs('\t\n\t', 4);
    assert.equal(result, '    \n    ');
  });
});

describe('contractTabs', () => {
  it('contracts a full run of spaces at column 0 into a tab', () => {
    const result = contractTabs('    ', 4);
    assert.equal(result, '\t');
  });

  it('preserves spaces that do not reach a tab boundary', () => {
    const result = contractTabs('   ', 4);
    assert.equal(result, '   ');
  });

  it('contracts a mix of tabs and text', () => {
    // 4 spaces then 'a' then 3 spaces then 'b' (col 4 + a at 4..5, spaces 5..8 = tab to 8, b at 8)
    const result = contractTabs('    a   b', 4);
    assert.equal(result, '\ta\tb');
  });

  it('keeps existing tabs in the output', () => {
    const result = contractTabs('\t', 4);
    assert.equal(result, '\t');
  });

  it('handles empty input', () => {
    assert.equal(contractTabs('', 4), '');
  });

  it('flushes trailing spaces that do not form a tab', () => {
    const result = contractTabs('abc   ', 4);
    // 'abc' (col3) + 3 spaces -> col4 (boundary) -> tab, 2 spaces preserved
    assert.equal(result, 'abc\t  ');
  });

  it('flushes trailing spaces that do form a tab', () => {
    const result = contractTabs('a    ', 4);
    // 'a' col1, 3 spaces to reach col4 (boundary) -> tab, 1 trailing space preserved
    assert.equal(result, 'a\t ');
  });

  it('processes each line independently across newlines', () => {
    const result = contractTabs('    \n    ', 4);
    assert.equal(result, '\t\n\t');
  });

  it('returns input unchanged when there are no spaces', () => {
    const result = contractTabs('abc', 4);
    assert.equal(result, 'abc');
  });
});

describe('round-trip stability', () => {
  it('expanding then contracting a tab-indented string is stable', () => {
    const original = '\t\tcode';
    const expanded = expandTabs(original, 4);
    const contracted = contractTabs(expanded, 4);
    // After expansion: 8 spaces + 'code'. Contracting 8 spaces at col0 -> two tabs.
    assert.equal(contracted, '\t\tcode');
  });

  it('expanding then contracting arbitrary mixed content does not throw', () => {
    const samples = ['  a\t b ', '\t\t\t', 'no tabs here', '\t mixed\t  \tcontent\t'];
    for (const s of samples) {
      assert.equal(typeof expandTabs(s, 8), 'string');
      assert.equal(typeof contractTabs(s, 8), 'string');
    }
  });
});

describe('odd tab widths', () => {
  it('respects tabWidth 1', () => {
    assert.equal(expandTabs('\t', 1), ' ');
    assert.equal(contractTabs(' ', 1), '\t');
  });

  it('respects tabWidth 8', () => {
    assert.equal(expandTabs('a\t', 8), 'a       ');
  });
});
