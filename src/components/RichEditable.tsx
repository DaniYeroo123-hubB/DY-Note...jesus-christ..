import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';

export interface RichEditableProps {
  initialValue: string;
  onChange: (html: string) => void;
  placeholder: string;
  defaultColor?: string;
  activeColor: string;
  className?: string;
  style?: React.CSSProperties;
  autoFocus?: boolean;
  isSingleLine?: boolean;
  onFocus?: () => void;
}

export interface RichEditableRef {
  applyColor: (color: string) => void;
  getHtml: () => string;
  setHtml: (html: string) => void;
  focus: () => void;
  containsNode: (node: Node) => boolean;
}

export const RichEditable = forwardRef<RichEditableRef, RichEditableProps>(
  (
    {
      initialValue,
      onChange,
      placeholder,
      defaultColor = '#0f172a',
      activeColor,
      className = '',
      style = {},
      autoFocus = false,
      isSingleLine = false,
      onFocus,
    },
    ref
  ) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const lastSavedRangeRef = useRef<Range | null>(null);
    const isMountedRef = useRef(false);
    const activeSpanRef = useRef<HTMLSpanElement | null>(null);

    // Save active text selection/caret inside editor
    const saveSelection = () => {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && editorRef.current) {
        const range = selection.getRangeAt(0);
        if (editorRef.current.contains(range.commonAncestorContainer)) {
          lastSavedRangeRef.current = range.cloneRange();
        }
      }
    };

    // Restore caret position or collapse to end of editor
    const restoreSelection = () => {
      if (!editorRef.current) return;
      const selection = window.getSelection();
      if (!selection) return;

      if (
        lastSavedRangeRef.current &&
        editorRef.current.contains(lastSavedRangeRef.current.commonAncestorContainer)
      ) {
        selection.removeAllRanges();
        selection.addRange(lastSavedRangeRef.current);
      } else {
        const range = document.createRange();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
        lastSavedRangeRef.current = range.cloneRange();
      }
    };

    // Cleanly normalize DOM so any direct naked text gets wrapped in explicit defaultColor spans
    const normalizeHtmlOutput = (): string => {
      if (!editorRef.current) return '';
      const clone = editorRef.current.cloneNode(true) as HTMLElement;

      // 1. Convert any <font color="..."> to <span style="color: ...">
      const fonts = Array.from(clone.querySelectorAll('font'));
      fonts.forEach(font => {
        const color = font.getAttribute('color');
        const span = document.createElement('span');
        if (color) span.style.color = color;
        while (font.firstChild) {
          span.appendChild(font.firstChild);
        }
        font.parentNode?.replaceChild(span, font);
      });

      // 2. Helper to check if a node has an ancestor element with explicit color style
      const hasColorAncestor = (node: Node): boolean => {
        let curr: Node | null = node.parentNode;
        while (curr && curr !== clone) {
          if (curr.nodeType === Node.ELEMENT_NODE) {
            const el = curr as HTMLElement;
            if (el.style.color && el.style.color.trim().length > 0) {
              return true;
            }
          }
          curr = curr.parentNode;
        }
        return false;
      };

      // 3. Find all text nodes and ensure any uncolored text is wrapped in defaultColor span
      const processTextNodes = (parent: Node) => {
        const childNodes = Array.from(parent.childNodes);
        childNodes.forEach(child => {
          if (child.nodeType === Node.TEXT_NODE) {
            const raw = child.textContent || '';
            const clean = raw.replace(/[\u200B-\u200D\uFEFF]/g, '');
            if (clean.length > 0) {
              if (!hasColorAncestor(child)) {
                const span = document.createElement('span');
                span.style.color = defaultColor;
                span.textContent = clean;
                parent.replaceChild(span, child);
              } else if (raw !== clean) {
                child.textContent = clean;
              }
            } else if (raw.length > 0) {
              child.textContent = '';
            }
          } else if (child.nodeType === Node.ELEMENT_NODE) {
            processTextNodes(child);
          }
        });
      };

      processTextNodes(clone);
      return clone.innerHTML;
    };

    // Apply color to selected text or prepare color for next typed word
    const applyColor = (color: string) => {
      if (!editorRef.current || !color) return;

      // 1. Ensure editor is focused and restore caret position
      editorRef.current.focus();
      restoreSelection();

      const currentSel = window.getSelection();
      if (!currentSel || currentSel.rangeCount === 0) return;

      let currentRange = currentSel.getRangeAt(0);
      if (!editorRef.current.contains(currentRange.commonAncestorContainer)) {
        restoreSelection();
        const recheckSel = window.getSelection();
        if (!recheckSel || recheckSel.rangeCount === 0) return;
        currentRange = recheckSel.getRangeAt(0);
      }

      if (!currentSel.isCollapsed) {
        // Highlighting an existing word: wrap in a distinct colored span
        const span = document.createElement('span');
        span.style.color = color;
        try {
          const contents = currentRange.extractContents();
          span.appendChild(contents);
          currentRange.insertNode(span);

          // Collapse selection immediately after the colored span
          const newRange = document.createRange();
          newRange.setStartAfter(span);
          newRange.collapse(true);
          currentSel.removeAllRanges();
          currentSel.addRange(newRange);
          lastSavedRangeRef.current = newRange.cloneRange();
          activeSpanRef.current = null;

          const formattedHtml = normalizeHtmlOutput();
          onChange(formattedHtml);
        } catch (e) {
          console.error(e);
        }
      } else {
        // Check if caret is already inside an active zero-width/empty span
        if (
          activeSpanRef.current &&
          editorRef.current.contains(activeSpanRef.current) &&
          (activeSpanRef.current.textContent === '\uFEFF' ||
            activeSpanRef.current.textContent === '\u200B' ||
            activeSpanRef.current.textContent === '')
        ) {
          activeSpanRef.current.style.color = color;
          return;
        }

        // Insert new colored span at cursor
        const span = document.createElement('span');
        span.style.color = color;
        const textNode = document.createTextNode('\uFEFF');
        span.appendChild(textNode);

        currentRange.insertNode(span);
        activeSpanRef.current = span;

        // Position caret immediately inside the colored span after \uFEFF
        const newRange = document.createRange();
        newRange.setStart(textNode, 1);
        newRange.collapse(true);
        currentSel.removeAllRanges();
        currentSel.addRange(newRange);
        lastSavedRangeRef.current = newRange.cloneRange();

        // Also execute foreColor as secondary browser hint
        try {
          document.execCommand('styleWithCSS', false, 'true');
          document.execCommand('foreColor', false, color);
        } catch {
          // ignore
        }

        const formattedHtml = normalizeHtmlOutput();
        onChange(formattedHtml);
      }
    };

    useImperativeHandle(ref, () => ({
      applyColor,
      getHtml: () => normalizeHtmlOutput(),
      setHtml: (html: string) => {
        if (editorRef.current) {
          editorRef.current.innerHTML = html;
        }
      },
      focus: () => {
        if (editorRef.current) {
          editorRef.current.focus();
          restoreSelection();
        }
      },
      containsNode: (node: Node) => {
        return !!editorRef.current && editorRef.current.contains(node);
      },
    }));

    // Initial content setup on mount only
    useEffect(() => {
      if (editorRef.current && !isMountedRef.current) {
        editorRef.current.innerHTML = initialValue || '';
        isMountedRef.current = true;

        if (autoFocus) {
          editorRef.current.focus();
          const range = document.createRange();
          range.selectNodeContents(editorRef.current);
          range.collapse(false);
          const sel = window.getSelection();
          if (sel) {
            sel.removeAllRanges();
            sel.addRange(range);
            lastSavedRangeRef.current = range.cloneRange();
          }
        }
      }
    }, [autoFocus, initialValue]);

    const handleInput = () => {
      if (editorRef.current) {
        saveSelection();
        const formattedHtml = normalizeHtmlOutput();
        onChange(formattedHtml);
      }
    };

    const handleFocus = () => {
      saveSelection();
      onFocus?.();
    };

    const handleBlur = () => {
      saveSelection();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (isSingleLine && e.key === 'Enter') {
        e.preventDefault();
      }
    };

    return (
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyUp={saveSelection}
        onMouseUp={saveSelection}
        onSelect={saveSelection}
        onKeyDown={handleKeyDown}
        data-placeholder={placeholder}
        className={`rich-editable outline-none ${className}`}
        style={{
          color: defaultColor,
          minHeight: isSingleLine ? 'auto' : '120px',
          ...style,
        }}
      />
    );
  }
);
RichEditable.displayName = 'RichEditable';
