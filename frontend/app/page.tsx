import IndexRedirectClient from "./components/IndexRedirectClient";

export default function IndexPage() {
  // Server Componentのまま、認証判定はClient側に委譲
  return <IndexRedirectClient />;
}
