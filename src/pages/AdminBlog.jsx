import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import RoleGuard from "@/components/RoleGuard";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, FileText, Eye, EyeOff, Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

const EMPTY_POST = { 
  title: "", 
  slug: "", 
  excerpt: "", 
  content: "", 
  cover_image_url: "", 
  tag: "", 
  read_time: "5 min read", 
  published: false, 
  author_name: "" 
};

function CoverImageUpload({ value, onChange }) {
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.secure_url) {
        onChange(data.secure_url);
        toast.success("Image uploaded!");
      } else {
        toast.error("Image upload failed.");
      }
    } catch {
      toast.error("Image upload failed. Please try again.");
    }
    setUploading(false);
    e.target.value = "";
  };

  return (
    <div>
      <Label>Cover Image</Label>
      <div className="mt-1">
        {value ? (
          <div className="relative inline-block">
            <img src={value} alt="Cover" className="w-full h-40 object-cover rounded-lg border border-border" />
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <label className="w-full h-32 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary transition-colors cursor-pointer">
            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
            <span className="text-sm">{uploading ? "Uploading..." : "Click to upload image"}</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading} />
          </label>
        )}
      </div>
    </div>
  );
}

function BlogContent() {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState(EMPTY_POST);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["blog-posts-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from('blog_posts').select('*').order('created_at', { ascending: false });
      if (error && error.code !== 'PGRST116') throw error; // Ignore not found on empty table
      return data || [];
    },
  });

  const save = useMutation({
    mutationFn: async (data) => {
      // Strictly map the payload to ensure no accidental IDs or weird Base44 metadata is sent to Supabase
      const payload = {
        title: data.title,
        slug: data.slug || data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
        excerpt: data.excerpt,
        content: data.content,
        cover_image_url: data.cover_image_url,
        tag: data.tag,
        read_time: data.read_time,
        published: data.published,
        author_name: data.author_name
      };
      
      let res;
      if (dialog?.mode === "edit") {
        res = await supabase.from('blog_posts').update(payload).eq('id', dialog.data.id);
      } else {
        res = await supabase.from('blog_posts').insert([payload]);
      }
      
      if (res.error) throw res.error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog-posts-admin"] });
      queryClient.invalidateQueries({ queryKey: ["blog-posts"] });
      queryClient.invalidateQueries({ queryKey: ["blog-posts-landing"] });
      const msg = dialog?.mode === "edit" ? "Post updated successfully!" : "Post created successfully!";
      setDialog(null);
      toast.success(msg);
    },
    onError: (error) => {
      console.error("Supabase Save Error:", error);
      toast.error(`Failed to save: ${error.message || "Please check your database."}`);
    }
  });

  const remove = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('blog_posts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog-posts-admin"] });
      queryClient.invalidateQueries({ queryKey: ["blog-posts"] });
      queryClient.invalidateQueries({ queryKey: ["blog-posts-landing"] });
      toast.success("Post deleted.");
    },
    onError: () => toast.error("Unable to delete post. Please try again.")
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, published }) => {
      const { error } = await supabase.from('blog_posts').update({ published }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { published }) => {
      queryClient.invalidateQueries({ queryKey: ["blog-posts-admin"] });
      queryClient.invalidateQueries({ queryKey: ["blog-posts"] });
      queryClient.invalidateQueries({ queryKey: ["blog-posts-landing"] });
      toast.success(published ? "Post published!" : "Post hidden.");
    },
    onError: () => toast.error("Unable to update status. Please try again.")
  });

  function openCreate() { setForm(EMPTY_POST); setDialog({ mode: "create" }); }
  function openEdit(post) { setForm({ ...post }); setDialog({ mode: "edit", data: post }); }
  const f = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target ? e.target.value : e }));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Blog Management</h1>
          <p className="text-muted-foreground mt-1 text-sm">Create and manage blog posts. Only published posts appear on the landing page.</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="w-4 h-4" /> New Post</Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : posts.length === 0 ? (
        <div className="bg-card rounded-xl border border-border">
          <EmptyState icon={FileText} title="No blog posts yet" description="Create your first blog post." action={<Button size="sm" onClick={openCreate} className="gap-2"><Plus className="w-3 h-3" /> Create First Post</Button>} />
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map(post => (
            <div key={post.id} className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
              {post.cover_image_url
                ? <img src={post.cover_image_url} alt={post.title} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                : <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0"><FileText className="w-6 h-6 text-muted-foreground" /></div>
              }
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-medium text-sm truncate">{post.title}</h3>
                  {post.tag && <Badge variant="secondary" className="text-xs">{post.tag}</Badge>}
                  <Badge className={`border-0 text-xs ${post.published ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                    {post.published ? <><Eye className="w-3 h-3 mr-1" />Published</> : <><EyeOff className="w-3 h-3 mr-1" />Draft</>}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{post.excerpt || "No excerpt"}</p>
                <p className="text-xs text-muted-foreground">{post.read_time}{post.author_name ? ` · ${post.author_name}` : ""}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="outline" size="sm"
                  onClick={() => togglePublish.mutate({ id: post.id, published: !post.published })}
                  disabled={togglePublish.isPending}
                  className="text-xs gap-1"
                >
                  {post.published ? <><EyeOff className="w-3 h-3" /> Hide</> : <><Eye className="w-3 h-3" /> Publish</>}
                </Button>
                <Button variant="outline" size="sm" onClick={() => openEdit(post)} className="gap-1 text-xs"><Edit className="w-3 h-3" /> Edit</Button>
                <Button variant="ghost" size="sm" onClick={() => remove.mutate(post.id)} className="text-destructive h-8 w-8 p-0" disabled={remove.isPending}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!dialog} onOpenChange={() => setDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">{dialog?.mode === "edit" ? "Edit Post" : "New Blog Post"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label>Title <span className="text-destructive">*</span></Label><Input className="mt-1" value={form.title} onChange={f("title")} placeholder="Post title" /></div>
              <div><Label>Tag</Label><Input className="mt-1" value={form.tag} onChange={f("tag")} placeholder="e.g. Mindset, Anxiety" /></div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label>Author Name</Label><Input className="mt-1" value={form.author_name} onChange={f("author_name")} placeholder="e.g. Dr. Smith" /></div>
              <div><Label>Read Time</Label><Input className="mt-1" value={form.read_time} onChange={f("read_time")} placeholder="e.g. 5 min read" /></div>
            </div>
            <CoverImageUpload value={form.cover_image_url} onChange={(url) => setForm(prev => ({ ...prev, cover_image_url: url }))} />
            <div><Label>Excerpt</Label><Textarea className="mt-1" rows={2} value={form.excerpt} onChange={f("excerpt")} placeholder="Short summary shown on the blog card..." /></div>
            <div><Label>Full Content</Label><Textarea className="mt-1" rows={8} value={form.content} onChange={f("content")} placeholder="Write the full blog post here..." /></div>
            <div className="flex items-center gap-3">
              <Switch checked={form.published} onCheckedChange={(v) => setForm(prev => ({ ...prev, published: v }))} />
              <Label>Published (visible on landing page)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
            <Button onClick={() => save.mutate(form)} disabled={!form.title.trim() || save.isPending}>
              {save.isPending ? "Saving..." : dialog?.mode === "edit" ? "Save Changes" : "Create Post"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminBlog() {
  return <RoleGuard allowedRoles={["super_admin", "admin"]}><BlogContent /></RoleGuard>;
}