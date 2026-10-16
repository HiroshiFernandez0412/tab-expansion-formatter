# Tab Expansion Formatter

Expands and contracts tabs to spaces with a configurable tab width, advancing the
visual column cursor per-line so that a tab after three characters (with width 4)
becomes exactly one space.

```js
import { TabExpansionFormatter, expandTabs, contractTabs } from 'tab-expansion-formatter';

const f = new TabExpansionFormatter(4);
f.expandTabs('a\tb');   // 'a   b'
f.contractTabs('    x'); // '\tx'

// Or use the convenience functions:
expandTabs('\t', 4);    // '    '
contractTabs('    ', 4); // '\t'
```

## Why

Programmatic tab handling has two failure modes. The naive approach replaces every
`\t` with a fixed number of spaces, which is wrong: a tab moves to the *next tab
stop*, not a fixed distance from the tab itself. The other extreme — full
`unexpand`-style heuristics across whole buffers — introduces surprising
behaviour when mixed indentation is present.

This library picks the simplest correct model: lines are processed independently
(a newline resets the column to 0), and within a line the column cursor advances
by 1 for every character that is not a tab. Tabs expand to the next multiple of
`tabWidth`; runs of spaces contract into a tab only when they actually reach a
tab boundary. Anything that falls short is preserved as spaces.

## Edge case you will hit

Contraction is not a perfect inverse of expansion for arbitrary input. Only
space runs that land exactly on a tab boundary become tabs; a run of three
spaces in a width-4 setting stays as three spaces, because replacing it with a
tab would *under*-shoot the position the spaces described. If you need exact
round-tripping, start from tab-containing input — expanding and re-contracting
that is stable.

The formatter treats every character as width 1. It does not implement Unicode
East Asian Width or grapheme clustering; standard library only.

## Performance

The window keeps a bounded buffer, so `push` is constant time and memory does not
grow with the length of the stream. `peak` and `trough` are linear in the window
size, which is the trade that keeps `push` cheap.

