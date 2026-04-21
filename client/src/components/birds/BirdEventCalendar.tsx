import { useState, useMemo } from "react";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, Pencil, Trash2, Plus, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const TYPE_DOT: Record<string, string> = {
  vet:         "bg-red-400",
  medication:  "bg-orange-400",
  banding:     "bg-purple-400",
  supplements: "bg-green-400",
  weaning:     "bg-blue-400",
  sale:        "bg-sky-400",
  other:       "bg-gray-400",
};

interface Props {
  events: any[];
  onAddEvent: (date?: string) => void;
  onEditEvent: (event: any) => void;
  onDeleteEvent: (id: number) => void;
  onToggleComplete: (id: number) => void;
}

export function BirdEventCalendar({ events, onAddEvent, onEditEvent, onDeleteEvent, onToggleComplete }: Props) {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const eventsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const ev of events) {
      if (!ev.eventDate) continue;
      const key = String(ev.eventDate).split("T")[0];
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    }
    return map;
  }, [events]);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const selectedDayEvents = useMemo(() => {
    if (!selectedDay) return [];
    const key = format(selectedDay, "yyyy-MM-dd");
    return eventsByDate[key] ?? [];
  }, [selectedDay, eventsByDate]);

  const handleDayClick = (day: Date) => {
    setSelectedDay(prev => (prev && isSameDay(prev, day) ? null : day));
  };

  return (
    <div className="space-y-3">
      {/* Month navigation */}
      <div className="flex items-center justify-between px-1">
        <button
          onClick={() => setCurrentMonth(d => subMonths(d, 1))}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="font-semibold text-sm">{format(currentMonth, "MMMM yyyy")}</span>
        <button
          onClick={() => setCurrentMonth(d => addMonths(d, 1))}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 text-center">
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map(d => (
          <div key={d} className="text-[11px] font-medium text-muted-foreground py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {calendarDays.map(day => {
          const key = format(day, "yyyy-MM-dd");
          const dayEvents = eventsByDate[key] ?? [];
          const isSelected = !!selectedDay && isSameDay(day, selectedDay);
          const inMonth = isSameMonth(day, currentMonth);
          const todayDay = isToday(day);

          return (
            <button
              key={key}
              onClick={() => handleDayClick(day)}
              className={`
                flex flex-col items-center justify-start py-1.5 px-0.5 rounded-lg min-h-[48px] transition-colors
                ${isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted"}
                ${!inMonth ? "opacity-25 pointer-events-none" : ""}
              `}
            >
              <span className={`
                text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-0.5
                ${todayDay && !isSelected ? "bg-primary/10 text-primary font-bold" : ""}
              `}>
                {format(day, "d")}
              </span>
              <div className="flex gap-0.5 flex-wrap justify-center px-1">
                {dayEvents.slice(0, 4).map((ev, i) => (
                  <span
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-primary-foreground/80" : (TYPE_DOT[ev.eventType] ?? "bg-gray-400")}`}
                  />
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected day panel */}
      {selectedDay && (
        <div className="border-t pt-4 mt-2">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-sm text-foreground">
              {format(selectedDay, "EEEE, d MMMM yyyy")}
            </h4>
            <Button
              size="sm"
              variant="outline"
              className="gap-1 h-7 text-xs"
              onClick={() => onAddEvent(format(selectedDay, "yyyy-MM-dd"))}
            >
              <Plus className="h-3 w-3" /> Add
            </Button>
          </div>

          {selectedDayEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events on this day.</p>
          ) : (
            <div className="space-y-2">
              {selectedDayEvents.map(ev => (
                <div
                  key={ev.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border border-border bg-white transition-all ${ev.completed ? "opacity-60" : ""}`}
                >
                  <button
                    className="shrink-0 mt-0.5"
                    onClick={() => onToggleComplete(ev.id)}
                    aria-label={ev.completed ? "Mark incomplete" : "Mark complete"}
                  >
                    {ev.completed
                      ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      : <Circle className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
                    }
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${ev.completed ? "line-through text-muted-foreground" : ""}`}>
                      {ev.title}
                    </p>
                    {ev.notes && <p className="text-xs text-muted-foreground mt-0.5">{ev.notes}</p>}
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0 mt-0.5">{ev.eventType}</Badge>
                  <button
                    onClick={() => onEditEvent(ev)}
                    className="shrink-0 mt-0.5 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => { if (confirm("Delete this event?")) onDeleteEvent(ev.id); }}
                    className="shrink-0 mt-0.5 text-muted-foreground hover:text-destructive transition-colors"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty state when nothing selected and no events at all */}
      {!selectedDay && events.length === 0 && (
        <div className="text-center py-10 text-muted-foreground">
          <p className="text-sm">No events recorded for this bird.</p>
          <Button onClick={() => onAddEvent()} variant="outline" className="mt-3 gap-2 text-sm h-8">
            <Plus className="h-3.5 w-3.5" /> Add your first event
          </Button>
        </div>
      )}
    </div>
  );
}
