import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";

export default async function ProtectedLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  if (!(await isAuthenticated())) redirect("/login");
  return children;
}
