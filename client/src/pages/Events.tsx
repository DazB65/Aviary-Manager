import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { CalendarDays, Plus, Trash2, Pencil, CheckCircle2, Circle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format, parseISO, isToday, isTomorrow, isPast } from "date-fns";

const EVENT_TYPE_STYLES: Record<string, { color: string; emoji: string }> = {
  vet: { color: "bg-blue-50 text-blue-700 border-blue-200", emoji: "🏥" },
  banding: { color: "bg-purple-50 text-purple-700 border-purple-200", emoji: "🔖" },
  weaning: { color: "bg-teal-50 text-teal-700 border-teal-200", emoji: "🐣" },
  sale: { color: "bg-amber-50 text-amber-700 border-amber-200", emoji: "💰" },
  medication: { color: "bg-rose-50 text-rose-700 border-rose-200", emoji: "💊" },
  other: { color: "bg-gray-50 text-gray-600 border-gray-200", emoji: "📌" },
};

type EventFormData = {
  title: string;
  eventType: "vet" | "banding" | "medication" | "weaning" | "sale" | "other";
  eventDate: string;
  birdId: string;
  pairId: string;
  notes: string;
};

const defaultForm: EventFormData = {
  title: "",
  eventType: "other" as const,
  eventDate: "",
  birdId: "",
  pairId: "",
  notes: "",
};

function formatDateLabel(val: Date | string | null | undefined): string {
  if (!val) return "—";
  const d = val instanceof Date ? val : parseISO(String(val));
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  return format(d, "dd MMM yyyy");
}

