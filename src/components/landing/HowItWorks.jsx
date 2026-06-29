import { Heart, Star, Users, MessageCircle, Shield, Check, ArrowRight, Facebook, Twitter, Linkedin, Youtube, AlertCircle, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import logo from "@/assets/logo.png";

const TRUST = [
  { icon: Shield, title: "Safe and Confidential", desc: "Your privacy is our priority." },
  { icon: Heart, title: "No Judgment", desc: "You are accepted exactly as you are." },
  { icon: Star, title: "Support at Your Pace", desc: "There's no rush. You do you." },
  { icon: MessageCircle, title: "Real Human Connection", desc: "Because real conversations create real healing." },
];

const STEPS = [
  { num: "01", title: "Tell Us How You're Feeling", desc: "Share what you're going through so we can understand how to support you better." },
  { num: "02", title: "Choose What Feels Right for You", desc: "Select the kind of support you feel comfortable with — emotional listening or professional guidance." },
  { num: "03", title: "Connect With the Right Person", desc: "Find someone who understands your needs and makes you feel heard." },
  { num: "04", title: "Take a Breath and Talk", desc: "Begin your conversation through chat, voice, or video — in a way that feels safe for you." },
];

export default function HowItWorks({ howWorksImg }) {
  return (
    <section id="how-it-works" className="py-16" style={{ backgroundColor: "#F0F0F0" }}>
      <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
        <div className="relative rounded-3xl overflow-hidden shadow-xl group animate-fade-in-left">
          <img src={howWorksImg} alt="Peaceful nature path" className="w-full h-[420px] object-cover group-hover:scale-105 transition-transform duration-700" />
          <div className="absolute bottom-6 left-6 right-6 bg-white/90 backdrop-blur rounded-xl p-4 group-hover:shadow-lg transition-shadow">
            <p className="text-sm font-semibold text-gray-800">No pressure. No judgment.</p>
            <p className="text-xs text-gray-500 mt-0.5">Just support at your pace.</p>
          </div>
        </div>
        <div className="animate-fade-in-right">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-gray-900 mb-2 animate-fade-in-up">
            Taking Your First Step
          </h2>
          <p className="text-gray-500 text-sm mb-8 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            Getting support shouldn't be complicated. We're here to make it simple, comfortable, and safe.
          </p>
          <div className="space-y-6">
            {STEPS.map((s, i) => (
              <div key={s.num} className="flex gap-4 items-start group animate-fade-in-up" style={{ animationDelay: `${0.2 + i * 0.1}s` }}>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:bg-primary/20 transition-all">
                  <span className="text-xs font-bold text-primary">{s.num}</span>
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-gray-900 text-sm mb-1 group-hover:text-primary transition-colors">{s.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function TrustSection() {
  return (
    <section className="py-16 text-center" style={{ backgroundColor: "#F0E0D0" }}>
      <div className="max-w-5xl mx-auto px-6">
        <h2 className="font-display text-2xl sm:text-3xl font-bold mb-2 animate-fade-in-up" style={{ color: "#1F2937" }}>
          You Are Not Alone
        </h2>
        <p className="text-sm mb-12 animate-fade-in-up" style={{ animationDelay: "0.1s", color: "#6B7280" }}>
          Sometimes healing begins with simply being heard.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {TRUST.map((t, i) => {
            const Icon = t.icon;
            return (
              <div 
                key={t.title} 
                className="rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 group hover:scale-105 animate-fade-in-up"
                style={{ animationDelay: `${i * 0.1}s`, backgroundColor: "#F0F0F0" }}
              >
                <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-heading font-semibold text-sm mb-1" style={{ color: "#1F2937" }}>{t.title}</h3>
                <p className="text-xs" style={{ color: "#6B7280" }}>{t.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function TherapistsSection({ therapistImg, therapistImg2 }) {
  return (
    <section id="therapists" className="py-16" style={{ backgroundColor: "#E0F0E0" }}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div className="animate-fade-in-right">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-5 animate-scale-in">
              For Counsellors and Therapists
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-gray-900 mb-4 animate-fade-in-up">
              Become Part of a Healing Space
            </h2>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
              Join a trusted environment where individuals seek understanding, emotional relief, and professional guidance.
            </p>
            <ul className="space-y-3 mb-8">
              {[
                "Support people in meaningful ways",
                "Flexible and secure sessions",
                "Build trusted connections",
                "Grow your professional impact",
              ].map((item, i) => (
                <li key={item} className="flex items-center gap-2.5 text-sm text-gray-700 animate-fade-in-up" style={{ animationDelay: `${0.2 + i * 0.1}s` }}>
                  <Check className="w-4 h-4 text-primary flex-shrink-0" /> {item}
                </li>
              ))}
            </ul>
            <Link to="/therapist-landing">
              <Button 
                className="bg-primary text-white rounded-full px-8 font-medium shadow-md hover:shadow-lg transition-all hover:scale-105"
              >
                Learn More
              </Button>
            </Link>
          </div>
          <div className="animate-fade-in-left">
            <div className="grid grid-cols-2 gap-3">
              <img src={therapistImg} alt="Therapist session" className="rounded-2xl h-[280px] w-full object-cover shadow-md col-span-2 hover:shadow-xl transition-all duration-500" />
              <img src={therapistImg2} alt="Professional therapist" className="rounded-2xl h-[160px] w-full object-cover shadow-md hover:shadow-xl transition-all duration-500" />
              <div className="rounded-2xl bg-primary/10 h-[160px] flex items-center justify-center p-5 hover:shadow-lg transition-all">
                <p className="text-primary font-display text-lg font-semibold text-center leading-snug">"Healing happens here."</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function BlogSection() {
  // Fetch real blog posts from Supabase database
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["blog-posts-landing"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(4);
      
      if (error) throw error;
      return data || [];
    },
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
            {posts.map((post, i) => (
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

export function FinalCTA({ sofaImg, onTalkFreely, onFindSupport }) {
  return (
    <section className="py-20" style={{ backgroundColor: "#F0F0F0" }}>
      <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-10 items-center">
        <div className="order-2 lg:order-1 animate-fade-in-left">
          <img 
            src={sofaImg} 
            alt="Cozy comfortable sofa" 
            className="rounded-3xl h-[340px] w-full object-cover shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-[1.02]" 
          />
        </div>
        <div className="order-1 lg:order-2 animate-fade-in-right">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-4 animate-fade-in-up">
            You don't have to figure everything out alone.
          </h2>
          <p className="text-gray-500 text-sm mb-8 leading-relaxed animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            Whether you need someone to listen or professional guidance, BreathingPlace is here for you.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              size="lg" 
              className="bg-primary text-white rounded-full px-8 font-medium shadow-md hover:shadow-lg transition-all hover:scale-105" 
              onClick={onTalkFreely}
            >
              Talk Freely
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="rounded-full px-8 border-gray-300 font-medium hover:shadow-md transition-all hover:scale-105" 
              onClick={onFindSupport}
            >
              Find Support
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-green-700 py-12" style={{ backgroundColor: "#2E8B57" }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-8 mb-6">
          <div className="col-span-2 sm:col-span-4 lg:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 bg-white rounded-md flex items-center justify-center p-1 shadow-sm">
                <img src={logo} alt="BreathingPlace Logo" className="w-full h-full object-contain" />
              </div>
              <span className="font-display font-semibold text-white text-lg">BreathingPlace</span>
            </div>
            <p className="text-xs text-green-100 leading-relaxed">A safe place to breathe, speak, and feel heard.</p>
          </div>
          {[
            { title: "Quick Links", links: ["Home", "Features", "How It Works", "Blog", "About Us"] },
            { title: "Support", links: ["Help Center", "Privacy Policy", "Terms of Service", "Contact Us"] },
            { title: "For Therapists", links: ["Join Our Network", "Therapist Resources", "Guidelines"] },
          ].map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-white mb-3">{col.title}</h4>
              <ul className="space-y-2 text-xs text-green-100">
                {col.links.map(l => (
                  <li key={l}><a href="#" className="hover:text-white transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Stay Connected</h4>
            <div className="flex gap-3 flex-wrap">
              <a href="#" className="w-8 h-8 rounded-full bg-white/20 hover:bg-white hover:text-primary transition-all hover:scale-110 flex items-center justify-center text-white"><Facebook className="w-4 h-4" /></a>
              <a href="#" className="w-8 h-8 rounded-full bg-white/20 hover:bg-white hover:text-primary transition-all hover:scale-110 flex items-center justify-center text-white"><Twitter className="w-4 h-4" /></a>
              <a href="#" className="w-8 h-8 rounded-full bg-white/20 hover:bg-white hover:text-primary transition-all hover:scale-110 flex items-center justify-center text-white"><Linkedin className="w-4 h-4" /></a>
              <a href="#" className="w-8 h-8 rounded-full bg-white/20 hover:bg-white hover:text-primary transition-all hover:scale-110 flex items-center justify-center text-white"><Youtube className="w-4 h-4" /></a>
            </div>
          </div>
        </div>

        {/* Professional Right-Aligned Disclaimer */}
        <div className="flex justify-end mb-8 mt-4">
          <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded-lg max-w-2xl shadow-sm">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <p className="text-xs text-red-800 leading-relaxed text-left font-medium">
              Disclaimer: BreathingPlace provides emotional wellness and counselling support. We do not provide psychiatric diagnosis, clinical assessment, medical treatment, or emergency mental health services.
            </p>
          </div>
        </div>

        <div className="border-t border-green-700 pt-6 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-green-200">
            © <a href="https://www.ibm.com/in-en" target="_blank" rel="noopener noreferrer" className="hover:text-white hover:underline transition-colors font-medium">2026 BreathingPlace</a>. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}