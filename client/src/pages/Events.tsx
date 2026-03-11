import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { CalendarDays, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { isPast } from "date-fns";

import { useEvents } from "@/hooks/useEvents";
import { type EventFormData, generateDates } from "@/hooks/useEventForm";
import { EventCard } from "@/components/events/EventCard";
import { EventFormModal } from "@/components/events/EventFormModal";

export default function Events() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingEvent, setEditingEvent] = useState<any>(null);

  const {
    events,
    birds,
    pairs,
    birdMap,
    pairLabel,
    isLoading,
    showCompleted,
    setShowCompleted,
    grouped,
    sortedKeys,
    createEvent,
    updateEvent,
    deleteEvent,
    toggleComplete,
    deleteAllEvents,
    utils,
  } = useEvents();

  const openAdd = () => {
    setEditingId(null);
    setEditingEvent(null);
    setDialogOpen(true);
  };

  const openEdit = (ev: any) => {
    setEditingId(ev.id);
    setEditingEvent(ev);
    setDialogOpen(true);
  };

  const handleSubmit = async (form: EventFormData) => {
    if (!form.title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    const baseDate = form.eventDate || new Date().toISOString().split("T")[0];
    const basePayload = {
      title: form.title.trim(),
      eventType: form.eventType,
      pairId: form.pairId ? Number(form.pairId) : undefined,
      notes: form.notes || undefined,
    };

    if (editingId) {
      updateEvent.mutate({
        id: editingId,
        ...basePayload,
        eventDate: baseDate,
        birdId: form.birdId && form.birdId !== "all" ? Number(form.birdId) : undefined,
      });
      return;
    }

    const recurrenceUnit =
      form.recurrence === "none"
        ? undefined
        : form.recurrence === "daily"
          ? "days"
          : form.recurrence === "weekly"
            ? "weeks"
            : form.recurrence === "monthly"
              ? "months"
              : form.recurrence === "yearly"
                ? "years"
                : form.customUnit;

    const recurrenceInterval =
      form.recurrence === "none"
        ? undefined
        : form.recurrence === "custom"
          ? form.customInterval
          : 1;

    const occurrences = form.neverEnding
      ? 2
      : form.recurrence === "none"
        ? 1
        : form.recurrenceCount;

    const dates = generateDates(
      baseDate,
      form.recurrence,
      occurrences,
      form.customInterval,
      form.customUnit
    );

    const isAllBirds = form.birdId === "all";
    const specificBirdId =
      !isAllBirds && form.birdId ? Number(form.birdId) : undefined;

    const seriesId =
      dates.length > 1 || form.neverEnding ? crypto.randomUUID() : undefined;

    const creates = dates.map((date) =>
      createEvent.mutateAsync({
        ...basePayload,
        eventDate: date,
        birdId: specificBirdId,
        allBirds: isAllBirds,
        seriesId,
        recurrenceUnit,
        recurrenceInterval,
        isIndefinite: form.neverEnding || undefined,
      })
    );

    try {
      await Promise.all(creates);
      const total = creates.length;
      toast.success(total === 1 ? "Event added!" : `${total} events added!`);
      utils.events.list.invalidate();
      utils.dashboard.stats.invalidate();
      setDialogOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create events");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Events & Reminders
            </h1>
            <p className="text-muted-foreground mt-1">
              {events.filter((e) => !e.completed).length} upcoming
            </p>
          </div>
          <div className="flex gap-2">
            {events.length > 0 && (
              <Button
                variant="outline"
                className="text-destructive border-destructive hover:bg-destructive hover:text-white gap-2"
                onClick={() => {
                  if (confirm("Delete all events? This cannot be undone."))
                    deleteAllEvents.mutate();
                }}
              >
                <Trash2 className="h-4 w-4" /> Clear all
              </Button>
            )}
            <Button
              id="tour-add-event-btn"
              onClick={openAdd}
              className="bg-primary hover:bg-primary/90 shadow-md gap-2"
            >
              <Plus className="h-4 w-4" /> Add Event
            </Button>
          </div>
        </div>

        <div id="tour-events-filters" className="flex gap-2">
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
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-16 rounded-xl bg-muted animate-pulse"
              />
            ))}
          </div>
        ) : events.filter((e) => (showCompleted ? e.completed : !e.completed))
          .length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">
              {showCompleted ? "No completed events" : "No upcoming events"}
            </p>
            {!showCompleted && (
              <Button
                onClick={openAdd}
                variant="outline"
                className="mt-4 gap-2"
              >
                <Plus className="h-4 w-4" />
                Add your first event
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {sortedKeys.map((dateKey) => {
              const eventsForDate = grouped[dateKey];
              const isPastDate =
                dateKey !== "Today" &&
                dateKey !== "Tomorrow" &&
                dateKey !== "No date" &&
                isPast(new Date(dateKey));

              return (
                <div key={dateKey}>
                  <div className="flex items-center gap-2 mb-2">
                    <h3
                      className={`text-sm font-semibold ${dateKey === "Today"
                        ? "text-primary"
                        : isPastDate && !showCompleted
                          ? "text-destructive"
                          : "text-muted-foreground"
                        }`}
                    >
                      {dateKey === "Today"
                        ? "📅 Today"
                        : dateKey === "Tomorrow"
                          ? "📅 Tomorrow"
                          : dateKey}
                    </h3>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  <div className="space-y-2">
                    {eventsForDate.map((ev: any) => (
                      <EventCard
                        key={ev.id}
                        ev={ev}
                        linkedBird={ev.birdId ? birdMap[ev.birdId] : null}
                        linkedPair={
                          ev.pairId
                            ? pairs.find((p) => p.id === ev.pairId)
                            : null
                        }
                        pairLabel={pairLabel}
                        onEdit={() => openEdit(ev)}
                        onDelete={() => {
                          if (confirm("Delete this event?")) {
                            deleteEvent.mutate({ id: ev.id });
                          }
                        }}
                        onToggleComplete={() =>
                          toggleComplete.mutate({ id: ev.id })
                        }
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <EventFormModal
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingId={editingId}
        initialEvent={editingEvent}
        birds={birds}
        pairs={pairs}
        pairLabel={pairLabel}
        onSubmit={handleSubmit}
        isSubmitting={updateEvent.isPending}
      />
    </DashboardLayout>
  );
}
