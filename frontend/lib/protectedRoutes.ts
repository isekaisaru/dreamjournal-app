export const PROTECTED_PAGE_PREFIXES = [
  "/home",
  "/dream",
  "/forest",
  "/insights",
  "/settings",
  "/room",
];

export function isProtectedPage(pathname: string): boolean {
  return PROTECTED_PAGE_PREFIXES.some((prefix) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}
