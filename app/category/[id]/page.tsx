import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { redirect, notFound } from "next/navigation";
import { getCategoryById } from "../../actions";
import { CategoryDetail } from "../../components/CategoryDetail";

export default async function CategoryPage({
  params
}: {
  params: { id: string }
}) {
  const session = await getServerSession(authOptions);

  // Redirect to homepage if user is not logged in
  if (!session) {
    redirect("/");
  }

  // Get category details
  const { category, error } = await getCategoryById(params.id);

  // Show 404 page if category doesn't exist
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