import { Shield, Users, Calendar, Video } from "lucide-react";

const FEATURES = [
  { icon: Shield, title: "A Safe Space to Share", desc: "Speak openly without fear of judgment. Your conversations stay private and confidential." },
  { icon: Users, title: "Find the Right Support", desc: "Connect with listeners or qualified professionals who understand your needs." },
  { icon: Calendar, title: "Support on Your Time", desc: "Book sessions easily whenever life feels overwhelming or you simply need someone." },
  { icon: Video, title: "Talk Your Way", desc: "We help you connect via chat, voice, or video — whatever feels comfortable for you." },
];

export default function Features() {
  return (
    <section id="features" className="py-16" style={{ backgroundColor: "#E0F0E0" }}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="font-display text-2xl sm:text-3xl font-bold mb-2 animate-fade-in-up" style={{ color: "#1F2937" }}>
            How BreathingPlace Supports You
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <div 
                key={f.title} 
                className="rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 group hover:scale-105 animate-fade-in-up"
                style={{ animationDelay: `${i * 0.1}s`, backgroundColor: "#F0F0F0" }}
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-heading font-semibold text-sm mb-2" style={{ color: "#1F2937" }}>{f.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: "#6B7280" }}>{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}