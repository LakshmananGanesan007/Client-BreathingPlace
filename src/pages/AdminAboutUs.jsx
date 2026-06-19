import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import RoleGuard from "@/components/RoleGuard";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Info } from "lucide-react";
import { toast } from "sonner";

const EMPTY = { section: "", title: "", subtitle: "", body: "", image_url: "", order: 0 };
const SECTION_OPTIONS = ["hero", "mission", "vision", "values", "team", "story", "stats"];

function AboutContent() {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const { data: sections = [], isLoading } = useQuery({
    queryKey: ["about-content-admin"],
    queryFn: () => base44.entities.AboutContent.list("order"),
  });

  const save = useMutation({
    mutationFn: (data) => dialog?.mode === "edit"
      ? base44.entities.AboutContent.update(dialog.data.id, data)
      : base44.entities.AboutContent.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["about-content-admin"] });
      queryClient.invalidateQueries({ queryKey: ["about-content"] });
      setDialog(null);
      toast.success("Saved!");
    },
  });

  const remove = useMutation({
    mutationFn: (id) => base44.entities.AboutContent.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["about-content-admin"] }); toast.success("Deleted."); },
  });

  function openCreate() { setForm(EMPTY); setDialog({ mode: "create" }); }
  function openEdit(s) { setForm({ ...s }); setDialog({ mode: "edit", data: s }); }
  const f = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target ? e.target.value : e }));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">About Us Content</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage sections displayed on the About Us page</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="w-4 h-4" /> Add Section</Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : sections.length === 0 ? (
        <div className="bg-card rounded-xl border border-border">
          <EmptyState icon={Info} title="No content sections yet" description="Add sections like Hero, Mission, Vision, Team to build your About Us page." action={<Button size="sm" onClick={openCreate} className="gap-2"><Plus className="w-3 h-3" /> Add First Section</Button>} />
        </div>
      ) : (
        <div className="space-y-3">
          {sections.map(s => (
            <div key={s.id} className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
              {s.image_url && <img src={s.image_url} alt={s.title} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />}
              {!s.image_url && <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 text-xs font-bold text-muted-foreground uppercase">{s.section?.slice(0,4)}</div>}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-primary uppercase tracking-wide">{s.section}</span>
                  <span className="text-muted-foreground text-xs">· Order {s.order}</span>
                </div>
                <h3 className="font-medium text-sm">{s.title}</h3>
                {s.subtitle && <p className="text-xs text-muted-foreground truncate">{s.subtitle}</p>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button variant="outline" size="sm" onClick={() => openEdit(s)} className="gap-1 text-xs"><Edit className="w-3 h-3" /> Edit</Button>
                <Button variant="ghost" size="sm" onClick={() => remove.mutate(s.id)} disabled={remove.isPending} className="text-destructive h-8 w-8 p-0"><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!dialog} onOpenChange={() => setDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="font-display">{dialog?.mode === "edit" ? "Edit Section" : "New Section"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Section Type <span className="text-destructive">*</span></Label>
                <select className="mt-1 w-full border border-input rounded-md px-3 py-2 text-sm bg-background" value={form.section} onChange={f("section")}>
                  <option value="">Select type...</option>
                  {SECTION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div><Label>Display Order</Label><Input type="number" className="mt-1" value={form.order} onChange={f("order")} /></div>
            </div>
            <div><Label>Title <span className="text-destructive">*</span></Label><Input className="mt-1" value={form.title} onChange={f("title")} placeholder="Section heading" /></div>
            <div><Label>Subtitle</Label><Input className="mt-1" value={form.subtitle} onChange={f("subtitle")} placeholder="Short subtitle" /></div>
            <div><Label>Body Content</Label><Textarea className="mt-1" rows={4} value={form.body} onChange={f("body")} placeholder="Full section text..." /></div>
            <div><Label>Image URL</Label><Input className="mt-1" value={form.image_url} onChange={f("image_url")} placeholder="https://..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
            <Button onClick={() => save.mutate(form)} disabled={!form.section || !form.title.trim() || save.isPending}>
              {save.isPending ? "Saving..." : "Save Section"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminAboutUs() {
  return <RoleGuard allowedRoles={["super_admin"]}><AboutContent /></RoleGuard>;
}