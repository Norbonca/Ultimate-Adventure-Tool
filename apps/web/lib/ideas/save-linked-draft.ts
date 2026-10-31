type DraftResult = { tripId: string; error?: string };

/** Every save path must finish the idea link, including retries after a partial save. */
export async function saveLinkedDraft(
  save: () => Promise<DraftResult>,
  rememberDraft: (id: string) => void,
  failureMessage: string,
  link?: (id: string) => Promise<{ ok: boolean }>,
): Promise<DraftResult> {
  const result = await save();
  if (result.error || !result.tripId) return result;
  rememberDraft(result.tripId);
  if (link) {
    try {
      if (!(await link(result.tripId)).ok) return { ...result, error: failureMessage };
    } catch {
      return { ...result, error: failureMessage };
    }
  }
  return result;
}
