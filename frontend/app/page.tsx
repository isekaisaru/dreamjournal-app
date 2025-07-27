// app/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function IndexPage(){
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (token) {
    redirect("/home");
  } else {
    redirect("/trial");
  }
}
