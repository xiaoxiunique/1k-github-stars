"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { User, Plus, Loader2, Trash2, Edit, ListFilter } from "lucide-react";
import { createCategory, getUserCategories, deleteCategory } from "../actions";

interface UserProfileProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    id: string;
  };
}

interface Category {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  userId: string;
}

export function UserProfile({ user }: UserProfileProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState("");

  // 获取用户的分类
  useEffect(() => {
    async function fetchCategories() {
      setLoading(true);
      try {
        const response = await getUserCategories();
        if (response.categories) {
          setCategories(response.categories);
        }
      } catch (err) {
        console.error("获取分类失败:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchCategories();
  }, []);

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      if (!formData.name.trim()) {
        setError("分类名称不能为空");
        return;
      }

      const result = await createCategory({
        name: formData.name,
        description: formData.description,
      });

      if (result.success) {
        // 添加新分类到列表
        setCategories(prev => [...prev, result.category]);
        // 重置表单并关闭对话框
        setFormData({ name: "", description: "" });
        setIsOpen(false);
      } else {
        setError(result.error || "创建分类失败");
      }
    } catch (err) {
      console.error("创建分类错误:", err);
      setError("创建分类时出现错误");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 处理分类删除
  const handleDeleteCategory = async (categoryId: string) => {
    if (confirm("确定要删除这个分类吗？")) {
      try {
        const result = await deleteCategory(categoryId);
        if (result.success) {
          setCategories(prev => prev.filter(cat => cat.id !== categoryId));
        } else {
          alert(result.error || "删除分类失败");
        }
      } catch (err) {
        console.error("删除分类错误:", err);
        alert("删除分类时出现错误");
      }
    }
  };

  // 查看分类详情
  const viewCategory = (categoryId: string) => {
    router.push(`/category/${categoryId}`);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
        <Avatar className="h-20 w-20">
          {user.image ? (
            <AvatarImage src={user.image} alt={user.name || "用户头像"} />
          ) : (
            <AvatarFallback>
              <User className="h-8 w-8" />
            </AvatarFallback>
          )}
        </Avatar>
        <div>
          <h1 className="text-3xl font-bold">{user.name || "GitHub用户"}</h1>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <Tabs defaultValue="categories" className="w-full">
        <TabsList>
          <TabsTrigger value="categories">我的分类</TabsTrigger>
          <TabsTrigger value="settings">账户设置</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="py-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">我的关注分类</h2>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  创建新分类
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>创建新的关注分类</DialogTitle>
                    <DialogDescription>
                      创建一个新的分类来组织和跟踪您感兴趣的GitHub项目
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">分类名称 *</Label>
                      <Input 
                        id="name" 
                        placeholder="例如: AI项目、工具库等" 
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">分类描述</Label>
                      <Textarea 
                        id="description" 
                        placeholder="描述这个分类的主题和收集目标..." 
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      />
                    </div>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                  </div>
                  <DialogFooter>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsOpen(false)}
                      disabled={isSubmitting}
                    >
                      取消
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          创建中...
                        </>
                      ) : "创建分类"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">加载分类...</span>
            </div>
          ) : categories.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map(category => (
                <Card key={category.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-xl">{category.name}</CardTitle>
                      <div className="flex space-x-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8" 
                          onClick={() => handleDeleteCategory(category.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardDescription className="text-sm text-muted-foreground">
                      创建于 {new Date(category.createdAt).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <p className="text-sm text-muted-foreground line-clamp-2 min-h-[3em]">
                      {category.description || "暂无描述"}
                    </p>
                  </CardContent>
                  <CardFooter className="pt-3 border-t">
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={() => viewCategory(category.id)}
                    >
                      <ListFilter className="mr-2 h-4 w-4" />
                      查看项目
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border rounded-lg bg-muted/20">
              <ListFilter className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
              <h3 className="mt-4 text-lg font-medium">暂无分类</h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                创建您的第一个分类，开始收集和组织您感兴趣的GitHub项目
              </p>
              <Button className="mt-6" onClick={() => setIsOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                创建分类
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings" className="py-4">
          <Card>
            <CardHeader>
              <CardTitle>账户设置</CardTitle>
              <CardDescription>管理您的账户偏好和设置</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-medium">连接的账户</h3>
                <div className="flex items-center p-2 rounded-md bg-muted/50">
                  <div className="flex items-center flex-1 gap-2">
                    <svg 
                      className="h-5 w-5" 
                      viewBox="0 0 24 24" 
                      fill="currentColor" 
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385c.6.105.825-.255.825-.57c0-.285-.015-1.23-.015-2.235c-3.015.555-3.795-.735-4.035-1.41c-.135-.345-.72-1.41-1.23-1.695c-.42-.225-1.02-.78-.015-.795c.945-.015 1.62.87 1.845 1.23c1.08 1.815 2.805 1.305 3.495.99c.105-.78.42-1.305.765-1.605c-2.67-.3-5.46-1.335-5.46-5.925c0-1.305.465-2.385 1.23-3.225c-.12-.3-.54-1.53.12-3.18c0 0 1.005-.315 3.3 1.23c.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23c.66 1.65.24 2.88.12 3.18c.765.84 1.23 1.905 1.23 3.225c0 4.605-2.805 5.625-5.475 5.925c.435.375.81 1.095.81 2.22c0 1.605-.015 2.895-.015 3.3c0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                    </svg>
                    <span>GitHub</span>
                  </div>
                  <span className="px-2 py-1 rounded-md bg-primary/10 text-primary text-xs">已连接</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">保存设置</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 