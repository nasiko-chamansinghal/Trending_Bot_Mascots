export interface Theme {
  body: string | null;
  eyes: string | null;
}

export function makeTheme(body: string | null | undefined, eyes: string | null | undefined): Theme | null {
  const tint = eyes === undefined ? (body ? '#FFFFFF' : null) : eyes;
  return body || tint ? { body: body || null, eyes: tint } : null;
}
