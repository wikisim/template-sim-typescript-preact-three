/**
 * Returns the absolute URL for a static asset, resolved relative to `document.baseURI`
 * (the original page URL on the hosting site).
 *
 * Use this instead of static imports (e.g. `import foo from "./assets/foo.png"`) for any
 * file that must be served as a static asset. Static imports resolve via `import.meta.url`,
 * which points to the (potentially redirected) JS module URL rather than the page URL,
 * causing requests to be sent to the wrong origin.
 *
 * @param path - Path relative to the Vite root (`src/`), e.g. `"assets/data/foo.geojson"`
 *               or `"assets/scale_A.png"`.
 */
export function asset_url(path: string): string
{
    // Remove leading slash if present, so that the path is corrected to be
    // relative to document.baseURI rather than treated as an absolute URL.
    // i.e. if you use asset_url("/assets/foo.png") when running the interactable
    // site at https://wikisim.org/wiki/1272 then the resulting URL will not be
    // https://wikisim.org/wiki/1272/assets/foo.png as intended but instead will
    // be https://wikisim.org/assets/foo.png which is incorrect and will 404.
    if (path.startsWith("/")) path = path.slice(1)
    return new URL(path, document.baseURI).href
}
