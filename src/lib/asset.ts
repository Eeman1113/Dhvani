/**
 * Prefixes a public asset path with the deployment base path.
 *
 * GitHub Pages serves a project site from a subdirectory, so every absolute
 * URL has to carry that prefix. Next rewrites it for `next/link` and
 * `next/image`, but not for a plain `<img src>` or a `fetch`, and this app is
 * full of both: the painted art and every audio file are fetched by hand.
 *
 * Empty in development and on any root-domain deploy, so paths stay readable.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const asset = (path: string) => `${BASE_PATH}${path}`;
