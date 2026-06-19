import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import EmptyState from "@/components/EmptyState";
import { Heart, ArrowLeft, FileText, Clock, Calendar, ArrowRight } from "lucide-react";
import moment from "moment";

export default function BlogPage() {
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["blog-posts"],
    queryFn: () => base44.entities.BlogPost.filter({ published: true }, "-created_date"),
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f7f5f0] to-white">
      {/* Navbar */}
      <nav className="bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center group-hover:scale-110 transition-transform">
              <Heart className="w-4 h-4 text-white" />
            </div>
            <span className="font-display text-lg font-semibold text-gray-900">BreathingPlace</span>
          </Link>
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2 text-gray-600 hover:text-primary">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="bg-white py-20 text-center px-6">
        <div className="max-w-3xl mx-auto">
          <Badge className="bg-primary/10 text-primary border-0 mb-4 px-3 py-1 text-xs font-medium">Our Blog</Badge>
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-gray-900 mb-4">Quiet Thoughts</h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto leading-relaxed">
            Thoughts, emotions, and struggles we often carry silently. You're not alone in what you feel.
          </p>
        </div>
      </div>

      {/* Blog Grid */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                <div className="h-56 bg-muted animate-pulse" />
                <div className="p-6 space-y-3">
                  <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12">
            <EmptyState 
              icon={FileText} 
              title="No blog posts yet" 
              description="New articles will appear here as they are published. Check back soon." 
            />
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map(post => (
              <Link to={post.slug ? `/blog/${post.slug}` : `/blog`} key={post.id}>
                <article 
                  className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-300 group cursor-pointer h-full"
                >
                  <div className="relative overflow-hidden">
                  {post.cover_image_url ? (
                    <img 
                      src={post.cover_image_url} 
                      alt={post.title} 
                      className="w-full h-56 object-cover group-hover:scale-110 transition-transform duration-500" 
                    />
                  ) : (
                    <div className="w-full h-56 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                      <FileText className="w-12 h-12 text-primary/30" />
                    </div>
                  )}
                  <div className="absolute top-4 left-4 flex gap-2">
                    {post.tag && (
                      <Badge className="bg-primary text-white border-0 text-xs px-2.5 py-1 shadow-sm">
                        {post.tag}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-3 text-xs text-gray-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{post.created_date ? moment(post.created_date).format("MMM D, YYYY") : "Recent"}</span>
                    <span>•</span>
                    <Clock className="w-3.5 h-3.5" />
                    <span>{post.read_time || "5 min read"}</span>
                  </div>
                  <h2 className="font-heading font-semibold text-gray-900 text-lg leading-snug mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="text-sm text-gray-500 leading-relaxed line-clamp-3 mb-4">
                      {post.excerpt}
                    </p>
                  )}
                  {post.author_name && (
                    <p className="text-xs text-gray-400 mb-4">By {post.author_name}</p>
                  )}
                  <div className="flex items-center gap-2 text-primary text-sm font-medium group-hover:gap-3 transition-all">
                    <span>Read More</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </article>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-primary/5 to-primary/10 py-16 text-center px-6 mt-12">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-display text-2xl font-bold text-gray-900 mb-3">Ready to Start Your Journey?</h2>
          <p className="text-gray-500 mb-6">Join our community and find the support you deserve.</p>
          <div className="flex justify-center gap-4">
            <Link to="/register">
              <Button className="bg-primary text-white rounded-full px-8 shadow-md hover:shadow-lg transition-shadow">
                Get Started
              </Button>
            </Link>
            <Link to="/">
              <Button variant="outline" className="rounded-full px-8 border-gray-300">
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-12 bg-white mt-12">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <Heart className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-display font-semibold text-gray-900">BreathingPlace</span>
          </div>
          <p className="text-xs text-gray-500">© 2026 BreathingPlace. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}