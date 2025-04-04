import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getCategoryById } from "@/app/actions";
import { CategoryDetail } from "@/app/components/CategoryDetail";

interface CategoryPageProps {
  params: {
    id: string;
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const session = await getServerSession(authOptions);

  // 如果用户未登录，重定向到首页
  if (!session) {
    redirect("/");
  }

  // 获取分类详情
  const { category, error } = await getCategoryById(params.id);

  // 如果分类不存在，显示404页面
  if (!category) {
    return notFound();
  }

  return (
    <main className="min-h-screen bg-muted/40 p-4 md:p-8">
      <div className="container mx-auto max-w-7xl">
        <CategoryDetail category={category} />
      </div>
    </main>
  );
} 