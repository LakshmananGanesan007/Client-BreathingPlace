import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/EmptyState";
import { Heart, ArrowLeft, Info, Users, Target, Eye } from "lucide-react";

const TEAM_MEMBERS = [
  {
    name: "Dr. Priya Sharma",
    designation: "CEO & Founder",
    description: "Clinical psychologist with 15+ years of experience. Passionate about making mental health support accessible to all.",
    photo: "https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=400&q=80",
  },
  {
    name: "Rahul Mehta",
    designation: "Chief Operations Officer",
    description: "Healthcare operations expert dedicated to building systems that put people's wellbeing first.",
    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80",
  },
  {
    name: "Dr. Anjali Reddy",
    designation: "Lead Therapist",
    description: "Specializes in anxiety and trauma therapy. Believes in the power of compassionate listening.",
    photo: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80",
  },
];

export default function AboutPage() {
  const { data: sections = [], isLoading } = useQuery({
    queryKey: ["about-content"],
    queryFn: () => base44.entities.AboutContent.list("order"),
  });

  const defaultSections = [
    {
      section: "mission",
      title: "Our Mission",
      body: "BreathingPlace was built with a simple belief: mental health support should be accessible, human, and judgment-free. We connect people with the right professionals and emotional support — on their terms.",
      image_url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&q=80",
    },
    {
      section: "vision",
      title: "Our Vision",
      body: "A world where no one carries their pain in silence. Where finding emotional support is as natural as reaching out to a friend — safe, immediate, and human.",
      image_url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80",
    },
  ];

  const displaySections = sections.length > 0 ? sections : defaultSections;

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
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
            <Info className="w-3.5 h-3.5" />
            About Us
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            About BreathingPlace
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto leading-relaxed">
            A safe place to breathe, speak, and feel heard.
          </p>
        </div>
      </div>

      {/* Mission & Vision Sections */}
      <div className="max-w-6xl mx-auto px-6 py-16 space-y-20">
        {isLoading ? (
          <div className="space-y-10">
            {[1, 2].map(i => (
              <div key={i} className="h-64 bg-white rounded-2xl animate-pulse border border-gray-100" />
            ))}
          </div>
        ) : (
          displaySections.map((s, idx) => (
            <div 
              key={s.id || s.section} 
              className={`grid lg:grid-cols-2 gap-12 items-center ${idx % 2 !== 0 ? "" : ""}`}
            >
              {idx % 2 === 0 ? (
                <>
                  <div className="space-y-4">
                    <span className="text-xs font-medium text-primary uppercase tracking-widest">
                      {s.section}
                    </span>
                    <h2 className="font-display text-3xl font-bold text-gray-900">
                      {s.title}
                    </h2>
                    {s.subtitle && (
                      <p className="text-lg text-gray-600 font-medium">{s.subtitle}</p>
                    )}
                    {s.body && (
                      <p className="text-gray-500 leading-relaxed text-base">
                        {s.body}
                      </p>
                    )}
                  </div>
                  {s.image_url ? (
                    <img 
                      src={s.image_url} 
                      alt={s.title} 
                      className="rounded-2xl h-80 w-full object-cover shadow-lg hover:shadow-xl transition-shadow" 
                    />
                  ) : (
                    <div className="rounded-2xl h-80 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                      <Info className="w-16 h-16 text-primary/30" />
                    </div>
                  )}
                </>
              ) : (
                <>
                  {s.image_url ? (
                    <img 
                      src={s.image_url} 
                      alt={s.title} 
                      className="rounded-2xl h-80 w-full object-cover shadow-lg hover:shadow-xl transition-shadow" 
                    />
                  ) : (
                    <div className="rounded-2xl h-80 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                      <Info className="w-16 h-16 text-primary/30" />
                    </div>
                  )}
                  <div className="space-y-4">
                    <span className="text-xs font-medium text-primary uppercase tracking-widest">
                      {s.section}
                    </span>
                    <h2 className="font-display text-3xl font-bold text-gray-900">
                      {s.title}
                    </h2>
                    {s.subtitle && (
                      <p className="text-lg text-gray-600 font-medium">{s.subtitle}</p>
                    )}
                    {s.body && (
                      <p className="text-gray-500 leading-relaxed text-base">
                        {s.body}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* Core Values */}
      <div className="bg-white py-16 px-6 my-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold text-gray-900 mb-3">Our Core Values</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              The principles that guide everything we do
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { icon: Heart, title: "Compassion", desc: "We approach every interaction with empathy and understanding." },
              { icon: Target, title: "Accessibility", desc: "Mental health support should be available to everyone, everywhere." },
              { icon: Users, title: "Community", desc: "Healing happens in connection with others, not in isolation." },
            ].map((value) => (
              <div 
                key={value.title} 
                className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-8 text-center hover:shadow-lg transition-shadow"
              >
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <value.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-heading font-semibold text-lg text-gray-900 mb-2">
                  {value.title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">{value.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Team Section */}
      <div className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold text-gray-900 mb-3">Meet Our Team</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              Dedicated professionals committed to your wellbeing
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {TEAM_MEMBERS.map((member) => (
              <div 
                key={member.name} 
                className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-300 group"
              >
                <div className="relative overflow-hidden">
                  <img 
                    src={member.photo} 
                    alt={member.name} 
                    className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-500" 
                  />
                </div>
                <div className="p-6">
                  <h3 className="font-heading font-semibold text-lg text-gray-900 mb-1">
                    {member.name}
                  </h3>
                  <p className="text-primary text-sm font-medium mb-3">{member.designation}</p>
                  <p className="text-gray-500 text-sm leading-relaxed">{member.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-primary/5 to-primary/10 py-16 text-center px-6 mt-12">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-display text-2xl font-bold text-gray-900 mb-3">
            Ready to Take the First Step?
          </h2>
          <p className="text-gray-500 mb-6">
            Join our community and find the support you deserve.
          </p>
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