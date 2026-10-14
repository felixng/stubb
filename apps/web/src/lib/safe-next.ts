// Where to go after signing in. Only paths inside the owner app and public
// profiles (/@handle, where a signed-out visitor taps Follow) are allowed, so
// a crafted ?next= can't send anyone off-site.
export function safeNext(value: FormDataEntryValue | string | null | undefined) {
  const next = typeof value === "string" ? value : "";
  if (/^\/@[a-z0-9_]{3,20}$/i.test(next)) return next;
  return next === "/app" || /^\/app[/?][^/\\]/.test(next) ? next : "/app";
}
