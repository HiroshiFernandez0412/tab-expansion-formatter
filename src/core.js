/**
 * TabExpansionFormatter
 *
 * Expands and contracts tabs to spaces with a configurable tab width.
 *
 * SINGLE LINE MODEL
 * -----------------
 * Lines are processed independently. There is no multi-line column
 * awareness across '\n' boundaries. This is a deliberate choice: every
 * editor that displays a file treats a newline as resetting the visual
 * column to 0, and trying to be cleverer than that produces surprising
 * results when mixed line endings or wrapped lines are involved. We
 * honour the universal convention instead.
 *
 * Within a single line the column cursor advances by the number of
 * display columns each character occupies. All characters are treated
 * as width 1 except '\t' itself, which is handled specially. We do not
 * attempt East-Asian Width or grapheme clustering; standard library only.
 */
export class TabExpansionFormatter {
  /**
   * @param {number} tabWidth - Spaces per tab. Must be a positive integer.
   */
  constructor(tabWidth) {
    if (!Number.isInteger(tabWidth) || tabWidth <= 0) {
      throw new Error(`tabWidth must be a positive integer, got ${String(tabWidth)}`);
    }
    this._tabWidth = tabWidth;
  }

  /** @type {number} */
  get tabWidth() {
    return this._tabWidth;
  }

  /**
   * Expand tabs to spaces.
   *
   * Each tab moves the column up to the next multiple of `tabWidth`.
   * Characters that are not tabs advance the column by 1. A tab at
   * column 0 with tabWidth 4 inserts 4 spaces; a tab at column 3 inserts 1.
   *
   * @param {string} input
   * @returns {string}
   */
  expandTabs(input) {
    return this._transform(input, (column) => this._tabWidth - (column % this._tabWidth));
  }

  /**
   * Contract runs of spaces to tabs where a tab reaches the next tab stop.
   *
   * A space is only convertible into part of a tab if the column is
   * already on a tab boundary OR if the accumulated spaces complete a
   * tab stop. Spaces that would stop short of a tab stop are preserved
   * as spaces. This matches the behaviour of `unexpand` (unexpand-all
   * mode applied per line) and prevents turning e.g. three spaces of
   * mid-field indentation into a misleading tab.
   *
   * @param {string} input
   * @returns {string}
   */
  contractTabs(input) {
    const tw = this._tabWidth;
    let out = '';
    let pendingSpaces = 0;
    let column = 0;

    for (const ch of input) {
      if (ch === '\n') {
        if (pendingSpaces > 0) {
          out += ' '.repeat(pendingSpaces);
          pendingSpaces = 0;
        }
        out += ch;
        column = 0;
        continue;
      }

      if (ch === '\t') {
        // A literal tab in the input is kept; align column to next tab stop.
        out += '\t';
        column += tw - (column % tw);
        continue;
      }

      if (ch === ' ') {
        pendingSpaces++;
        column++;
        // When we've accumulated exactly enough spaces to reach a tab
        // boundary, emit a tab and reset the pending count.
        if (column % tw === 0) {
          out += '\t';
          pendingSpaces = 0;
        }
        continue;
      }

      // Flush any pending spaces that never completed a tab boundary.
      if (pendingSpaces > 0) {
        out += ' '.repeat(pendingSpaces);
        pendingSpaces = 0;
      }
      out += ch;
      column++;
    }

    // Handle trailing spaces at end of input (no flush character follows).
    if (pendingSpaces > 0) {
      out += ' '.repeat(pendingSpaces);
    }

    return out;
  }

  /**
   * Shared per-line transformation. For each character, either advances the
   * column cursor by 1 (non-tab) or replaces the tab with a computed number
   * of spaces and advances the column by that same number (tab).
   *
   * @param {string} input
   * @param {(column: number) => number} spaceCount - Given the current column,
   *   return how many spaces a tab produces.
   * @returns {string}
   */
  _transform(input, spaceCount) {
    if (typeof input !== 'string') {
      throw new Error(`input must be a string, got ${String(input)}`);
    }
    let out = '';
    let column = 0;

    for (const ch of input) {
      if (ch === '\t') {
        const n = spaceCount(column);
        out += ' '.repeat(n);
        column += n;
      } else {
        out += ch;
        // Treat newline like any other width-1 character: it ends the
        // line and resets the cursor. The caller processes line by line
        // in expandTabs/contractTabs, so a literal '\n' inside `input` here
        // only happens when _transform is invoked on a whole multiline
        // string. In that case we let the newline pass through and reset
        // the column, which gives the correct per-line behaviour.
        if (ch === '\n') {
          column = 0;
        } else {
          column++;
        }
      }
    }

    return out;
  }
}

/**
 * Convenience: expand tabs with a given width without constructing a formatter.
 * @param {string} input
 * @param {number} tabWidth
 * @returns {string}
 */
export function expandTabs(input, tabWidth) {
  return new TabExpansionFormatter(tabWidth).expandTabs(input);
}

/**
 * Convenience: contract spaces to tabs with a given width.
 * @param {string} input
 * @param {number} tabWidth
 * @returns {string}
 */
export function contractTabs(input, tabWidth) {
  return new TabExpansionFormatter(tabWidth).contractTabs(input);
}
