// Where to go after signing in. Only paths inside the owner app, public
// profiles (/@handle, where a signed-out visitor taps Follow) and public
// entry and trip pages (/e/<id>, /t/<id>, for Like and Comment) are allowed,
// so a crafted ?next= can't send anyone off-site.
export function safeNext(value: FormDataEntryValue | string | null | undefined) {
  const next = typeof value === "string" ? value : "";
  if (/^\/@[a-z0-9_]{3,20}$/i.test(next)) return next;
  if (/^\/[et]\/[0-9a-f-]{36}$/i.test(next)) return next;
  return next === "/app" || /^\/app[/?][^/\\]/.test(next) ? next : "/app";
}
