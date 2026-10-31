import { describe, expect, it, vi } from 'vitest';
import { saveLinkedDraft } from './save-linked-draft';

describe('idea draft persistence', () => {
  it('links a manually saved draft before reporting success', async () => {
    const link = vi.fn().mockResolvedValue({ ok: true });
    const remember = vi.fn();
    expect(await saveLinkedDraft(async () => ({ tripId: 'draft' }), remember, 'failed', link)).toEqual({ tripId: 'draft' });
    expect(remember).toHaveBeenCalledWith('draft');
    expect(link).toHaveBeenCalledWith('draft');
  });
  it('keeps the created draft for retry when linking fails', async () => {
    const remember = vi.fn();
    const link = vi.fn().mockResolvedValueOnce({ ok: false }).mockResolvedValueOnce({ ok: true });
    expect(await saveLinkedDraft(async () => ({ tripId: 'same-draft' }), remember, 'failed', link)).toEqual({ tripId: 'same-draft', error: 'failed' });
    expect(remember).toHaveBeenCalledWith('same-draft');
    expect(await saveLinkedDraft(async () => ({ tripId: 'same-draft' }), remember, 'failed', link)).toEqual({ tripId: 'same-draft' });
    expect(link.mock.calls).toEqual([['same-draft'], ['same-draft']]);
  });
  it('reuses an inserted draft after a secondary crew save fails', async () => {
    const remember = vi.fn();
    const link = vi.fn();
    const result = { tripId: 'inserted-draft', error: 'crew-failed' };
    expect(await saveLinkedDraft(async () => result, remember, 'failed', link)).toEqual(result);
    expect(remember).toHaveBeenCalledWith('inserted-draft');
    expect(link).not.toHaveBeenCalled();
  });
  it('does not link a failed draft save', async () => {
    const link = vi.fn();
    const result = { tripId: '', error: 'validation' };
    expect(await saveLinkedDraft(async () => result, vi.fn(), 'failed', link)).toEqual(result);
    expect(link).not.toHaveBeenCalled();
  });
  it('reports a link exception and retains the draft identity', async () => {
    const remember = vi.fn();
    const result = await saveLinkedDraft(async () => ({ tripId: 'draft' }), remember, 'failed', async () => { throw Error('network'); });
    expect(result).toEqual({ tripId: 'draft', error: 'failed' });
    expect(remember).toHaveBeenCalledWith('draft');
  });
  it('saves ordinary drafts without an idea link', async () => {
    expect(await saveLinkedDraft(async () => ({ tripId: 'normal' }), vi.fn(), 'failed')).toEqual({ tripId: 'normal' });
  });
});
