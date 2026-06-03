export function apiError(
  code: string,
  message: string,
  status: number,
  details?: string
): Response {
  return Response.json(
    { error: { code, message, ...(details !== undefined ? { details } : {}) } },
    { status }
  );
}
