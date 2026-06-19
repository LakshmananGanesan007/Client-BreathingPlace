import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Clock, CheckCircle2, User, RefreshCw, Trash2, XCircle, Info, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

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

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase.from('support_sessions').select('*').order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      if (data) setSessions(data);
    } catch (err) {
      toast.error("❌ Failed to load queue. Database error.");
    }
  };

  useEffect(() => {
    fetchSessions();
    const sub = supabase.channel('admin_support_sessions_queue')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_sessions' }, fetchSessions)
      .subscribe();

    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      supabase.removeChannel(sub);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!activeSessionId) return;
    
    const fetchMessages = async () => {
      const { data } = await supabase.from('support_messages').select('*').eq('session_id', activeSessionId).order('created_at', { ascending: true }).limit(200);
      if (data) setMessages(data);
    };
    
    fetchMessages();
    
    const sub = supabase.channel(`admin_support_msgs_${activeSessionId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `session_id=eq.${activeSessionId}` }, (payload) => {
        setMessages(prev => {
          if (prev.find(m => m.id === payload.new.id)) return prev;
          // Block duplicate optimistic admin messages
          const isOptimisticDuplicate = payload.new.sender_id === user.id && 
            prev.find(m => m.message === payload.new.message && String(m.id).startsWith('temp-'));
          if (isOptimisticDuplicate) return prev;
          
          return [...prev, payload.new];
        });
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'support_messages', filter: `session_id=eq.${activeSessionId}` }, () => {
        // Clear messages if admin deletes them mid-view
        setMessages([]);
      })
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [activeSessionId, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeSessionId) return;

    const msgText = newMessage.trim();
    setNewMessage("");

    // Optimistic UI for instant WhatsApp feel
    const tempId = `temp-${Date.now()}`;
    const tempMsg = {
      id: tempId,
      session_id: activeSessionId,
      sender_id: user.id,
      sender_type: "super_admin",
      message: msgText,
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, tempMsg]);

    try {
      const { data, error } = await supabase.from('support_messages').insert({
        session_id: activeSessionId,
        sender_id: user.id,
        sender_type: "super_admin",
        message: msgText
      }).select().single();
      
      if (error) throw error;
      setMessages(prev => prev.map(m => m.id === tempId ? data : m));
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      toast.error("❌ Failed to send message.");
    }
  };

  const acceptSession = async () => {
    if (!activeSessionId) return;
    try {
      const timerEnd = new Date();
      timerEnd.setMinutes(timerEnd.getMinutes() + 10);
      
      const { error } = await supabase.from('support_sessions').update({
        status: "active",
        started_at: new Date().toISOString(),
        timer_end_at: timerEnd.toISOString(),
      }).eq('id', activeSessionId);

      if (error) throw error;
      toast.success("✅ Customer request accepted successfully. Chat session started.");
    } catch (err) {
      toast.error("❌ Failed to create chat session.");
    }
  };

  const closeSession = async () => {
    if (!activeSessionId) return;
    try {
      const s = sessions.find(x => x.id === activeSessionId);
      
      await supabase.from('support_sessions').update({
        status: "completed",
        ended_at: new Date().toISOString()
      }).eq('id', activeSessionId);

      const { data: profiles } = await supabase.from('customer_profiles').select('*').eq('user_id', s.customer_id);
      if (profiles && profiles.length > 0) {
        await supabase.from('customer_profiles').update({
          free_support_used: true,
          free_support_completed_at: new Date().toISOString(),
          free_support_session_id: activeSessionId,
          free_support_closed_by: user.id,
        }).eq('id', profiles[0].id);
      }
      
      toast.success("✅ Chat ended successfully and saved to history.");
    } catch (err) {
      toast.error("❌ Database error while ending chat.");
    }
  };

  const cancelSession = async () => {
    if (!activeSessionId) return;
    try {
      await supabase.from('support_sessions').update({
        status: "cancelled",
        ended_at: new Date().toISOString()
      }).eq('id', activeSessionId);
      setActiveSessionId(null);
      toast.success("✅ Customer request cancelled successfully.");
    } catch (err) {
      toast.error("❌ Failed to cancel request.");
    }
  };

  const deleteSession = async () => {
    if (!activeSessionId) return;
    try {
      // ONLY delete the messages to preserve the history record wrapper
      await supabase.from('support_messages').delete().eq('session_id', activeSessionId);
      setMessages([]);
      toast.success("✅ Chat messages permanently deleted. Session record preserved in history.");
    } catch (error) {
      toast.error("❌ Failed to delete session history.");
    }
  };

  const viewCustomerDetails = async () => {
    const activeSession = sessions.find(s => s.id === activeSessionId);
    if (!activeSession) return;

    setShowCustomerDetails(true);
    setCustomerProfileLoading(true);
    setCustomerProfileError(false);
    setCustomerProfile(null);
    setCustomerEmail("");

    try {
      const { data: profileData } = await supabase.from('customer_profiles').select('*').eq('user_id', activeSession.customer_id).single();
      if (profileData) {
        setCustomerProfile(profileData);
      } else {
        setCustomerProfileError(true);
      }
      
      const { data: userData } = await supabase.from('user_profiles').select('email').eq('user_id', activeSession.customer_id).single();
      if (userData) setCustomerEmail(userData.email);

      if (activeSession.status === "pending") {
        await supabase.from('support_sessions').update({ status: "reviewing" }).eq('id', activeSessionId);
        toast.info("ℹ Customer notified that you are reviewing their request.");
      }

    } catch(e) {
      setCustomerProfileError(true);
      toast.error("❌ Failed to load customer details.");
    } finally {
      setCustomerProfileLoading(false);
    }
  };

  const calculateAge = (dob) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
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
  const isActive = activeSession && activeSession.status === "active";
  const isEnded = activeSession && (activeSession.status === "completed" || activeSession.status === "cancelled");

  return (
    <div className="p-6 h-[calc(100vh-64px)] flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Free Emotional Support Queue</h1>
          <p className="text-gray-500 text-sm">Manage free support chats and view history.</p>
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Sidebar Queues */}
        <div className="w-80 flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col gap-3">
            <h2 className="font-semibold text-gray-700">Queues & History</h2>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">{sessions.filter(s => s.status === "pending" || s.status === "reviewing").length} Pending</Badge>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{sessions.filter(s => s.status === "active").length} Active</Badge>
              <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">{sessions.filter(s => s.status === "completed").length} Completed</Badge>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sessions.map(s => {
              const diff = s.timer_end_at ? Math.max(0, Math.floor((new Date(s.timer_end_at).getTime() - now) / 1000)) : 0;
              const sIsActive = s.status === "active";
              const sIsPending = s.status === "pending" || s.status === "reviewing";
              const sIsCompleted = s.status === "completed";
              
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSessionId(s.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${activeSessionId === s.id ? "bg-primary/5 border-primary shadow-sm" : "bg-white border-transparent hover:border-gray-200"}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm text-gray-900 truncate"><User className="inline w-3 h-3 mr-1"/> {s.customer_name || s.customer_id.slice(0, 8)}</span>
                    {sIsActive ? (
                      <span className={`text-xs font-semibold ${diff <= 0 ? "text-red-500" : "text-green-600"}`}>
                        {Math.floor(diff/60)}:{(diff%60).toString().padStart(2,"0")}
                      </span>
                    ) : sIsPending ? (
                      <Badge className="bg-yellow-100 text-yellow-800 border-0 text-[10px]">{s.status === 'reviewing' ? 'Reviewing' : 'Pending'}</Badge>
                    ) : sIsCompleted ? (
                      <Badge className="bg-gray-100 text-gray-600 border-0 text-[10px]">Completed</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">Cancelled</Badge>
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
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    Chat with {activeSession.customer_name || activeSession.customer_id.slice(0, 8)}
                    {isEnded && <Badge variant="secondary" className="text-[10px]">Read-Only History</Badge>}
                  </h3>
                  <p className="text-xs text-gray-500">Session Type: {activeSession.session_type}</p>
                </div>
                <div className="flex gap-2 items-center">
                  {isActive && activeSession?.timer_end_at && (
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
                      <Button variant="default" size="sm" onClick={acceptSession} className="bg-green-600 hover:bg-green-700 shadow-sm">
                        <CheckCircle2 className="w-4 h-4 mr-1"/> Accept Session
                      </Button>
                    </div>
                  )}
                  {(isActive || isEnded) && (
                    <Button variant="outline" size="sm" onClick={viewCustomerDetails} className="text-blue-600 border-blue-200 hover:bg-blue-50 mr-2">
                      <Info className="w-4 h-4 mr-1"/> View Details
                    </Button>
                  )}
                  {isActive && (
                    <Button variant="destructive" size="sm" onClick={closeSession} className="shadow-sm">
                      Close Session
                    </Button>
                  )}
                  {isEnded && (
                    <Button variant="outline" size="sm" onClick={deleteSession} className="text-red-600 hover:bg-red-50 hover:text-red-700">
                      <Trash2 className="w-4 h-4 mr-1"/> Delete Messages
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/30">
                {messages.length === 0 && !isPending && (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                    No messages exist. {isEnded ? "They may have been deleted." : ""}
                  </div>
                )}
                {messages.map(m => {
                  const isAd = m.sender_type === "super_admin";
                  return (
                    <div key={m.id} className={`flex ${isAd ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${isAd ? "bg-primary text-white rounded-br-none" : "bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm"}`}>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.message}</p>
                        <p className={`text-[9px] mt-1 text-right ${isAd ? "text-primary-foreground/70" : "text-gray-400"}`}>
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
              
              {isActive && (
                <form onSubmit={handleSend} className="p-4 border-t border-gray-100 bg-white flex gap-2">
                  <Input 
                    className="flex-1 rounded-full bg-gray-50 border-gray-200 focus-visible:ring-primary"
                    placeholder="Type a reply..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                  />
                  <Button type="submit" className="rounded-full bg-primary hover:bg-primary/90 shadow-sm" disabled={!newMessage.trim()}>
                    <Send className="w-4 h-4 mr-2"/> Send
                  </Button>
                </form>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <MessageSquare className="w-12 h-12 mb-3 text-gray-300" />
              <p className="text-sm">Select a session from the queue to view details or chat.</p>
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