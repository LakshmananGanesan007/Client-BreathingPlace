import { UserMinus, Brain, HeartCrack, Headphones, CloudRain } from "lucide-react";

const MOODS = [
  { icon: UserMinus, label: "Feeling Lonely", bg: "bg-violet-100", color: "text-violet-600" },
  { icon: Brain, label: "Stressed & Overwhelmed", bg: "bg-orange-100", color: "text-orange-500" },
  { icon: HeartCrack, label: "Heartbroken", bg: "bg-pink-100", color: "text-pink-600" },
  { icon: Brain, label: "Overthinking", bg: "bg-blue-100", color: "text-blue-600" },
  { icon: Headphones, label: "Need Someone to Talk To", bg: "bg-purple-100", color: "text-purple-600" },
  { icon: CloudRain, label: "Feeling Low", bg: "bg-slate-100", color: "text-slate-500" },
];

export default function MoodEntry({ selectedMood, onSelect }) {
  return (
    <section className="py-16 text-center" style={{ backgroundColor: "#F0F0F0" }}>
      <div className="max-w-4xl mx-auto px-6">
        <h2 className="font-display text-2xl sm:text-3xl font-bold mb-2 animate-fade-in-up" style={{ color: "#1F2937" }}>
          How Are You Feeling Today?
        </h2>
        <p className="text-sm mb-10 animate-fade-in-up" style={{ animationDelay: "0.1s", color: "#6B7280" }}>
          Whatever you're feeling, you don't have to carry it alone.
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
          {MOODS.map((m, i) => {
            const Icon = m.icon;
            return (
              <button
                key={m.label}
                onClick={() => onSelect(m.label)}
                className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer group hover:border-primary hover:shadow-sm animate-scale-in ${
                  selectedMood === m.label ? "border-primary shadow-sm" : "border-gray-200"
                }`}
                style={{ animationDelay: `${i * 0.05}s`, backgroundColor: "#F0F0F0" }}
              >
                <div className={`w-12 h-12 rounded-full ${m.bg} flex items-center justify-center transition-transform group-hover:scale-110`}>
                  <Icon className={`w-6 h-6 ${m.color}`} />
                </div>
                <span className="text-xs font-medium leading-tight text-center" style={{ color: "#6B7280" }}>
                  {m.label}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-xs mt-6 animate-fade-in-up" style={{ animationDelay: "0.5s", color: "#6B7280" }}>
          Choose how you feel and we'll help you find the right support.
        </p>
      </div>
    </section>
  );
}