import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import {
  monthNames,
  weekdayLabels,
  dateKey,
  buildCalendarGrid,
  formatCurrency,
  todayDateKey,
} from '../../../../core/src/index.js';
import s, { DARK } from '../../styles/styles.js';

export interface CalendarProps {
  year: number;
  month: number;
  spendByDay: Record<string, number>;
  currency?: string;
  onSelectDay: (date: string) => void;
  onPrev: () => void;
  onNext: () => void;
}

export function Calendar({
  year,
  month,
  spendByDay,
  currency = 'INR',
  onSelectDay,
  onPrev,
  onNext,
}: CalendarProps) {
  const cells = useMemo(() => buildCalendarGrid(year, month), [year, month]);
  const todayKey = todayDateKey();

  return (
    <View>
      <View style={s.rowTop}>
        <Text style={s.bold}>
          {monthNames[month]} {year}
        </Text>
        <View style={{ flexDirection: 'row', gap: 14 }}>
          <TouchableOpacity
            onPress={onPrev}
            style={s.calNavBtn}
            accessibilityRole="button"
            accessibilityLabel="Previous month"
          >
            <ChevronLeft size={18} color={DARK} strokeWidth={2.4} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onNext}
            style={s.calNavBtn}
            accessibilityRole="button"
            accessibilityLabel="Next month"
          >
            <ChevronRight size={18} color={DARK} strokeWidth={2.4} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={s.calRow}>
        {weekdayLabels.map((w) => (
          <Text style={s.calDow} key={w}>
            {w}
          </Text>
        ))}
      </View>
      <View style={s.calGrid}>
        {cells.map((c, i) => {
          const key = dateKey(c.y, c.m, c.day);
          const amt = spendByDay[key];
          return (
            <TouchableOpacity
              key={i}
              disabled={!c.inMonth}
              onPress={() => onSelectDay(key)}
              style={[
                s.calCell,
                !c.inMonth && s.calOut,
                key === todayKey && s.calToday,
                amt && s.calSpend,
              ]}
            >
              <Text style={s.calDay} maxFontSizeMultiplier={1.3}>
                {c.day}
              </Text>
              {amt ? (
                <Text style={s.calAmt} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                  {formatCurrency(amt, currency)}
                </Text>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
