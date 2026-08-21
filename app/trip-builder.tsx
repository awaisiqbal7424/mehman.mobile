import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { errorMessage } from '../src/api/client';
import { customTripApi, tripBuilderApi } from '../src/api/services';
import { Calendar, type DateRange } from '../src/components/Calendar';
import {
  Button, Card, Divider, FooterBar, Header, Input, Loading, Row, Screen, SelectField,
  Sheet, Stepper, Text, TextArea, useToast,
} from '../src/components/ui';
import { PLACEHOLDER_IMAGE } from '../src/constants';
import { useAuth } from '../src/store/auth';
import { colors, radius, spacing } from '../src/theme';
import { addDays, formatShortDate, pkr, plural, toApiDate } from '../src/utils/format';

const TRIP_TYPES = [
  { id: 'ADVENTURE', label: 'Adventure', icon: 'trail-sign-outline' as const },
  { id: 'HONEYMOON', label: 'Honeymoon', icon: 'heart-outline' as const },
  { id: 'FAMILY', label: 'Family', icon: 'people-outline' as const },
  { id: 'CULTURAL', label: 'Cultural', icon: 'library-outline' as const },
  { id: 'RELIGIOUS', label: 'Religious', icon: 'moon-outline' as const },
  { id: 'BUSINESS', label: 'Business', icon: 'briefcase-outline' as const },
];

const ACCOMMODATION = [
  { id: 'BUDGET', label: 'Budget', hint: 'Clean and simple' },
  { id: 'MID_RANGE', label: 'Mid-range', hint: 'Comfortable hotels' },
  { id: 'LUXURY', label: 'Luxury', hint: 'The best available' },
];

const TRANSPORT = [
  { id: 'BUS', label: 'Coach', hint: 'Shared, most affordable' },
  { id: 'SUV', label: 'Jeep / SUV', hint: 'Best for the north' },
  { id: 'VAN', label: 'Van', hint: 'Room for a group' },
  { id: 'MIXED', label: 'Mixed', hint: 'Whatever suits each leg' },
];

const MEALS = [
  { id: 'INCLUDED', label: 'All meals', hint: 'Everything arranged' },
  { id: 'BREAKFAST_ONLY', label: 'Breakfast only', hint: 'Eat out for the rest' },
  { id: 'NONE', label: 'No meals', hint: 'We will sort ourselves out' },
];

const STEPS = ['Basics', 'Where', 'What', 'Comfort', 'Review'] as const;

/**
 * The custom trip builder.
 *
 * Five steps rather than the web version's six, and one screen per step. The
 * jump each step makes is small enough to answer without thinking hard, which
 * matters more on a phone than saving a tap: a long form on a small screen is
 * where people give up. Nothing is sent until the last step, and the running
 * estimate is refreshed as the answers change so the price is never a surprise
 * at the end.
 */
