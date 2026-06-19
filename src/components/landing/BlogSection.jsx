import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function BlogSection() {
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["blog-posts-landing"],
    queryFn: () => base44.entities.BlogPost.filter({ published: true }, "-created_date", 4),
  });

  return (
    <section id="blog" className="py-16" style={{ backgroundColor: "#F0F0E0" }}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-gray-900 animate-fade-in-up">Quiet Thoughts</h2>
            <p className="text-gray-500 text-sm mt-1 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
              Thoughts, emotions, and struggles we often carry silently.
            </p>
          </div>
          <Link to="/blog">
            <Button variant="ghost" className="gap-1 text-primary text-sm font-medium hidden sm:flex group">
              Explore More Thoughts 
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
        
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse">
                <div className="h-36 bg-gray-200" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-sm">Blog posts coming soon.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {posts.slice(0, 4).map((post, i) => (
              <Link to={post.slug ? `/blog/${post.slug}` : `/blog`} key={post.id}>
                <div 
                  className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer group hover:scale-105 animate-fade-in-up"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <div className="relative overflow-hidden">
                    {post.cover_image_url ? (
                      <img 
                        src={post.cover_image_url} 
                        alt={post.title} 
                        className="w-full h-36 object-cover group-hover:scale-110 transition-transform duration-500" 
                      />
                    ) : (
                      <div className="w-full h-36 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                        <FileText className="w-8 h-8 text-primary/30" />
                      </div>
                    )}
                    {post.tag && (
                      <span className="absolute top-3 left-3 bg-primary text-white text-[10px] font-medium px-2 py-0.5 rounded-full shadow-sm">
                        {post.tag}
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-heading font-semibold text-gray-900 text-sm leading-snug mb-2 group-hover:text-primary transition-colors line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-xs text-gray-400">{post.read_time || "5 min read"}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}