export async function request(path: string, body?: unknown) {
  const response = await fetch('/api/v1/' + path, {
    credentials: 'same-origin',
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? {} : {
      'Content-Type': 'application/json',
      'Idempotency-Key': crypto.randomUUID()
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error?.message ?? 'The request failed.');
  return result;
}
export async function api(path: string, body?: unknown) {
  return (await request(path, body)).data;
}
