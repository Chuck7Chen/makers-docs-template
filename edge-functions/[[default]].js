// EdgeOne CLI 1.6.41 only retains the generated Next.js Middleware bundle when
// the Edge Functions output also contains a route. This catch-all forwards the
// request unchanged; the generated Middleware runs before it and may rewrite
// the request to the matching tenant route.
export default function onRequest({ request }) {
  return fetch(request);
}
