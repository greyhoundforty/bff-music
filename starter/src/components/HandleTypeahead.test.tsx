import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActorHit } from '../lib/actors';
import { searchHandles } from '../lib/actors';
import HandleTypeahead from './HandleTypeahead';

vi.mock('../lib/actors', () => ({ searchHandles: vi.fn() }));
const search = vi.mocked(searchHandles);

const HITS: ActorHit[] = [
  { did: 'did:plc:a', handle: 'a.bsky.social', displayName: 'A', avatar: 'https://x/a.jpg' },
  { did: 'did:plc:b', handle: 'b.tngl.sh' },
];

const submitSpy = vi.fn((e: React.FormEvent) => e.preventDefault());

function Harness({ disabled = false }: { disabled?: boolean }) {
  const [value, setValue] = useState('');
  return (
    <form onSubmit={submitSpy}>
      <HandleTypeahead value={value} onChange={setValue} disabled={disabled} />
      <button type="submit">Continue</button>
    </form>
  );
}

const input = () => screen.getByRole('combobox') as HTMLInputElement;
const listbox = () => screen.queryByRole('listbox');
const type = (text: string) => fireEvent.change(input(), { target: { value: text } });
const debounce = () => act(() => vi.advanceTimersByTimeAsync(250));
// fireEvent returns false when the handler called preventDefault(); in a
// browser that is what stops Enter from submitting the form.
const pressEnter = () => fireEvent.keyDown(input(), { key: 'Enter' });

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

async function showResults() {
  search.mockResolvedValue(HITS);
  type('grey');
  await debounce();
}

beforeEach(() => {
  vi.useFakeTimers();
  search.mockReset();
  submitSpy.mockClear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('HandleTypeahead', () => {
  it('shows matches after the debounce', async () => {
    render(<Harness />);
    search.mockResolvedValue(HITS);
    type('grey');
    await act(() => vi.advanceTimersByTimeAsync(200));
    expect(listbox()).toBeNull();
    expect(search).not.toHaveBeenCalled();

    await act(() => vi.advanceTimersByTimeAsync(50));
    expect(search).toHaveBeenCalledWith('grey', 6, expect.any(AbortSignal));
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(2);
    expect(options[0].textContent).toContain('a.bsky.social');
    expect(options[0].textContent).toContain('A');
    expect(options[1].textContent).toContain('b.tngl.sh');
    expect(input().getAttribute('aria-expanded')).toBe('true');
  });

  it('ArrowDown + Enter fills the handle without submitting', async () => {
    render(<Harness />);
    await showResults();
    fireEvent.keyDown(input(), { key: 'ArrowDown' });
    expect(input().getAttribute('aria-activedescendant')).toBe(screen.getAllByRole('option')[0].id);
    const notPrevented = pressEnter();
    expect(notPrevented).toBe(false);
    expect(input().value).toBe('a.bsky.social');
    expect(submitSpy).not.toHaveBeenCalled();
    expect(listbox()).toBeNull();
  });

  it('clicking an option fills the handle', async () => {
    render(<Harness />);
    await showResults();
    const option = screen.getAllByRole('option')[1];
    fireEvent.mouseDown(option);
    fireEvent.click(option);
    expect(input().value).toBe('b.tngl.sh');
    expect(listbox()).toBeNull();
  });

  it('Enter without a highlight submits the form', async () => {
    render(<Harness />);
    await showResults();
    const notPrevented = pressEnter();
    expect(notPrevented).toBe(true);
    expect(input().value).toBe('grey');
  });

  it('hovering an option does not make Enter pick it', async () => {
    // A list that opens under a resting pointer fires mouseenter; Enter must
    // still submit the typed handle, not a stranger's.
    render(<Harness />);
    await showResults();
    fireEvent.mouseEnter(screen.getAllByRole('option')[0]);
    expect(input().getAttribute('aria-activedescendant')).toBeNull();
    expect(pressEnter()).toBe(true);
    expect(input().value).toBe('grey');
  });

  it('Escape closes the list', async () => {
    render(<Harness />);
    await showResults();
    fireEvent.keyDown(input(), { key: 'Escape' });
    expect(listbox()).toBeNull();
    expect(input().value).toBe('grey');
  });

  it('selecting closes the list and it stays closed', async () => {
    render(<Harness />);
    await showResults();
    fireEvent.keyDown(input(), { key: 'ArrowDown' });
    pressEnter();
    await debounce();
    expect(listbox()).toBeNull();
    expect(search).not.toHaveBeenCalledWith('a.bsky.social', 6, expect.anything());
  });

  it('ignores a stale response', async () => {
    render(<Harness />);
    const first = deferred<ActorHit[]>();
    search.mockReturnValueOnce(first.promise);
    type('gr');
    await debounce();

    search.mockResolvedValueOnce([{ did: 'did:plc:n', handle: 'new.bsky.social' }]);
    type('grey');
    await debounce();
    await act(async () => first.resolve([{ did: 'did:plc:o', handle: 'old.bsky.social' }]));

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0].textContent).toContain('new.bsky.social');
  });

  it('a failed search shows nothing and keeps typing working', async () => {
    render(<Harness />);
    search.mockRejectedValue(new Error('offline'));
    type('grey');
    await debounce();
    expect(listbox()).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(input().value).toBe('grey');
    type('greyh');
    expect(input().value).toBe('greyh');
  });

  it('clearing the field closes the list', async () => {
    render(<Harness />);
    await showResults();
    type('');
    expect(listbox()).toBeNull();
  });

  it('disabled closes the list', async () => {
    const { rerender } = render(<Harness />);
    await showResults();
    rerender(<Harness disabled />);
    expect(listbox()).toBeNull();
    expect(input().disabled).toBe(true);
  });
});
