import { Link, useLocation } from "react-router-dom";
import { Heart, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function Sidebar({ items, onClose, mobile = false }) {
  const location = useLocation();

  return (
    <aside className={cn(
      "flex flex-col h-full bg-sidebar border-r border-sidebar-border",
      mobile ? "w-full" : "w-64"
    )}>
      <div className="flex items-center justify-between h-16 px-5 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Heart className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-semibold text-sidebar-foreground">BreathingPlace</span>
        </Link>
        {mobile && (
          <Button variant="ghost" size="icon" onClick={onClose} className="text-sidebar-foreground">
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {items.map((item, index) => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path || index}
              to={item.path}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="w-4.5 h-4.5 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-sidebar-border">
        <p className="text-xs text-sidebar-foreground/40 text-center">© 2026 BreathingPlace</p>
      </div>
    </aside>
  );
}