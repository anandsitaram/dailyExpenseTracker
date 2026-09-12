import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  monthNames,
  weekdayLabels,
  dateKey,
  buildCalendarGrid,
  formatCurrency,
  todayDateKey,
} from '../../../../core/src/index.js';

export interface CalendarViewProps {
  year: number;
  month: number;
  spendByDay: Record<string, number>;
  currency?: string;
  onSelectDay: (date: string) => void;
  onPrev: () => void;
  onNext: () => void;
}

export function CalendarView({
  year,
  month,
  spendByDay,
  currency = 'INR',
  onSelectDay,
  onPrev,
  onNext,
}: CalendarViewProps) {
  const cells = useMemo(() => buildCalendarGrid(year, month), [year, month]);
  const todayKey = todayDateKey();

  return (
    <div className="calendar">
      <div className="panelHead">
        <h2 style={{ fontSize: 14 }}>
          {monthNames[month]} {year}
        </h2>
        <div className="navBtns">
          <button onClick={onPrev} aria-label="Previous month">
            <ChevronLeft size={16} />
          </button>
          <button onClick={onNext} aria-label="Next month">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <div className="calGrid">
        {weekdayLabels.map((w) => (
          <div className="calDow" key={w}>
            {w}
          </div>
        ))}
        {cells.map((c, i) => {
          const key = dateKey(c.y, c.m, c.day);
          const amt = spendByDay[key];
          return (
            <div
              key={i}
              className={
                'calCell' +
                (c.inMonth ? '' : ' outMonth') +
                (key === todayKey ? ' today' : '') +
                (amt ? ' hasSpend' : '')
              }
              onClick={() => c.inMonth && onSelectDay(key)}
            >
              <span className="calDay">{c.day}</span>
              {amt ? <span className="calAmt">{formatCurrency(amt, currency)}</span> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