export default function Events() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<EventFormData>(defaultForm);
  const [showCompleted, setShowCompleted] = useState(false);

  const utils = trpc.useUtils();
  const { data: events = [], isLoading } = trpc.events.list.useQuery();
  const { data: birds = [] } = trpc.birds.list.useQuery();
  const { data: pairs = [] } = trpc.pairs.list.useQuery();

  const createEvent = trpc.events.create.useMutation({
    onSuccess: () => { utils.events.list.invalidate(); utils.dashboard.stats.invalidate(); toast.success("Event added!"); setDialogOpen(false); },
    onError: (e) => toast.error(e.message),
  });
  const updateEvent = trpc.events.update.useMutation({
    onSuccess: () => { utils.events.list.invalidate(); utils.dashboard.stats.invalidate(); toast.success("Event updated!"); setDialogOpen(false); },
    onError: (e) => toast.error(e.message),
  });
  const deleteEvent = trpc.events.delete.useMutation({
    onSuccess: () => { utils.events.list.invalidate(); utils.dashboard.stats.invalidate(); toast.success("Event removed."); },
    onError: (e) => toast.error(e.message),
  });
  const toggleComplete = trpc.events.toggleComplete.useMutation({
    onSuccess: () => { utils.events.list.invalidate(); utils.dashboard.stats.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const birdMap = Object.fromEntries(birds.map(b => [b.id, b]));

  function pairLabel(pair: typeof pairs[0]) {
    const male = birdMap[pair.maleId];
    const female = birdMap[pair.femaleId];
    const mLabel = male ? (male.name || male.ringId || `#${male.id}`) : "?";
    const fLabel = female ? (female.name || female.ringId || `#${female.id}`) : "?";
    return `${mLabel} × ${fLabel}`;
  }

  const openAdd = () => { setEditingId(null); setForm(defaultForm); setDialogOpen(true); };
  const openEdit = (ev: typeof events[0]) => {
    setEditingId(ev.id);
    setForm({
      title: ev.title,
      eventType: (ev.eventType ?? "other") as EventFormData["eventType"],
      eventDate: ev.eventDate ? (ev.eventDate instanceof Date ? format(ev.eventDate, "yyyy-MM-dd") : String(ev.eventDate)) : "",
      birdId: ev.birdId ? String(ev.birdId) : "",
      pairId: ev.pairId ? String(ev.pairId) : "",
      notes: ev.notes ?? "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.title.trim()) { toast.error("Please enter a title"); return; }
    const payload = {
      title: form.title.trim(),
      eventType: form.eventType as "vet" | "banding" | "medication" | "weaning" | "sale" | "other",
      eventDate: form.eventDate || new Date().toISOString().split('T')[0],
      birdId: form.birdId ? Number(form.birdId) : undefined,
      pairId: form.pairId ? Number(form.pairId) : undefined,
      notes: form.notes || undefined,
    };
    if (editingId) {
      updateEvent.mutate({ id: editingId, ...payload });
    } else {
      createEvent.mutate(payload);
    }
  };

  const filtered = events.filter(e => showCompleted ? e.completed : !e.completed);

  // Group by date
  const grouped = filtered.reduce((acc, ev) => {
    const key = ev.eventDate ? formatDateLabel(ev.eventDate) : "No date";
    if (!acc[key]) acc[key] = [];
    acc[key].push(ev);
    return acc;
  }, {} as Record<string, typeof events>);

  const sortedKeys = Object.keys(grouped).sort((a, b) => {
    if (a === "Today") return -1;
    if (b === "Today") return 1;
    if (a === "Tomorrow") return -1;
    if (b === "Tomorrow") return 1;
    if (a === "No date") return 1;
    if (b === "No date") return -1;
    return new Date(a).getTime() - new Date(b).getTime();
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Events & Reminders</h1>
            <p className="text-muted-foreground mt-1">{events.filter(e => !e.completed).length} upcoming</p>
          </div>
          <Button onClick={openAdd} className="bg-primary hover:bg-primary/90 shadow-md gap-2">
            <Plus className="h-4 w-4" /> Add Event
          </Button>
        </div>

        {/* Toggle completed */}
        <div className="flex gap-2">
          <Button
            variant={!showCompleted ? "default" : "outline"}
            size="sm"
            onClick={() => setShowCompleted(false)}
            className={!showCompleted ? "bg-primary text-white" : ""}
          >
            Upcoming
          </Button>
          <Button
            variant={showCompleted ? "default" : "outline"}
            size="sm"
            onClick={() => setShowCompleted(true)}
            className={showCompleted ? "bg-primary text-white" : ""}
          >
            Completed
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">{showCompleted ? "No completed events" : "No upcoming events"}</p>
            {!showCompleted && <Button onClick={openAdd} variant="outline" className="mt-4 gap-2"><Plus className="h-4 w-4" />Add your first event</Button>}
          </div>
        ) : (
          <div className="space-y-6">
            {sortedKeys.map(dateKey => {
              const eventsForDate = grouped[dateKey];
              const isPastDate = dateKey !== "Today" && dateKey !== "Tomorrow" && dateKey !== "No date" && isPast(new Date(dateKey));
              return (
                <div key={dateKey}>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className={`text-sm font-semibold ${dateKey === "Today" ? "text-primary" : isPastDate && !showCompleted ? "text-destructive" : "text-muted-foreground"}`}>
                      {dateKey === "Today" ? "📅 Today" : dateKey === "Tomorrow" ? "📅 Tomorrow" : dateKey}
                    </h3>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  <div className="space-y-2">
                    {eventsForDate.map(ev => {
                      const typeInfo = EVENT_TYPE_STYLES[ev.eventType] ?? EVENT_TYPE_STYLES.other;
                      const linkedBird = ev.birdId ? birdMap[ev.birdId] : null;
                      const linkedPair = ev.pairId ? pairs.find(p => p.id === ev.pairId) : null;
                      return (
                        <Card key={ev.id} className={`border shadow-card transition-all ${ev.completed ? "opacity-60" : "hover:shadow-elevated"}`}>
                          <CardContent className="p-3">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => toggleComplete.mutate({ id: ev.id })}
                                className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                              >
                                {ev.completed ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Circle className="h-5 w-5" />}
                              </button>
                              <span className="text-lg shrink-0">{typeInfo.emoji}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className={`text-sm font-medium ${ev.completed ? "line-through text-muted-foreground" : ""}`}>{ev.title}</p>
                                  <Badge variant="outline" className={`text-xs ${typeInfo.color}`}>{ev.eventType}</Badge>
                                </div>
                                {(linkedBird || linkedPair) && (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {linkedBird ? `🐦 ${linkedBird.name || linkedBird.ringId || `#${linkedBird.id}`}` : ""}
                                    {linkedPair ? `💑 ${pairLabel(linkedPair)}` : ""}
                                  </p>
                                )}
                                {ev.notes && <p className="text-xs text-muted-foreground mt-0.5">{ev.notes}</p>}
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(ev)}>
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => { if (confirm("Delete this event?")) deleteEvent.mutate({ id: ev.id }); }}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{editingId ? "Edit Event" : "Add Event / Reminder"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Title *</Label>
              <Input className="mt-1" placeholder="e.g. Vet check for Sunny" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Event Type</Label>
                <Select value={form.eventType} onValueChange={v => setForm(f => ({ ...f, eventType: v as EventFormData["eventType"] }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vet">🏥 Vet visit</SelectItem>
                    <SelectItem value="banding">🔖 Banding</SelectItem>
                    <SelectItem value="weaning">🐣 Weaning</SelectItem>
                    <SelectItem value="sale">💰 Sale</SelectItem>
                    <SelectItem value="medication">💊 Medication</SelectItem>
                    <SelectItem value="other">📌 Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" className="mt-1" value={form.eventDate} onChange={e => setForm(f => ({ ...f, eventDate: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Linked Bird (optional)</Label>
              <Select value={form.birdId || "none"} onValueChange={v => setForm(f => ({ ...f, birdId: v === "none" ? "" : v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {birds.map(b => (
                    <SelectItem key={b.id} value={String(b.id)}>{b.name || b.ringId || `#${b.id}`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Linked Pair (optional)</Label>
              <Select value={form.pairId || "none"} onValueChange={v => setForm(f => ({ ...f, pairId: v === "none" ? "" : v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {pairs.map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>{pairLabel(p)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea className="mt-1" placeholder="Optional notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createEvent.isPending || updateEvent.isPending} className="bg-primary hover:bg-primary/90">
              {editingId ? "Save changes" : "Add event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
