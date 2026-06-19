import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import RoleGuard from "@/components/RoleGuard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight, Plus, X, Clock, User, Ban } from "lucide-react";
import { toast } from "sonner";
import moment from "moment";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const COLORS = {
  scheduled: "bg-blue-100 text-blue-800 border-blue-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
  blocked: "bg-gray-100 text-gray-600 border-gray-200",
};

function CalendarContent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(moment());
  const [selectedDate, setSelectedDate] = useState(null);
  const [blockDialog, setBlockDialog] = useState(false);
  const [blockForm, setBlockForm] = useState({ start_time: "09:00", end_time: "10:00", reason: "" });

  const startOfMonth = currentMonth.clone().startOf("month");
  const endOfMonth = currentMonth.clone().endOf("month");

  const { data: sessions = [] } = useQuery({
    queryKey: ["therapist-sessions-cal", user?.id],
    queryFn: () => base44.entities.Session.filter({ therapist_id: user?.id }, "-session_date", 200),
    enabled: !!user?.id,
  });

  const { data: blocks = [] } = useQuery({
    queryKey: ["availability-blocks", user?.id],
    queryFn: () => base44.entities.AvailabilityBlock.filter({ therapist_id: user?.id }),
    enabled: !!user?.id,
  });

  const addBlock = useMutation({
    mutationFn: (data) => base44.entities.AvailabilityBlock.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["availability-blocks"] });
      setBlockDialog(false);
      setBlockForm({ start_time: "09:00", end_time: "10:00", reason: "" });
      toast.success("Time blocked successfully.");
    },
  });

  const removeBlock = useMutation({
    mutationFn: (id) => base44.entities.AvailabilityBlock.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["availability-blocks"] });
      toast.success("Block removed.");
    },
  });

  // Build calendar grid
  const startDay = startOfMonth.clone().startOf("week");
  const endDay = endOfMonth.clone().endOf("week");
  const weeks = [];
  let day = startDay.clone();
  while (day.isSameOrBefore(endDay, "day")) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      week.push(day.clone());
      day.add(1, "day");
    }
    weeks.push(week);
  }

  const getSessionsForDate = (d) =>
    sessions.filter(s => s.session_date === d.format("YYYY-MM-DD"));
  const getBlocksForDate = (d) =>
    blocks.filter(b => b.block_date === d.format("YYYY-MM-DD"));

  const selectedSessions = selectedDate ? getSessionsForDate(selectedDate) : [];
  const selectedBlocks = selectedDate ? getBlocksForDate(selectedDate) : [];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">My Calendar</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage your sessions and availability</p>
        </div>
        <Button onClick={() => { setBlockDialog(true); setBlockForm(prev => ({ ...prev, date: moment().format("YYYY-MM-DD") })); }} className="gap-2">
          <Ban className="w-4 h-4" /> Block Time
        </Button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        {[["bg-blue-400", "Scheduled Session"], ["bg-green-400", "Completed"], ["bg-red-400", "Cancelled"], ["bg-gray-400", "Blocked"]].map(([c, l]) => (
          <span key={l} className="flex items-center gap-1.5"><span className={`w-2.5 h-2.5 rounded-full ${c}`} />{l}</span>
        ))}
      </div>

      {/* Calendar */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-heading font-semibold text-base">{currentMonth.format("MMMM YYYY")}</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(m => m.clone().subtract(1, "month"))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(moment())}>Today</Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(m => m.clone().add(1, "month"))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {DAYS.map(d => (
            <div key={d} className="py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">{d}</div>
          ))}
        </div>

        {/* Weeks */}
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-border last:border-b-0">
            {week.map((d) => {
              const isCurrentMonth = d.month() === currentMonth.month();
              const isToday = d.isSame(moment(), "day");
              const isSelected = selectedDate?.isSame(d, "day");
              const daySessions = getSessionsForDate(d);
              const dayBlocks = getBlocksForDate(d);
              const total = daySessions.length + dayBlocks.length;

              return (
                <div
                  key={d.format()}
                  onClick={() => setSelectedDate(isSelected ? null : d.clone())}
                  className={`min-h-[80px] p-2 border-r border-border last:border-r-0 cursor-pointer transition-colors
                    ${!isCurrentMonth ? "bg-muted/30" : "bg-card"}
                    ${isSelected ? "ring-2 ring-primary ring-inset" : "hover:bg-muted/50"}
                  `}
                >
                  <div className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium mb-1
                    ${isToday ? "bg-primary text-primary-foreground" : !isCurrentMonth ? "text-muted-foreground" : "text-foreground"}`}>
                    {d.date()}
                  </div>
                  <div className="space-y-0.5">
                    {daySessions.slice(0, 2).map(s => (
                      <div key={s.id} className={`text-[10px] px-1.5 py-0.5 rounded border truncate ${COLORS[s.status] || COLORS.scheduled}`}>
                        {s.start_time} {s.customer_name?.split(" ")[0] || "Client"}
                      </div>
                    ))}
                    {dayBlocks.slice(0, 1).map(b => (
                      <div key={b.id} className={`text-[10px] px-1.5 py-0.5 rounded border truncate ${COLORS.blocked}`}>
                        {b.start_time} Blocked
                      </div>
                    ))}
                    {total > 3 && <div className="text-[10px] text-muted-foreground pl-1">+{total - 3} more</div>}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Day Detail Panel */}
      {selectedDate && (
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold">{selectedDate.format("dddd, MMMM D YYYY")}</h3>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                onClick={() => { setBlockForm(prev => ({ ...prev, date: selectedDate.format("YYYY-MM-DD") })); setBlockDialog(true); }}
              >
                <Ban className="w-3.5 h-3.5" /> Block This Day
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedDate(null)}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {selectedSessions.length === 0 && selectedBlocks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No sessions or blocks on this day.</p>
          ) : (
            <div className="space-y-3">
              {selectedSessions.map(s => (
                <div key={s.id} className={`flex items-center gap-3 p-3 rounded-xl border ${COLORS[s.status] || COLORS.scheduled}`}>
                  <div className="w-9 h-9 rounded-lg bg-white/60 flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{s.customer_name || "Client"}</p>
                    <p className="text-xs flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" /> {s.start_time}{s.end_time ? ` – ${s.end_time}` : ""}
                      {s.session_type && ` · ${s.session_type.replace("_", " ")}`}
                    </p>
                  </div>
                  <Badge className={`border-0 text-xs ${COLORS[s.status]}`}>{s.status}</Badge>
                </div>
              ))}
              {selectedBlocks.map(b => (
                <div key={b.id} className="flex items-center gap-3 p-3 rounded-xl border bg-gray-50 border-gray-200">
                  <div className="w-9 h-9 rounded-lg bg-white/60 flex items-center justify-center">
                    <Ban className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700">Blocked</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" /> {b.start_time}{b.end_time ? ` – ${b.end_time}` : ""}
                      {b.reason ? ` · ${b.reason}` : ""}
                    </p>
                  </div>
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                    onClick={() => removeBlock.mutate(b.id)}
                    disabled={removeBlock.isPending}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Block Dialog */}
      <Dialog open={blockDialog} onOpenChange={setBlockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Block Time Slot</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Date <span className="text-destructive">*</span></Label>
              <Input type="date" className="mt-1" value={blockForm.date || ""} onChange={e => setBlockForm(prev => ({ ...prev, date: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Time <span className="text-destructive">*</span></Label>
                <Input type="time" className="mt-1" value={blockForm.start_time} onChange={e => setBlockForm(prev => ({ ...prev, start_time: e.target.value }))} />
              </div>
              <div>
                <Label>End Time</Label>
                <Input type="time" className="mt-1" value={blockForm.end_time} onChange={e => setBlockForm(prev => ({ ...prev, end_time: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Reason (optional)</Label>
              <Textarea rows={2} className="mt-1" value={blockForm.reason} onChange={e => setBlockForm(prev => ({ ...prev, reason: e.target.value }))} placeholder="e.g. Personal appointment, holiday..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockDialog(false)}>Cancel</Button>
            <Button
              onClick={() => addBlock.mutate({ therapist_id: user.id, block_date: blockForm.date, start_time: blockForm.start_time, end_time: blockForm.end_time, reason: blockForm.reason, is_available: false })}
              disabled={!blockForm.date || !blockForm.start_time || addBlock.isPending}
            >
              {addBlock.isPending ? "Blocking..." : "Block Time"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function TherapistCalendar() {
  return (
    <RoleGuard allowedRoles={["therapist"]}>
      <CalendarContent />
    </RoleGuard>
  );
}