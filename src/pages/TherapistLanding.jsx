import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart, Check, Users, Clock, DollarSign, Globe, Award, Shield, ArrowRight, Video, MessageCircle, Phone, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

const HERO_IMG = "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&q=80";
const IMG1 = "https://images.unsplash.com/photo-1527613426441-4da17471b66a?w=600&q=80";
const IMG2 = "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=600&q=80";
const IMG3 = "https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=400&q=80";

const BENEFITS = [
  { icon: Users, title: "Make a Real Impact", desc: "Support individuals on their healing journey and create meaningful change in their lives." },
  { icon: Clock, title: "Flexible Schedule", desc: "Set your own availability and work at times that fit your lifestyle." },
  { icon: DollarSign, title: "Competitive Earnings", desc: "Set your own session fees and grow your income based on your expertise." },
  { icon: Globe, title: "Reach Global Clients", desc: "Connect with clients from around the world through our secure platform." },
  { icon: Shield, title: "Secure & Confidential", desc: "All sessions are encrypted and protected with enterprise-grade security." },
  { icon: Award, title: "Professional Growth", desc: "Expand your practice and build your reputation as a trusted therapist." },
];

const SESSION_MODES = [
  { icon: MessageCircle, title: "Chat Therapy", desc: "Text-based sessions for clients who prefer written communication." },
  { icon: Phone, title: "Voice Calls", desc: "Audio sessions for deeper connection without video." },
  { icon: Video, title: "Video Sessions", desc: "Face-to-face virtual sessions for the most personal experience." },
];

const REQUIREMENTS = [
  "Licensed therapist, counselor, or psychologist",
  "Minimum 2 years of clinical experience",
  "Valid professional certification",
  "Government-issued ID for verification",
  "Professional liability insurance (recommended)",
];

const STEPS = [
  { num: "01", title: "Submit Your Application", desc: "Complete your professional profile with qualifications and experience." },
  { num: "02", title: "Document Verification", desc: "Upload your certifications, license, and ID for admin review." },
  { num: "03", title: "Profile Approval", desc: "Our team reviews your application within 3-5 business days." },
  { num: "04", title: "Start Accepting Sessions", desc: "Once approved, set your availability and begin helping clients." },
];

const TESTIMONIALS = [
  {
    name: "Dr. Sarah Mitchell",
    role: "Clinical Psychologist",
    quote: "BreathingPlace has allowed me to reach clients I never could have before. The platform is secure, easy to use, and the support team is amazing.",
    rating: 5,
  },
  {
    name: "Rajesh Kumar",
    role: "Licensed Counselor",
    quote: "The flexibility is incredible. I can work from home, set my own hours, and still make a meaningful impact on people's lives.",
    rating: 5,
  },
  {
    name: "Dr. Priya Sharma",
    role: "Marriage & Family Therapist",
    quote: "I've built a thriving practice here. The platform handles all the technical aspects so I can focus on what I do best — helping people.",
    rating: 5,
  },
];

const FAQS = [
  {
    q: "What qualifications do I need?",
    a: "You must be a licensed therapist, counselor, or psychologist with at least 2 years of clinical experience. Valid certification and government ID are required for verification.",
  },
  {
    q: "How does payment work?",
    a: "You set your own session fees. Payments are processed securely through our platform, and you receive payouts directly to your bank account on a weekly basis.",
  },
  {
    q: "Can I choose my clients?",
    a: "Yes, you have full control over your availability and can accept or decline session requests based on your schedule and specialization.",
  },
  {
    q: "What support do you provide?",
    a: "We offer 24/7 technical support, malpractice insurance guidance, continuing education resources, and a community of fellow therapists for collaboration.",
  },
];

