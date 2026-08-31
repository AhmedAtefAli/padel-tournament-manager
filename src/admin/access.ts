export type AccessState = 'checking' | 'authorized' | 'unauthorized' | 'error';

type QueryResult<T> = {
  data: T | null;
  error: { message: string } | null;
};

export type AccessDecision = {
  state: Exclude<AccessState, 'checking'>;
  requestStatus: string | null;
  errorMessage: string | null;
};

export function decideOrganizerAccess(
  editorResult: QueryResult<{ email: string }>,
  requestResult: QueryResult<{ status: string }>,
): AccessDecision {
  if (editorResult.error) {
    return { state: 'error', requestStatus: null, errorMessage: editorResult.error.message };
  }

  return {
    state: editorResult.data ? 'authorized' : 'unauthorized',
    requestStatus: requestResult.data?.status ?? null,
    errorMessage: null,
  };
}
