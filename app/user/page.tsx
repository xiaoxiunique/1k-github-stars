import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UserProfile } from "../components/UserProfile";

export const metadata = {
  title: "个人主页 | GitHub Star Tracker",
  description: "管理您的GitHub收藏项目和关注分类",
};

export default async function UserPage() {
  const session = await getServerSession(authOptions);

  // 如果用户未登录，重定向到首页
  if (!session) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-muted/40 p-4 md:p-8">
      <div className="container mx-auto max-w-7xl">
        <UserProfile user={session.user} />
      </div>
    </main>
  );
}
