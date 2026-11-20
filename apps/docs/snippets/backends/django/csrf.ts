/**
 * Django's CSRF token, from its cookie, for the editor's requests. With
 * DRF's session authentication every PUT and POST must carry it:
 * `documentHost('forms', id, savedAt, toast, csrfHeaders)`.
 */
export function csrfHeaders(): Record<string, string> {
  const token = /(?:^|;\s*)csrftoken=([^;]+)/.exec(document.cookie)?.[1];
  return token ? { 'X-CSRFToken': decodeURIComponent(token) } : {};
}
