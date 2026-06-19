import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart, LayoutDashboard } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Navbar({ user, userProfile, profilePending, noProfile }) {
  const navigate = useNavigate();

  const getDashboardPath = (selectedRole, metaRole) => {
    const isAdmin = metaRole === "super_admin" || metaRole === "admin" || selectedRole === "super_admin" || selectedRole === "admin";
    if (isAdmin) return "/admin";
    if (selectedRole === "therapist") return "/therapist";
    if (selectedRole === "customer") return "/dashboard";
    return "/complete-profile";
  };

  return (
    <nav className="fixed top-0 w-full z-50 backdrop-blur-md border-b shadow-sm" style={{ backgroundColor: "rgba(240,240,224,0.97)", borderColor: "#d0d8c8" }}>
      {(profilePending || noProfile) && (
        <div className="w-full bg-amber-50 border-b border-amber-200 px-4 py-1.5 flex items-center justify-center gap-2 animate-fade-in-down">
          <span className="text-xs font-semibold text-amber-800">⚠ Profile Setup Pending</span>
          <Link to="/complete-profile">
            <Button size="sm" variant="outline" className="h-6 text-[11px] px-2 py-0 border-amber-400 text-amber-800 hover:bg-amber-100 ml-2">
              Complete Profile
            </Button>
          </Link>
        </div>
      )}
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center group-hover:scale-110 transition-transform">
            <Heart className="w-4 h-4 text-white" />
          </div>
          <span className="font-display text-lg font-semibold text-foreground group-hover:text-primary transition-colors">BreathingPlace</span>
        </Link>
        <div className="hidden md:flex items-center gap-8">
          <a 
            href="#features" 
            className="text-sm text-gray-600 hover:text-primary transition-colors font-medium"
          >
            Features
          </a>
          <a 
            href="#how-it-works" 
            className="text-sm text-gray-600 hover:text-primary transition-colors font-medium"
          >
            How It Works
          </a>
          <Link to="/therapist-landing" className="text-sm text-gray-600 hover:text-primary transition-colors font-medium">For Therapists</Link>
          <Link to="/blog" className="text-sm text-gray-600 hover:text-primary transition-colors font-medium">Blog</Link>
          <Link to="/about" className="text-sm text-gray-600 hover:text-primary transition-colors font-medium">About Us</Link>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            profilePending || noProfile ? (
              <Link to="/complete-profile">
                <Button size="sm" className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-full px-5 shadow-md hover:shadow-lg transition-all">
                  Complete Profile
                </Button>
              </Link>
            ) : (
              <Link to={getDashboardPath(userProfile?.selected_role, user?.user_metadata?.role || user?.role)}>
                <Button size="sm" className="gap-1.5 bg-primary text-white rounded-full px-5 shadow-md hover:shadow-lg transition-all">
                  <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
                </Button>
              </Link>
            )
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm" className="text-sm font-medium hover:bg-primary/10 hover:text-primary">
                  Sign In
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm" className="bg-primary text-white rounded-full px-5 font-medium shadow-md hover:shadow-lg transition-all hover:scale-105">
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}