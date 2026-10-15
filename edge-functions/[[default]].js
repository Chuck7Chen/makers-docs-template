// Keep the generated Next.js Middleware bundle in current EdgeOne CLI builds.
// The Middleware runs first; this catch-all only forwards unchanged requests.
export default function onRequest({ request }) {
  return fetch(request);
}
