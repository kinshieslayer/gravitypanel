import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Monthly calendar component showing scheduled posts as colored dots.
 *
 * Props:
 *   posts    – array of { id, scheduled_time (ISO), status, title, platforms }
 *   month    – Date representing the displayed month
 *   onPrev   – callback for previous month
 *   onNext   – callback for next month
 *   onDayClick – callback(date) when a day cell is clicked
 */
export default function Calendar({ posts = [], month, onPrev, onNext, onDayClick }) {
  const year = month.getFullYear();
  const mo = month.getMonth();

  const firstDay = new Date(year, mo, 1).getDay();
  const daysInMonth = new Date(year, mo + 1, 0).getDate();

  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  /** Group posts by day-of-month */
  const postsByDay = useMemo(() => {
    const map = {};
    posts.forEach((p) => {
      const d = new Date(p.scheduled_time);
      if (d.getFullYear() === year && d.getMonth() === mo) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(p);
      }
    });
    return map;
  }, [posts, year, mo]);

  const statusColor = (s) => {
    if (s === 'posted') return 'bg-success-400';
    if (s === 'failed') return 'bg-danger-400';
    return 'bg-accent-400';
  };

  const cells = [];
  // Leading blanks
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const today = new Date();
  const isToday = (d) =>
    d && today.getFullYear() === year && today.getMonth() === mo && today.getDate() === d;

  return (
    <div className="glass-card p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={onPrev} className="p-1.5 rounded-lg hover:bg-dark-600/50 transition">
          <ChevronLeft size={18} />
        </button>
        <h3 className="text-sm font-semibold">
          {month.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h3>
        <button onClick={onNext} className="p-1.5 rounded-lg hover:bg-dark-600/50 transition">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-center text-[11px] font-medium text-dark-300 py-1">
            {w}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-px">
        {cells.map((day, i) => (
          <div
            key={i}
            onClick={() => day && onDayClick?.(new Date(year, mo, day))}
            className={`relative min-h-[56px] p-1 rounded-lg text-xs cursor-pointer transition-colors duration-150
              ${day ? 'hover:bg-dark-600/40' : ''}
              ${isToday(day) ? 'bg-accent-600/10 ring-1 ring-accent-500/30' : ''}
            `}
          >
            {day && (
              <>
                <span className={`block mb-1 font-medium ${isToday(day) ? 'text-accent-300' : 'text-dark-200'}`}>
                  {day}
                </span>
                <div className="flex flex-wrap gap-0.5">
                  {(postsByDay[day] || []).slice(0, 4).map((p) => (
                    <span
                      key={p.id}
                      className={`w-2 h-2 rounded-full ${statusColor(p.status)}`}
                      title={p.title}
                    />
                  ))}
                  {(postsByDay[day] || []).length > 4 && (
                    <span className="text-[9px] text-dark-300">
                      +{postsByDay[day].length - 4}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
