export function shouldAllowAuthPageForUser(
  pathname: string,
  user: { trial_user?: boolean } | null | undefined
): boolean {
  return pathname.startsWith("/register") && user?.trial_user === true;
}
