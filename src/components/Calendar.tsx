import { Ionicons } from './ui/LucideIcon';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { startOfDay, toApiDate } from '../utils/format';
import { Text } from './ui';

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export interface DateRange {
  start: Date | null;
  end: Date | null;
}

/**
 * A month calendar for picking a stay's check-in and check-out.
 *
 * Weeks start on Monday, which is how calendars are read in Pakistan. Dates
 * before today and dates the host has blocked are not merely styled differently
 * — they are not pressable at all, so a guest cannot select a range that the
 * server will only reject at checkout.
 */
export function Calendar({
  range, onChange, blockedDates, minDate, maxMonths = 12,
}: {
  range: DateRange;
  onChange: (next: DateRange) => void;
  /** API date strings ("2026-08-15") the host has closed. */
  blockedDates?: Set<string>;
  minDate?: Date;
  maxMonths?: number;
}) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const floor = minDate ? startOfDay(minDate) : today;
  const [cursor, setCursor] = useState(() => new Date(floor.getFullYear(), floor.getMonth(), 1));

  const lastMonth = useMemo(() => {
    const d = new Date(floor.getFullYear(), floor.getMonth(), 1);
    d.setMonth(d.getMonth() + maxMonths - 1);
    return d;
  }, [floor, maxMonths]);

  const canGoBack = cursor > new Date(floor.getFullYear(), floor.getMonth(), 1);
  const canGoForward = cursor < lastMonth;

  const days = useMemo(() => buildMonthGrid(cursor), [cursor]);

  const select = (day: Date) => {
    // A fresh selection starts whenever there is no range in progress, or when
    // the tapped day is before the current start — tapping "earlier" should
    // move the check-in rather than create a backwards range.
    if (!range.start || range.end || day <= range.start) {
      onChange({ start: day, end: null });
      return;
    }
    // Refuse a range that jumps over a blocked night.
    if (blockedDates && rangeCrossesBlocked(range.start, day, blockedDates)) {
      onChange({ start: day, end: null });
      return;
    }
    onChange({ start: range.start, end: day });
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <NavButton icon="chevron-back" label="Previous month" disabled={!canGoBack} onPress={() => setCursor(shiftMonth(cursor, -1))} />
        <Text variant="subheading">
          {MONTH_NAMES[cursor.getMonth()]} {cursor.getFullYear()}
        </Text>
        <NavButton icon="chevron-forward" label="Next month" disabled={!canGoForward} onPress={() => setCursor(shiftMonth(cursor, 1))} />
      </View>

      <View style={styles.weekdays}>
        {WEEKDAYS.map((day) => (
          <Text key={day} variant="caption" tone="muted" center style={styles.cell}>
            {day}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {days.map((day, index) => {
          if (!day) return <View key={`pad-${index}`} style={styles.cell} />;

          const key = toApiDate(day);
          const past = day < floor;
          const blocked = blockedDates?.has(key) ?? false;
          const disabled = past || blocked;

          const isStart = Boolean(range.start && sameDay(day, range.start));
          const isEnd = Boolean(range.end && sameDay(day, range.end));
          const inRange = Boolean(range.start && range.end && day > range.start && day < range.end);

          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={`${day.getDate()} ${MONTH_NAMES[day.getMonth()]}${disabled ? ', unavailable' : ''}`}
              accessibilityState={{ disabled, selected: isStart || isEnd }}
              disabled={disabled}
              onPress={() => select(day)}
              style={[styles.cell, inRange && styles.inRange, isStart && styles.rangeStart, isEnd && styles.rangeEnd]}
            >
              <View style={[styles.day, (isStart || isEnd) && styles.daySelected]}>
                <Text
                  variant="small"
                  style={[
                    styles.dayText,
                    disabled && styles.dayDisabled,
                    (isStart || isEnd) && styles.dayTextSelected,
                  ]}
                >
                  {day.getDate()}
                </Text>
              </View>
              {blocked && !past ? <View style={styles.blockedDot} /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function NavButton({
  icon, label, disabled, onPress,
}: {
  icon: 'chevron-back' | 'chevron-forward';
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={10}
      onPress={onPress}
      style={({ pressed }) => [styles.nav, disabled && styles.navDisabled, pressed && { opacity: 0.6 }]}
    >
      <Ionicons name={icon} size={18} color={disabled ? colors.borderStrong : colors.text} />
    </Pressable>
  );
}

/* ── helpers ──────────────────────────────────────────────────────────────── */

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const shiftMonth = (date: Date, delta: number) =>
  new Date(date.getFullYear(), date.getMonth() + delta, 1);

/** Leading `null`s pad the first row so the 1st lands under its weekday. */
function buildMonthGrid(month: Date): (Date | null)[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  // getDay() is Sunday-first; shift so Monday is 0.
  const lead = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();

  const cells: (Date | null)[] = Array.from({ length: lead }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(month.getFullYear(), month.getMonth(), day));
  }
  return cells;
}

/** True when any night between check-in and check-out is closed. */
function rangeCrossesBlocked(start: Date, end: Date, blocked: Set<string>): boolean {
  const cursor = new Date(start);
  cursor.setDate(cursor.getDate() + 1);
  while (cursor < end) {
    if (blocked.has(toApiDate(cursor))) return true;
    cursor.setDate(cursor.getDate() + 1);
  }
  return false;
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.xs,
  },
  nav: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  navDisabled: { backgroundColor: 'transparent' },

  weekdays: { flexDirection: 'row' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },

  // Seven per row. A fixed percentage keeps the grid square on every width.
  cell: {
    width: `${100 / 7}%`,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inRange: { backgroundColor: colors.primarySoft },
  rangeStart: {
    backgroundColor: colors.primarySoft,
    borderTopLeftRadius: radius.full,
    borderBottomLeftRadius: radius.full,
  },
  rangeEnd: {
    backgroundColor: colors.primarySoft,
    borderTopRightRadius: radius.full,
    borderBottomRightRadius: radius.full,
  },

  day: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  daySelected: { backgroundColor: colors.primary },
  dayText: { color: colors.text },
  dayTextSelected: { color: colors.textOnPrimary, fontWeight: '700' },
  dayDisabled: { color: colors.borderStrong, textDecorationLine: 'line-through' },

  blockedDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.danger,
  },
});

export default Calendar;
