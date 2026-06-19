import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Clock, CheckCircle2, User, RefreshCw, Trash2, XCircle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AdminFreeSupport() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);
  const [now, setNow] = useState(Date.now());
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
  const [customerProfile, setCustomerProfile] = useState(null);
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerProfileLoading, setCustomerProfileLoading] = useState(false);
  const [customerProfileError, setCustomerProfileError] = useState(false);

  useEffect(() => {
    const fetchSessions = async () => {
      const res = await base44.entities.SupportSession.filter({}, "-created_date", 50);
      setSessions(res);
    };
    fetchSessions();

    const unsub = base44.entities.SupportSession.subscribe((event) => {
      fetchSessions();
    });

    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!activeSessionId) return;
    
    const fetchMessages = async () => {
      const msgs = await base44.entities.SupportMessage.filter({ session_id: activeSessionId }, "created_date", 100);
      setMessages(msgs.reverse());
    };
    fetchMessages();

    const unsub = base44.entities.SupportMessage.subscribe((event) => {
      if (event.type === "create" && event.data.session_id === activeSessionId) {
        setMessages(prev => [...prev, event.data]);
      }
    });

    return () => unsub();
  }, [activeSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeSessionId) return;

    const msg = newMessage.trim();
    setNewMessage("");

    await base44.entities.SupportMessage.create({
      session_id: activeSessionId,
      sender_id: user.id,
      sender_type: "super_admin",
      message: msg
    });
  };

  const acceptSession = async () => {
    if (!activeSessionId) return;
    const timerEnd = new Date();
    timerEnd.setMinutes(timerEnd.getMinutes() + 10);
    
    await base44.entities.SupportSession.update(activeSessionId, {
      status: "active",
      started_at: new Date().toISOString(),
      timer_end_at: timerEnd.toISOString(),
    });
  };

  const closeSession = async () => {
    if (!activeSessionId) return;
    const s = sessions.find(x => x.id === activeSessionId);
    
    // Close session
    await base44.entities.SupportSession.update(activeSessionId, {
      status: "completed",
      ended_at: new Date().toISOString()
    });

    // Mark free support used on customer profile
    const profiles = await base44.entities.CustomerProfile.filter({ user_id: s.customer_id });
    if (profiles.length > 0) {
      await base44.entities.CustomerProfile.update(profiles[0].id, {
        free_support_used: true,
        free_support_completed_at: new Date().toISOString(),
        free_support_session_id: activeSessionId,
        free_support_closed_by: user.id,
      });
    }

    setActiveSessionId(null);
  };

  const cancelSession = async () => {
    if (!activeSessionId) return;
    await base44.entities.SupportSession.update(activeSessionId, {
      status: "cancelled",
      ended_at: new Date().toISOString()
    });
    setActiveSessionId(null);
  };

  const deleteSession = async () => {
    if (!activeSessionId) return;
    try {
      await base44.entities.SupportSession.delete(activeSessionId);
    } catch (error) {
      console.error("Failed to delete session (may already be deleted):", error);
    }
    setActiveSessionId(null);
  };

  const viewCustomerDetails = async () => {
    if (!activeSession) return;
    setShowCustomerDetails(true);
    setCustomerProfileLoading(true);
    setCustomerProfileError(false);
    setCustomerProfile(null);
    setCustomerEmail("");

    try {
      const profiles = await base44.entities.CustomerProfile.filter({ user_id: activeSession.customer_id });
      if (profiles.length > 0) {
        setCustomerProfile(profiles[0]);
      } else {
        setCustomerProfileError(true);
      }
      
      try {
        const users = await base44.entities.User.filter({ id: activeSession.customer_id });
        if (users.length > 0) {
          setCustomerEmail(users[0].email);
        }
      } catch (userErr) {
        console.warn("Could not fetch user email", userErr);
      }

    } catch(e) {
      console.error(e);
      setCustomerProfileError(true);
    } finally {
      setCustomerProfileLoading(false);
    }
    
    if (activeSession.status === "pending") {
      await base44.entities.SupportSession.update(activeSessionId, {
        status: "reviewing"
      });
    }
  };

  const calculateAge = (dob) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age.toString();
  };

  const DetailItem = ({ label, value, capitalize }) => {
    const displayValue = value === null || value === undefined || value === "" ? "Not provided" : value;
    return (
      <div>
        <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">{label}</h4>
        <p className={`text-sm text-gray-900 ${capitalize && displayValue !== "Not provided" ? "capitalize" : ""}`}>{displayValue}</p>
      </div>
    );
  };

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const isPending = activeSession && (activeSession.status === "pending" || activeSession.status === "reviewing");
  const isEnded = activeSession && (activeSession.status === "completed" || activeSession.status === "cancelled");

  return (
    <div className="p-6 h-[calc(100vh-64px)] flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Free Emotional Support Queue</h1>
          <p className="text-gray-500 text-sm">Manage free support chats in real-time.</p>
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h2 className="font-semibold text-gray-700">Queues</h2>
            <div className="flex gap-2">
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">{sessions.filter(s => s.status === "pending" || s.status === "reviewing").length} Pending</Badge>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{sessions.filter(s => s.status === "active").length} Active</Badge>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sessions.map(s => {
              const diff = s.timer_end_at ? Math.max(0, Math.floor((new Date(s.timer_end_at).getTime() - now) / 1000)) : 0;
              const isActive = s.status === "active";
              const isPending = s.status === "pending" || s.status === "reviewing";
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSessionId(s.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${activeSessionId === s.id ? "bg-primary/5 border-primary" : "bg-white border-transparent hover:border-gray-200"}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm text-gray-900 truncate"><User className="inline w-3 h-3 mr-1"/> {s.customer_name || s.customer_id.slice(0, 8)}</span>
                    {isActive ? (
                      <span className={`text-xs font-semibold ${diff === 0 ? "text-red-500" : "text-green-600"}`}>
                        {Math.floor(diff/60)}:{(diff%60).toString().padStart(2,"0")}
                      </span>
                    ) : isPending ? (
                      <Badge className="bg-yellow-100 text-yellow-800 border-0 text-[10px]">Pending</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">Closed</Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">Type: {s.session_type}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          {activeSession ? (
            <>
              <div className="p-4 border-b flex justify-between items-center bg-gray-50/50">
                <div>
                  <h3 className="font-semibold text-gray-900">Chat with {activeSession.customer_name || activeSession.customer_id.slice(0, 8)}</h3>
                  <p className="text-xs text-gray-500">Session Type: {activeSession.session_type}</p>
                </div>
                <div className="flex gap-2 items-center">
                  {!isEnded && !isPending && activeSession?.timer_end_at && (
                    <div className="mr-4 px-3 py-1 bg-green-50 text-green-700 rounded-full font-medium text-sm flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      {(() => {
                        const diff = Math.max(0, Math.floor((new Date(activeSession.timer_end_at).getTime() - now) / 1000));
                        return `${Math.floor(diff/60)}:${(diff%60).toString().padStart(2,"0")}`;
                      })()}
                    </div>
                  )}
                  {isPending && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={viewCustomerDetails} className="text-blue-600 border-blue-200 hover:bg-blue-50">
                        <Info className="w-4 h-4 mr-1"/> Details
                      </Button>
                      <Button variant="outline" size="sm" onClick={cancelSession} className="text-orange-600 border-orange-200 hover:bg-orange-50">
                        <XCircle className="w-4 h-4 mr-1"/> Cancel
                      </Button>
                      <Button variant="default" size="sm" onClick={acceptSession} className="bg-green-600 hover:bg-green-700">
                        <CheckCircle2 className="w-4 h-4 mr-1"/> Accept
                      </Button>
                    </div>
                  )}
                  {!isEnded && !isPending && (
                    <Button variant="destructive" size="sm" onClick={closeSession}>
                      Close Session
                    </Button>
                  )}
                  {isEnded && (
                    <Button variant="outline" size="sm" onClick={deleteSession} className="text-red-600 hover:bg-red-50 hover:text-red-700">
                      <Trash2 className="w-4 h-4 mr-1"/> Delete
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/30">
                {messages.map(m => {
                  const isAdmin = m.sender_type === "super_admin";
                  return (
                    <div key={m.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${isAdmin ? "bg-primary text-white rounded-br-none" : "bg-white border text-gray-800 rounded-bl-none shadow-sm"}`}>
                        <p className="text-sm whitespace-pre-wrap">{m.message}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
              <form onSubmit={handleSend} className="p-4 border-t bg-white flex gap-2">
                <Input 
                  className="flex-1"
                  placeholder={isEnded ? "Session completed" : isPending ? "Accept session to chat" : "Type a reply..."}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={isEnded || isPending}
                />
                <Button type="submit" disabled={!newMessage.trim() || isEnded || isPending}><Send className="w-4 h-4 mr-2"/> Send</Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <MessageCircleIcon />
              <p className="mt-2 text-sm">Select a session to start chatting</p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={showCustomerDetails} onOpenChange={setShowCustomerDetails}>
        <DialogContent className="sm:max-w-xl p-0 overflow-hidden">
          <div className="p-6 pb-0 border-b border-gray-100 bg-white">
            <DialogHeader>
              <DialogTitle>Customer Onboarding Profile</DialogTitle>
            </DialogHeader>
          </div>
          
          <div className="px-6 py-4 bg-gray-50/50">
            {customerProfileLoading ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <RefreshCw className="w-8 h-8 text-primary animate-spin opacity-50" />
                <p className="text-sm text-gray-500">Loading profile data...</p>
              </div>
            ) : customerProfileError ? (
              <div className="py-10 flex flex-col items-center justify-center text-center">
                <XCircle className="w-10 h-10 text-red-400 mb-3" />
                <h3 className="text-base font-semibold text-gray-900">Profile Not Found</h3>
                <p className="text-sm text-gray-500 mt-1 max-w-sm">We couldn't load the onboarding profile for this customer. They may not have completed their profile setup.</p>
              </div>
            ) : customerProfile ? (
              <>
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 mb-6 pb-6 border-b border-gray-200">
                  <div className="w-20 h-20 rounded-full bg-gray-200 overflow-hidden shadow-sm flex-shrink-0 border-2 border-white">
                    {customerProfile.profile_photo_url ? (
                      <img src={customerProfile.profile_photo_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary">
                        <User className="w-10 h-10 opacity-70" />
                      </div>
                    )}
                  </div>
                  <div className="text-center sm:text-left flex-1">
                    <h3 className="font-bold text-xl text-gray-900">{customerProfile.full_name || "Not provided"}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{customerEmail || "Not provided"}</p>
                    {activeSession?.session_type && (
                      <Badge className="mt-2 bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
                        {activeSession.session_type} Session
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-8 max-h-[55vh] overflow-y-auto pr-2 custom-scrollbar">
                  {/* Basic Info */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Basic Information
                    </h4>
                    <div className="grid grid-cols-2 gap-y-4 gap-x-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                      <DetailItem label="Phone Number" value={customerProfile.phone} />
                      <DetailItem label="Age" value={calculateAge(customerProfile.dob)} />
                      <DetailItem label="Gender" value={customerProfile.gender?.replace(/_/g, " ")} capitalize />
                      <DetailItem label="Location" value={customerProfile.address} />
                      <DetailItem label="Preferred Language" value={customerProfile.preferred_language} />
                      <DetailItem label="Relationship Status" value={customerProfile.relationship_status?.replace(/_/g, " ")} capitalize />
                      <DetailItem label="Occupation" value={customerProfile.occupation} />
                      <DetailItem label="Emergency Contact" value={customerProfile.emergency_contact} />
                    </div>
                  </div>

                  {/* Mental Health Context */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Mental Health Context
                    </h4>
                    <div className="space-y-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                      <div>
                        <span className="text-xs text-gray-500 uppercase tracking-wider block mb-2">Primary Concerns / Goals</span>
                        <div className="flex flex-wrap gap-2">
                          {customerProfile.main_concerns?.length > 0 ? (
                            customerProfile.main_concerns.map(c => (
                              <span key={c} className="px-2.5 py-1 bg-red-50 text-red-700 text-xs rounded-md border border-red-100 font-medium">{c}</span>
                            ))
                          ) : <span className="text-sm text-gray-900">Not provided</span>}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-y-4 gap-x-4 pt-2">
                        <DetailItem label="Anxiety Level" value={customerProfile.anxiety_level} capitalize />
                        <DetailItem label="Stress Level" value={customerProfile.stress_level?.replace(/_/g, " ")} capitalize />
                        <DetailItem label="Depression History" value={typeof customerProfile.depression_history === 'boolean' ? (customerProfile.depression_history ? "Yes" : "No") : null} />
                        <DetailItem label="Sleep Quality" value={customerProfile.sleep_quality?.replace(/_/g, " ")} capitalize />
                      </div>
                    </div>
                  </div>

                  {/* Therapy & Preferences */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Therapy & Preferences
                    </h4>
                    <div className="space-y-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                      <div className="grid grid-cols-2 gap-y-4 gap-x-4">
                        <DetailItem label="Preferred Session Time" value={customerProfile.preferred_session_time} capitalize />
                        <DetailItem label="Preferred Therapist Gender" value={customerProfile.preferred_therapist_gender?.replace(/_/g, " ")} capitalize />
                        <DetailItem label="Previous Therapy Experience" value={typeof customerProfile.previous_therapy === 'boolean' ? (customerProfile.previous_therapy ? "Yes" : "No") : null} />
                      </div>
                      
                      <div className="pt-2">
                        <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Current Medication</span>
                        {customerProfile.current_medication ? (
                          <p className="text-sm text-gray-900 bg-gray-50/80 p-3 rounded-lg border border-gray-100">{customerProfile.current_medication}</p>
                        ) : (
                          <p className="text-sm text-gray-900">Not provided</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
          
          <div className="p-4 bg-white border-t border-gray-200 flex justify-end">
            <Button onClick={() => setShowCustomerDetails(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MessageCircleIcon() {
  return <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>;
}