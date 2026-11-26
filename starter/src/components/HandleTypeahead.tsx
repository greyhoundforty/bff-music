import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react';
import { type ActorHit, searchHandles } from '../lib/actors';

const DEBOUNCE_MS = 250;
const LIMIT = 6;
const FALLBACK_COLORS = ['var(--best)', 'var(--fav)', 'var(--first)'];

/** Stable per-account colour for accounts with no avatar. */
function fallbackColor(did: string): string {
  let h = 0;
  for (let i = 0; i < did.length; i++) h = (h * 31 + did.charCodeAt(i)) | 0;
  return FALLBACK_COLORS[Math.abs(h) % FALLBACK_COLORS.length];
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/**
 * Handle input with a dropdown of matching accounts. Renders the input and the
 * list only: the parent supplies the bordered row, which must be
 * `position: relative` and must not clip overflow, so the list can hang below it.
 * Picking a match fills the field; it never signs in by itself.
 */
export default function HandleTypeahead({ value, onChange, disabled = false }: Props) {
  const [results, setResults] = useState<ActorHit[]>([]);
  const [open, setOpen] = useState(false);
  // Keyboard choice: drives Enter and aria-activedescendant. Hover is visual
  // only, because a list that opens under a resting pointer fires mouseenter
  // and Enter must not then pick a stranger's handle.
  const [activeIndex, setActiveIndex] = useState(-1);
  const [hoverIndex, setHoverIndex] = useState(-1);
  const requestId = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const justSelected = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  function close() {
    setOpen(false);
    setActiveIndex(-1);
    setHoverIndex(-1);
  }

  useEffect(() => {
    const id = ++requestId.current;
    abortRef.current?.abort();

    if (disabled || !value.trim() || value === justSelected.current) {
      setResults([]);
      close();
      return;
    }

    const timer = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const hits = await searchHandles(value, LIMIT, controller.signal);
        if (id !== requestId.current) return; // a newer query owns the list
        setResults(hits);
        // Only open for someone still in the field: results can land after a
        // blur, or after a failed sign-in re-enables it, and nothing would
        // ever close a list opened then.
        setOpen(hits.length > 0 && document.activeElement === inputRef.current);
        setActiveIndex(-1);
      } catch {
        if (id !== requestId.current) return;
        setResults([]); // search is a convenience: fail quietly
        close();
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [value, disabled]);

  useEffect(() => () => abortRef.current?.abort(), []);

  function select(hit: ActorHit) {
    justSelected.current = hit.handle;
    onChange(hit.handle);
    setResults([]);
    close();
  }

  function handleChange(next: string) {
    justSelected.current = null;
    // The highlighted row belongs to the old text; Enter must not pick it.
    setActiveIndex(-1);
    setHoverIndex(-1);
    onChange(next);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault(); // pick instead of submitting
      select(results[activeIndex]);
    }
  }

  const optionId = (i: number) => `${listId}-opt-${i}`;
  const showList = open && results.length > 0;

  return (
    <>
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList && activeIndex >= 0 ? optionId(activeIndex) : undefined}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={close}
        placeholder="you.bsky.social"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        disabled={disabled}
        style={{
          flex: 1, border: 'none', outline: 'none',
          padding: '11px 13px', fontSize: 16,
          fontFamily: 'var(--font-ui)', color: 'var(--ink)',
          background: 'transparent', minWidth: 0,
        }}
      />

      {showList && (
        <ul
          id={listId}
          role="listbox"
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: -1.5, right: -1.5, zIndex: 50,
            margin: 0, padding: '4px 0', listStyle: 'none',
            background: 'var(--surface)', border: '1px solid var(--hairline)',
            borderRadius: 'var(--r-card)', boxShadow: 'var(--shadow-elevated)',
            overflow: 'hidden',
          }}
        >
          {results.map((hit, i) => (
            <li
              key={hit.did}
              id={optionId(i)}
              role="option"
              aria-selected={i === activeIndex}
              onMouseDown={(e) => e.preventDefault()} // keep focus so the click lands
              onClick={() => select(hit)}
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(-1)}
              style={{
                display: 'flex', alignItems: 'center', gap: 11,
                padding: '8px 14px', cursor: 'pointer',
                background: i === activeIndex || i === hoverIndex ? 'var(--page-bg)' : 'transparent',
              }}
            >
              {hit.avatar ? (
                <img
                  src={hit.avatar}
                  alt=""
                  loading="lazy"
                  width={28}
                  height={28}
                  style={{ borderRadius: '50%', flexShrink: 0, objectFit: 'cover' }}
                />
              ) : (
                <span
                  aria-hidden
                  style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: fallbackColor(hit.did),
                  }}
                />
              )}
              <span style={{ minWidth: 0 }}>
                <span style={{
                  display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--ink)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{hit.handle}</span>
                {hit.displayName && (
                  <span style={{
                    display: 'block', fontSize: 12, color: 'var(--faint)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{hit.displayName}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
