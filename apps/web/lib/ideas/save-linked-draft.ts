type DraftResult = { tripId: string; error?: string };

/** Every save path must finish the idea link, including retries after a partial save. */
export async function saveLinkedDraft(
  save: () => Promise<DraftResult>,
  rememberDraft: (id: string) => void,
  failureMessage: string,
  link?: (id: string) => Promise<{ ok: boolean }>,
): Promise<DraftResult> {
  const result = await save();
  // A secondary save can fail after INSERT succeeded; retries must reuse its ID.
  if (result.tripId) rememberDraft(result.tripId);
  if (result.error || !result.tripId) return result;
  if (link) {
    try {
      if (!(await link(result.tripId)).ok) return { ...result, error: failureMessage };
    } catch {
      return { ...result, error: failureMessage };
    }
  }
  return result;
}