export default function TripBuilderScreen() {
  const router = useRouter();
  const toast = useToast();
  const user = useAuth((s) => s.user);

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);

  const [tripType, setTripType] = useState('');
  const [range, setRange] = useState<DateRange>({ start: null, end: null });
  const [durationDays, setDurationDays] = useState(3);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [originCity, setOriginCity] = useState('');
  const [destinations, setDestinations] = useState<string[]>([]);
  const [activities, setActivities] = useState<string[]>([]);
  const [accommodation, setAccommodation] = useState('MID_RANGE');
  const [transport, setTransport] = useState('SUV');
  const [meals, setMeals] = useState('INCLUDED');
  const [budget, setBudget] = useState('');
  const [notes, setNotes] = useState('');

  const destinationOptions = useQuery({
    queryKey: ['destinations', 'all'],
    queryFn: () => tripBuilderApi.destinations(),
  });

  const activityOptions = useQuery({
    queryKey: ['activities'],
    queryFn: () => tripBuilderApi.activities(),
  });

  const guestCount = adults + children;

  const estimate = useQuery({
    queryKey: ['trip-estimate', durationDays, guestCount, accommodation, transport, meals, destinations.length],
    queryFn: () =>
      tripBuilderApi.estimate({
        durationDays,
        guestCount,
        accommodationPreference: accommodation,
        transportPreference: transport,
        mealPreference: meals,
        destinationCount: destinations.length || 1,
      }),
    enabled: step >= 3 && destinations.length > 0,
  });

  const canProceed = useMemo(() => {
    if (step === 0) return Boolean(tripType) && durationDays > 0;
    if (step === 1) return destinations.length > 0;
    if (step === 2) return activities.length > 0;
    return true;
  }, [activities.length, destinations.length, durationDays, step, tripType]);

  const toggle = (list: string[], setList: (next: string[]) => void, id: string) =>
    setList(list.includes(id) ? list.filter((value) => value !== id) : [...list, id]);

  const onSubmit = async () => {
    if (!user) {
      router.replace('/sign-in?redirect=/trip-builder');
      return;
    }
    if (submitting) return;
    setSubmitting(true);

    try {
      const startDate = range.start ? toApiDate(range.start) : undefined;
      const draft = await customTripApi.createDraft({
        guestId: user.id,
        title: `${TRIP_TYPES.find((t) => t.id === tripType)?.label ?? 'Custom'} trip`,
        tripType,
        startDate,
        endDate: range.start ? toApiDate(addDays(range.start, durationDays)) : undefined,
        durationDays,
        guestCount,
        adultCount: adults,
        childCount: children,
        originCity: originCity.trim() || undefined,
        destinationsJson: JSON.stringify(
          destinations.map((destinationId, order) => ({ destinationId, nights: 1, order })),
        ),
        activitiesJson: JSON.stringify(activities),
        accommodationPreference: accommodation,
        transportPreference: transport,
        mealPreference: meals,
        specialRequirements: notes.trim() || undefined,
        budget: budget ? Number(budget) : undefined,
        status: 'DRAFT',
      });

      // Draft then submit: the draft is what carries the answers, the submit is
      // what puts it in front of operators. Two calls, but a failure on the
      // second leaves a recoverable draft rather than nothing.
      await customTripApi.submit(draft.id);

      toast.success('Your request is with our operators');
      router.replace(`/trip/${draft.id}`);
    } catch (err) {
      toast.error(errorMessage(err, 'We could not send that request.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen
      scroll
      footer={
        <FooterBar>
          <View style={styles.footerRow}>
            {step > 0 ? (
              <Button label="Back" variant="outline" onPress={() => setStep(step - 1)} style={styles.backButton} />
            ) : null}
            {step < STEPS.length - 1 ? (
              <Button
                label="Continue"
                size="lg"
                iconAfter="arrow-forward"
                disabled={!canProceed}
                onPress={() => setStep(step + 1)}
                style={styles.flex}
              />
            ) : (
              <Button
                label={user ? 'Send to operators' : 'Sign in to send'}
                size="lg"
                icon="paper-plane-outline"
                loading={submitting}
                onPress={() => void onSubmit()}
                style={styles.flex}
              />
            )}
          </View>
        </FooterBar>
      }
    >
      <Header
        title="Build your trip"
        subtitle={`Step ${step + 1} of ${STEPS.length} · ${STEPS[step]}`}
        onBack={() => (step > 0 ? setStep(step - 1) : router.back())}
      />

      {/* ── progress ────────────────────────────────────────────────────── */}
      <View style={styles.progress}>
        {STEPS.map((label, index) => (
          <View
            key={label}
            style={[
              styles.progressBar,
              index === step && styles.progressCurrent,
              index < step && styles.progressDone,
            ]}
          />
        ))}
      </View>

      <View style={styles.body}>
        {/* ── 0 · basics ──────────────────────────────────────────────── */}
        {step === 0 ? (
          <>
            <Text variant="title">What kind of trip?</Text>
            <View style={styles.tiles}>
              {TRIP_TYPES.map((option) => (
                <ChoiceTile
                  key={option.id}
                  icon={option.icon}
                  label={option.label}
                  selected={tripType === option.id}
                  onPress={() => setTripType(option.id)}
                />
              ))}
            </View>

            <Divider />

            <SelectField
              label="Start date"
              icon="calendar-outline"
              placeholder="Flexible — pick later"
              value={range.start ? formatShortDate(range.start) : null}
              onPress={() => setDateOpen(true)}
            />

            <Stepper
              label="Days"
              sublabel="How long do you have?"
              value={durationDays}
              onChange={setDurationDays}
              min={1}
              max={30}
            />
            <Divider />
            <Stepper label="Adults" value={adults} onChange={setAdults} min={1} max={20} />
            <Stepper label="Children" sublabel="Under 12" value={children} onChange={setChildren} min={0} max={10} />

            <Input
              label="Travelling from"
              icon="navigate-outline"
              placeholder="Lahore, Karachi, Islamabad…"
              value={originCity}
              onChangeText={setOriginCity}
              autoCapitalize="words"
            />
          </>
        ) : null}

        {/* ── 1 · where ───────────────────────────────────────────────── */}
        {step === 1 ? (
          <>
            <Text variant="title">Where do you want to go?</Text>
            <Text variant="small" tone="secondary">
              Pick as many as you like — the operator will work out a sensible route.
            </Text>

            {destinationOptions.isLoading ? (
              <Loading label="Loading destinations…" />
            ) : (
              <View style={styles.destinations}>
                {destinationOptions.data?.map((destination) => {
                  const selected = destinations.includes(destination.id);
                  return (
                    <Pressable
                      key={destination.id}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      accessibilityLabel={destination.name}
                      onPress={() => toggle(destinations, setDestinations, destination.id)}
                      style={[styles.destination, selected && styles.destinationOn]}
                    >
                      <Image
                        source={{ uri: destination.imageUrl ?? PLACEHOLDER_IMAGE }}
                        style={styles.destinationImage}
                        contentFit="cover"
                        transition={200}
                      />
                      <View style={styles.destinationBody}>
                        <Text variant="smallStrong" numberOfLines={1}>
                          {destination.name}
                        </Text>
                        <Text variant="small" tone="muted" numberOfLines={1}>
                          {destination.region}
                        </Text>
                      </View>
                      {selected ? (
                        <View style={styles.destinationCheck}>
                          <Ionicons name="checkmark" size={13} color={colors.textOnPrimary} />
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </>
        ) : null}

        {/* ── 2 · what ────────────────────────────────────────────────── */}
        {step === 2 ? (
          <>
            <Text variant="title">What do you want to do?</Text>
            <Text variant="small" tone="secondary">
              This is what shapes the itinerary you get back.
            </Text>

            {activityOptions.isLoading ? (
              <Loading label="Loading activities…" />
            ) : (
              <View style={styles.pills}>
                {activityOptions.data?.map((activity) => {
                  const selected = activities.includes(activity.id);
                  return (
                    <Pressable
                      key={activity.id}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      onPress={() => toggle(activities, setActivities, activity.id)}
                      style={[styles.pill, selected && styles.pillOn]}
                    >
                      <Text variant="smallStrong" tone={selected ? 'inverse' : 'default'}>
                        {activity.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </>
        ) : null}

        {/* ── 3 · comfort ─────────────────────────────────────────────── */}
        {step === 3 ? (
          <>
            <Text variant="title">How do you like to travel?</Text>

            <OptionGroup label="Accommodation" options={ACCOMMODATION} value={accommodation} onChange={setAccommodation} />
            <OptionGroup label="Transport" options={TRANSPORT} value={transport} onChange={setTransport} />
            <OptionGroup label="Meals" options={MEALS} value={meals} onChange={setMeals} />

            <Input
              label="Budget per person"
              icon="cash-outline"
              placeholder="Optional"
              value={budget}
              onChangeText={setBudget}
              keyboardType="number-pad"
              hint={budget ? pkr(Number(budget)) : 'Telling us helps operators quote realistically.'}
            />

            {estimate.data ? (
              <Card style={styles.estimate}>
                <Text variant="caption" tone="primary">
                  ROUGH ESTIMATE
                </Text>
                <Text variant="title">{pkr(estimate.data.totalForGroup)}</Text>
                <Text variant="small" tone="secondary">
                  {pkr(estimate.data.totalPerPerson)} per person · {plural(guestCount, 'traveller')}
                </Text>
                <Text variant="small" tone="muted" style={styles.estimateNote}>
                  {estimate.data.estimateNote ??
                    'A guide only. Operators send you a real price once they have seen your request.'}
                </Text>
              </Card>
            ) : null}
          </>
        ) : null}

        {/* ── 4 · review ──────────────────────────────────────────────── */}
        {step === 4 ? (
          <>
            <Text variant="title">Ready to send?</Text>
            <Text variant="small" tone="secondary">
              Verified operators will see this and send you a price. Nothing is committed.
            </Text>

            <Card>
              <Row label="Trip type" value={TRIP_TYPES.find((t) => t.id === tripType)?.label} />
              <Row label="Start" value={range.start ? formatShortDate(range.start) : 'Flexible'} />
              <Row label="Length" value={plural(durationDays, 'day')} />
              <Row
                label="Travellers"
                value={`${plural(adults, 'adult')}${children ? `, ${plural(children, 'child', 'children')}` : ''}`}
              />
              {originCity ? <Row label="From" value={originCity} /> : null}
              <Divider />
              <Row label="Destinations" value={plural(destinations.length, 'place')} />
              <Row label="Activities" value={plural(activities.length, 'activity', 'activities')} />
              <Divider />
              <Row label="Stays" value={ACCOMMODATION.find((a) => a.id === accommodation)?.label} />
              <Row label="Transport" value={TRANSPORT.find((t) => t.id === transport)?.label} />
              <Row label="Meals" value={MEALS.find((m) => m.id === meals)?.label} />
              {budget ? <Row label="Budget" value={`${pkr(Number(budget))} per person`} /> : null}
            </Card>

            <TextArea
              label="Anything else operators should know?"
              placeholder="Accessibility needs, a birthday to mark, a place you must not miss…"
              value={notes}
              onChangeText={setNotes}
            />
          </>
        ) : null}
      </View>

      <Sheet visible={dateOpen} onClose={() => setDateOpen(false)} title="When do you want to start?">
        <Calendar
          range={{ start: range.start, end: null }}
          onChange={(next) => {
            setRange({ start: next.start, end: null });
            setDateOpen(false);
          }}
        />
      </Sheet>
    </Screen>
  );
}

/* ── small pieces ─────────────────────────────────────────────────────────── */

function ChoiceTile({
  icon, label, selected, onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.tile, selected && styles.tileOn]}
    >
      <Ionicons name={icon} size={24} color={selected ? colors.primary : colors.textSecondary} />
      <Text variant="smallStrong" center>
        {label}
      </Text>
    </Pressable>
  );
}

function OptionGroup({
  label, options, value, onChange,
}: {
  label: string;
  options: { id: string; label: string; hint: string }[];
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <View style={styles.group}>
      <Text variant="bodyStrong">{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.groupRow}>
        {options.map((option) => {
          const selected = value === option.id;
          return (
            <Pressable
              key={option.id}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => onChange(option.id)}
              style={[styles.groupOption, selected && styles.groupOptionOn]}
            >
              <Text variant="smallStrong" tone={selected ? 'primary' : 'default'}>
                {option.label}
              </Text>
              <Text variant="small" tone="muted">
                {option.hint}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  progress: { flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
  progressBar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  progressCurrent: { backgroundColor: colors.primary },
  progressDone: { backgroundColor: colors.success },

  body: { paddingHorizontal: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xl },

  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: {
    width: '31%',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tileOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },

  destinations: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  destination: {
    width: '47%',
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  destinationOn: { borderColor: colors.primary },
  destinationImage: { width: '100%', height: 92, backgroundColor: colors.surfaceMuted },
  destinationBody: { padding: spacing.md, gap: 1 },
  destinationCheck: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pillOn: { backgroundColor: colors.primary, borderColor: colors.primary },

  group: { gap: spacing.sm },
  groupRow: { gap: spacing.sm, paddingVertical: spacing.xs },
  groupOption: {
    minWidth: 140,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 2,
  },
  groupOptionOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },

  estimate: { gap: 2 },
  estimateNote: { marginTop: spacing.sm },

  footerRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  backButton: { minWidth: 96 },
});
