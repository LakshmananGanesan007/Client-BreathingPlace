import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Clock, Heart } from "lucide-react";
import moment from "moment";
import ReactMarkdown from 'react-markdown';

export default function BlogPostPage() {
  const { slug } = useParams();

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["blog-post", slug],
    queryFn: () => base44.entities.BlogPost.filter({ slug, published: true }),
  });

  const post = posts[0];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f7f5f0] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-[#f7f5f0] flex flex-col items-center justify-center px-6">
        <h1 className="text-3xl font-display font-bold text-gray-900 mb-4">Post not found</h1>
        <p className="text-gray-500 mb-8">The blog post you're looking for doesn't exist or is not published.</p>
        <Link to="/blog">
          <Button className="rounded-full">Back to Blog</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center group-hover:scale-110 transition-transform">
              <Heart className="w-4 h-4 text-white" />
            </div>
            <span className="font-display text-lg font-semibold text-gray-900">BreathingPlace</span>
          </Link>
          <Link to="/blog">
            <Button variant="ghost" size="sm" className="gap-2 text-gray-600 hover:text-primary">
              <ArrowLeft className="w-3.5 h-3.5" /> All Posts
            </Button>
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <header className="mb-10 text-center">
          {post.tag && (
            <Badge className="bg-primary/10 text-primary border-0 mb-6 px-3 py-1 text-xs font-medium">
              {post.tag}
            </Badge>
          )}
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-gray-900 mb-6 leading-tight">
            {post.title}
          </h1>
          <div className="flex items-center justify-center gap-4 text-sm text-gray-500 flex-wrap">
            {post.author_name && (
              <span className="font-medium text-gray-900">By {post.author_name}</span>
            )}
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span>{post.created_date ? moment(post.created_date).format("MMM D, YYYY") : "Recent"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>{post.read_time || "5 min read"}</span>
            </div>
          </div>
        </header>

        {post.cover_image_url && (
          <div className="mb-12 rounded-2xl overflow-hidden shadow-lg border border-gray-100">
            <img 
              src={post.cover_image_url} 
              alt={post.title} 
              className="w-full h-[400px] object-cover" 
            />
          </div>
        )}

        <article className="prose prose-lg prose-slate mx-auto max-w-none prose-headings:font-display prose-headings:font-bold prose-a:text-primary">
          <ReactMarkdown>
            {post.content}
          </ReactMarkdown>
        </article>
      </main>

      <div className="bg-gradient-to-r from-primary/5 to-primary/10 py-16 text-center px-6 mt-16 border-t border-gray-100">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-display text-2xl font-bold text-gray-900 mb-3">Find Your Balance</h2>
          <p className="text-gray-500 mb-6">Talk to someone who understands what you're going through.</p>
          <div className="flex justify-center gap-4">
            <Link to="/find-support">
              <Button className="bg-primary text-white rounded-full px-8 shadow-md hover:shadow-lg transition-shadow">
                Find Support
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}