export default function TherapistLanding() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleJoinClick = () => {
    if (!user) {
      sessionStorage.setItem("pending_intent", "/join-support");
      navigate("/register");
      return;
    }
    navigate("/join-support");
  };

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
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-primary">
                Back to Home
              </Button>
            </Link>
            {user ? (
              <Button onClick={handleJoinClick} className="bg-primary text-white rounded-full px-6 shadow-md hover:shadow-lg transition-all">
                Start Application
              </Button>
            ) : (
              <Button onClick={() => { sessionStorage.setItem("pending_intent", "/join-support"); navigate("/register"); }} className="bg-primary text-white rounded-full px-6 shadow-md hover:shadow-lg transition-all">
                Sign Up to Join
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-6 bg-gradient-to-br from-primary/5 via-white to-primary/10">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div className="animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">
              <Heart className="w-3.5 h-3.5" /> For Therapists & Counselors
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              Make a Difference in People's Lives
            </h1>
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              Join a trusted platform where you can build your practice, set your own schedule, and provide accessible mental health support to people who need it most.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <Button 
                size="lg" 
                onClick={handleJoinClick}
                className="bg-primary text-white rounded-full px-8 font-medium shadow-md hover:shadow-lg transition-all hover:scale-105"
              >
                Become a Therapist <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="rounded-full px-8 border-gray-300 hover:shadow-md transition-all"
                onClick={() => document.getElementById("requirements")?.scrollIntoView({ behavior: "smooth" })}
              >
                View Requirements
              </Button>
            </div>

           

            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500 animate-fade-in-up" style={{ animationDelay: "0.6s" }}>
              <span className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Flexible Hours</span>
              <span className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Work from Anywhere</span>
              <span className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Competitive Pay</span>
            </div>
          </div>
          <div className="relative animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            <img 
              src={HERO_IMG} 
              alt="Professional therapist" 
              className="rounded-3xl shadow-2xl w-full h-[500px] object-cover"
            />
            <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">500+</p>
                  <p className="text-xs text-gray-500">Active Therapists</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold text-gray-900 mb-3">Why Join BreathingPlace?</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              We provide the tools and support you need to focus on what matters most — helping your clients heal and grow.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {BENEFITS.map((b, i) => {
              const Icon = b.icon;
              return (
                <div 
                  key={b.title}
                  className="bg-gradient-to-br from-primary/5 to-white rounded-2xl p-6 border border-primary/10 hover:shadow-xl transition-all duration-300 hover:scale-105 animate-fade-in-up"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-heading font-semibold text-lg text-gray-900 mb-2">{b.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{b.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Session Modes */}
      <section className="py-20 px-6 bg-gradient-to-br from-primary/5 via-white to-primary/10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold text-gray-900 mb-3">How You'll Connect with Clients</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              Offer multiple ways for clients to connect with you through our secure platform.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-8">
            {SESSION_MODES.map((m, i) => {
              const Icon = m.icon;
              return (
                <div 
                  key={m.title}
                  className="bg-white rounded-2xl p-8 border border-gray-100 hover:shadow-xl transition-all duration-300 hover:scale-105 text-center animate-fade-in-up"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-heading font-semibold text-xl text-gray-900 mb-2">{m.title}</h3>
                  <p className="text-gray-500 text-sm">{m.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Requirements */}
      <section id="requirements" className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div className="animate-fade-in-left">
            <h2 className="font-display text-3xl font-bold text-gray-900 mb-6">Requirements to Join</h2>
            <p className="text-gray-600 mb-8 text-base leading-relaxed">
              We maintain high standards to ensure quality care for all our clients. Here's what you'll need to become part of our network.
            </p>
            <div className="space-y-4">
              {REQUIREMENTS.map((req, i) => (
                <div key={req} className="flex items-start gap-3 animate-fade-in-up" style={{ animationDelay: `${i * 0.1}s` }}>
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <p className="text-gray-700 text-sm">{req}</p>
                </div>
              ))}
            </div>
            <Button 
              size="lg" 
              onClick={handleJoinClick}
              className="mt-8 bg-primary text-white rounded-full px-8 shadow-md hover:shadow-lg transition-all hover:scale-105"
            >
              Start Your Application
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4 animate-fade-in-right">
            <img src={IMG1} alt="Therapy session" className="rounded-2xl h-48 w-full object-cover shadow-lg" />
            <img src={IMG2} alt="Professional workspace" className="rounded-2xl h-48 w-full object-cover shadow-lg mt-8" />
            <img src={IMG3} alt="Therapist" className="rounded-2xl h-48 w-full object-cover shadow-lg" />
            <div className="rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 h-48 flex items-center justify-center p-6">
              <p className="text-primary font-display text-lg font-semibold text-center">"Helping others is the most rewarding work."</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 bg-gradient-to-br from-primary/5 via-white to-primary/10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold text-gray-900 mb-3">Your Journey to Becoming a Therapist</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              Four simple steps to start making a difference in people's lives.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {STEPS.map((s, i) => (
              <div 
                key={s.num}
                className="text-center animate-fade-in-up"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="w-16 h-16 rounded-full bg-primary text-white text-xl font-bold flex items-center justify-center mx-auto mb-4 shadow-lg">
                  {s.num}
                </div>
                <h3 className="font-heading font-semibold text-lg text-gray-900 mb-2">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold text-gray-900 mb-3">What Our Therapists Say</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              Join hundreds of mental health professionals who have built thriving practices with us.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {TESTIMONIALS.map((t, i) => (
              <div 
                key={t.name}
                className="bg-gradient-to-br from-primary/5 to-white rounded-2xl p-6 border border-primary/10 hover:shadow-xl transition-all animate-fade-in-up"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <svg key={j} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-4 italic">"{t.quote}"</p>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6 bg-gradient-to-br from-primary/5 via-white to-primary/10">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold text-gray-900 mb-3">Frequently Asked Questions</h2>
            <p className="text-gray-500">
              Everything you need to know about joining our platform.
            </p>
          </div>
          <div className="space-y-4">
            {FAQS.map((faq, i) => (
              <div 
                key={faq.q}
                className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition-all animate-fade-in-up"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <h3 className="font-heading font-semibold text-gray-900 mb-2">{faq.q}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Ready to Make a Difference?
          </h2>
          <p className="text-gray-500 mb-8 text-lg">
            Join our community of dedicated therapists and start helping people today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={handleJoinClick}
              className="bg-primary text-white rounded-full px-10 font-medium shadow-md hover:shadow-lg transition-all hover:scale-105"
            >
              Start Your Application
            </Button>
            <Link to="/about">
              <Button 
                size="lg" 
                variant="outline"
                className="rounded-full px-10 border-gray-300 hover:shadow-md transition-all"
              >
                Learn More About Us
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-12 bg-white">
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