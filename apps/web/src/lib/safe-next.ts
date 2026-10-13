// Where to go after signing in. Only paths inside the owner app are allowed,
// so a crafted ?next= can't send anyone off-site.
export function safeNext(value: FormDataEntryValue | string | null | undefined) {
  const next = typeof value === "string" ? value : "";
  return next === "/app" || /^\/app[/?][^/\\]/.test(next) ? next : "/app";
}
