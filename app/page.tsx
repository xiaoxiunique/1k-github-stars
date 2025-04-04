import { ThemeToggle } from "@/components/theme-toggle";
import { getRepositories, getTotal } from "./_actions";
import RepoList from "./components/RepoList";
import { Metadata } from "next";
import { LoginButton } from "@/components/login-button";

export const metadata: Metadata = {
  title: "GitHub Star Tracker | Track Popular GitHub Repositories",
  description:
    "Track and discover GitHub repositories with over 1,000 stars. Stay updated with the most popular open-source projects.",
  keywords:
    "GitHub, repositories, stars, open source, tracking, developer tools, AI search",
  openGraph: {
    title: "GitHub Star Tracker",
    description: "Track and discover GitHub repositories with over 1,000 stars",
    url: "https://1kgithub.com",
    siteName: "GitHub Star Tracker",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GitHub Star Tracker",
    description: "Track and discover GitHub repositories with over 1,000 stars",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function Home() {
  const reposData = await getRepositories(0, 50);
  const initialRepos = JSON.parse(JSON.stringify(reposData));
  const total = await getTotal();

  return (
    <main className="min-h-screen bg-muted/40 p-4 md:p-8">
      <div className="container mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">GitHub Star Tracker</h1>
            <p className="text-muted-foreground">
              Search for open source projects with 1000+ stars using keywords or{" "}
              <span className="text-purple-500 font-medium">
                AI natural language
              </span>
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <LoginButton />
          </div>
        </header>

        <RepoList initialRepos={initialRepos} total={total} />
      </div>
    </main>
  );
}
