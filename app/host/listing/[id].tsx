import { Ionicons } from '../../../src/components/ui/LucideIcon';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { errorMessage } from '../../../src/api/client';
import { packageApi, pricingOptionApi } from '../../../src/api/services';
import {
  Button, Card, ConfirmSheet, Divider, ErrorState, FooterBar, Header, Input, Loading, Notice,
  Screen, Sheet, Stepper, Text, TextArea, useToast,
} from '../../../src/components/ui';
import { useAuth } from '../../../src/store/auth';
import { colors, radius, spacing } from '../../../src/theme';
import type { PackagePricingOption, ProviderPackage } from '../../../src/types';
import { pkr } from '../../../src/utils/format';
import { isSlotBased, packageImages, parseJsonArray } from '../../../src/utils/packages';

const PRICING_TYPES = [
  { id: 'PERCENTAGE_DECREASE', label: 'Discount', hint: '% off the base price — Couple Discount, Early Bird…' },
  { id: 'FIXED', label: 'Fixed price', hint: 'A specific price for this guest type' },
  { id: 'PERCENTAGE_INCREASE', label: 'Surcharge', hint: '% added to the base price' },
] as const;

const TYPES = [
  { id: 'TOUR', label: 'Tour', icon: 'trail-sign-outline' as const, hint: 'Multi-day, sold by the seat' },
  { id: 'STAY', label: 'Stay', icon: 'bed-outline' as const, hint: 'A place to sleep, priced per night' },
];

const CANCELLATION = [
  'Flexible — full refund up to 24 hours before',
  'Moderate — full refund up to 5 days before',
  'Strict — 50% refund up to 7 days before',
];

/**
 * Create or edit a listing.
 *
 * One screen rather than a wizard: a host editing a price wants to change one
 * field and leave, and a five-step wizard punishes them for it. The form
 * reshapes itself around the type — a tour asks about days and seats, a stay
 * asks about bedrooms and occupancy — so nobody fills in fields that do not
 * apply to what they run.
 */
export default function ListingEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const provider = useAuth((s) => s.provider);

  const isNew = id === 'new';

  const existing = useQuery({
    queryKey: ['package', id],
    queryFn: () => packageApi.getById(id),
    enabled: !isNew && Boolean(id),
  });

  // Pricing options are their own resource, keyed to a package that must
  // already exist — so, like seasonal pricing, they only show up once a
  // listing has been saved at least once.
  const pricingOptions = useQuery({
    queryKey: ['pricing-options', id],
    queryFn: () => pricingOptionApi.forPackage(id),
    enabled: !isNew && Boolean(id),
  });
  const [optionSheetOpen, setOptionSheetOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<PackagePricingOption | null>(null);
  const [optionLabel, setOptionLabel] = useState('');
  const [optionType, setOptionType] = useState<(typeof PRICING_TYPES)[number]['id']>('PERCENTAGE_DECREASE');
  const [optionValue, setOptionValue] = useState('');
  const [optionDescription, setOptionDescription] = useState('');
  const [optionSaving, setOptionSaving] = useState(false);
  const [optionErrors, setOptionErrors] = useState<{ label?: string; value?: string }>({});

  const [packageType, setPackageType] = useState('TOUR');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [durationDays, setDurationDays] = useState(3);
  const [durationNights, setDurationNights] = useState(2);
  const [minGuests, setMinGuests] = useState(1);
  const [maxGuests, setMaxGuests] = useState(12);
  const [bedrooms, setBedrooms] = useState(1);
  const [bathrooms, setBathrooms] = useState(1);
  const [maxOccupancy, setMaxOccupancy] = useState(4);
  const [meetingPoint, setMeetingPoint] = useState('');
  const [startLocation, setStartLocation] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [includes, setIncludes] = useState<string[]>([]);
  const [excludes, setExcludes] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [cancellationPolicy, setCancellationPolicy] = useState(CANCELLATION[1]);
  const [instantBook, setInstantBook] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; price?: string }>({});
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Fill the form once the listing arrives.
  useEffect(() => {
    const item = existing.data;
    if (!item) return;
    setPackageType(item.packageType ?? 'TOUR');
    setName(item.name ?? '');
    setDescription(item.description ?? '');
    setPrice(String((isSlotBased(item.packageType) ? item.price : item.pricePerNight) ?? ''));
    setDurationDays(item.durationDays ?? 3);
    setDurationNights(item.durationNights ?? 2);
    setMinGuests(item.minGuests ?? 1);
    setMaxGuests(item.maxGuests ?? 12);
    setBedrooms(item.bedrooms ?? 1);
    setBathrooms(item.bathrooms ?? 1);
    setMaxOccupancy(item.maxOccupancy ?? 4);
    setMeetingPoint(item.meetingPoint ?? '');
    setStartLocation(item.startLocation ?? '');
    setDifficulty(item.difficultyLevel ?? '');
    setIncludes(parseJsonArray<string>(item.packageIncludesJson));
    setExcludes(parseJsonArray<string>(item.packageExcludesJson));
    setImages(packageImages(item));
    setCancellationPolicy(item.cancellationPolicy ?? CANCELLATION[1]);
    setInstantBook(Boolean(item.isInstantBook));
  }, [existing.data]);

  const slotBased = isSlotBased(packageType);

  const addImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast.error('Allow photo access to add pictures to your listing.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: 8,
    });
    if (result.canceled) return;
    setImages((current) => [...current, ...result.assets.map((asset) => asset.uri)]);
  };

  const save = async () => {
    const next: typeof errors = {};
    if (!name.trim()) next.name = 'Give your listing a name guests will recognise.';
    if (!price || Number(price) <= 0) next.price = 'Set a price.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      const payload: Partial<ProviderPackage> = {
        providerId: provider?.id,
        providerOwnerId: provider?.providerOwnerId,
        packageType,
        name: name.trim(),
        description: description.trim() || undefined,
        currency: 'PKR',
        isActive: true,
        isInstantBook: instantBook,
        cancellationPolicy,
        packageIncludesJson: JSON.stringify(includes),
        packageExcludesJson: JSON.stringify(excludes),
        imagesJson: JSON.stringify(images),
        thumbImageUrl: images[0],
        ...(slotBased
          ? {
              price: Number(price),
              durationDays,
              durationNights,
              minGuests,
              maxGuests,
              meetingPoint: meetingPoint.trim() || undefined,
              startLocation: startLocation.trim() || undefined,
              difficultyLevel: difficulty || undefined,
            }
          : {
              pricePerNight: Number(price),
              bedrooms,
              bathrooms,
              maxOccupancy,
            }),
      };

      if (isNew) await packageApi.create(payload);
      else await packageApi.update(id, { ...existing.data, ...payload });

      await queryClient.invalidateQueries({ queryKey: ['host-listings'] });
      await queryClient.invalidateQueries({ queryKey: ['host-dashboard'] });
      toast.success(isNew ? 'Listing created' : 'Listing updated');
      router.back();
    } catch (err) {
      toast.error(errorMessage(err, 'We could not save that listing.'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await packageApi.remove(id);
      await queryClient.invalidateQueries({ queryKey: ['host-listings'] });
      await queryClient.invalidateQueries({ queryKey: ['host-dashboard'] });
      toast.success('Listing deleted');
      router.back();
    } catch (err) {
      toast.error(errorMessage(err, 'We could not delete that listing.'));
      setDeleteOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const openNewOption = () => {
    setEditingOption(null);
    setOptionLabel('');
    setOptionType('PERCENTAGE_DECREASE');
    setOptionValue('');
    setOptionDescription('');
    setOptionErrors({});
    setOptionSheetOpen(true);
  };

  const openEditOption = (option: PackagePricingOption) => {
    setEditingOption(option);
    setOptionLabel(option.label ?? '');
    setOptionType((option.pricingType as (typeof PRICING_TYPES)[number]['id']) ?? 'PERCENTAGE_DECREASE');
    setOptionValue(
      String((option.pricingType === 'FIXED' ? option.price : option.percentageChange) ?? ''),
    );
    setOptionDescription(option.description ?? '');
    setOptionErrors({});
    setOptionSheetOpen(true);
  };

  const saveOption = async () => {
    const next: typeof optionErrors = {};
    if (!optionLabel.trim()) next.label = 'Give it a name guests will recognise.';
    if (!optionValue || Number(optionValue) <= 0) next.value = 'Set a value.';
    setOptionErrors(next);
    if (Object.keys(next).length) return;

    setOptionSaving(true);
    try {
      const payload: Partial<PackagePricingOption> = {
        packageId: id,
        label: optionLabel.trim(),
        pricingType: optionType,
        description: optionDescription.trim() || undefined,
        isActive: true,
        ...(optionType === 'FIXED'
          ? { price: Number(optionValue), percentageChange: undefined }
          : { percentageChange: Number(optionValue), price: undefined }),
      };

      if (editingOption) await pricingOptionApi.update(editingOption.id, payload);
      else await pricingOptionApi.create(payload);

      await queryClient.invalidateQueries({ queryKey: ['pricing-options', id] });
      toast.success(editingOption ? 'Pricing option updated' : 'Pricing option added');
      setOptionSheetOpen(false);
    } catch (err) {
      toast.error(errorMessage(err, 'We could not save that pricing option.'));
    } finally {
      setOptionSaving(false);
    }
  };

  const removeOption = async (option: PackagePricingOption) => {
    try {
      await pricingOptionApi.remove(option.id);
      await queryClient.invalidateQueries({ queryKey: ['pricing-options', id] });
      toast.success('Pricing option removed');
    } catch (err) {
      toast.error(errorMessage(err, 'We could not remove that pricing option.'));
    }
  };

  if (!isNew && existing.isLoading) return <Loading label="Loading your listing…" />;
  if (!isNew && existing.isError) {
    return <ErrorState message="We could not load that listing." onRetry={() => void existing.refetch()} />;
  }

  return (
    <Screen
      scroll
      footer={
        <FooterBar>
          <Button
            label={isNew ? 'Create listing' : 'Save changes'}
            size="lg"
            fullWidth
            loading={saving}
            onPress={() => void save()}
          />
        </FooterBar>
      }
    >
      <Header title={isNew ? 'New listing' : 'Edit listing'} onBack={() => router.back()} />

      <View style={styles.body}>
        {/* ── type ────────────────────────────────────────────────────── */}
        {isNew ? (
          <View style={styles.block}>
            <Text variant="heading">What are you listing?</Text>
            <View style={styles.typeRow}>
              {TYPES.map((option) => {
                const selected = packageType === option.id;
                return (
                  <Pressable
                    key={option.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => setPackageType(option.id)}
                    style={[styles.typeTile, selected && styles.typeTileOn]}
                  >
                    <Ionicons
                      name={option.icon}
                      size={26}
                      color={selected ? colors.primary : colors.textSecondary}
                    />
                    <Text variant="bodyStrong">{option.label}</Text>
                    <Text variant="small" tone="muted" center>
                      {option.hint}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* ── photos ──────────────────────────────────────────────────── */}
        <View style={styles.block}>
          <Text variant="heading">Photos</Text>
          <Text variant="small" tone="secondary">
            The first photo is the one guests see in search. Lead with the view, not the car park.
          </Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add photos"
              onPress={() => void addImage()}
              style={styles.addPhoto}
            >
              <Ionicons name="add" size={26} color={colors.primary} />
              <Text variant="small" tone="primary">
                Add
              </Text>
            </Pressable>

            {images.map((uri, index) => (
              <View key={`${uri}-${index}`} style={styles.photo}>
                <Image source={{ uri }} style={styles.photoImage} contentFit="cover" transition={180} />
                {index === 0 ? (
                  <View style={styles.coverTag}>
                    <Text variant="caption" tone="inverse">
                      COVER
                    </Text>
                  </View>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove photo ${index + 1}`}
                  hitSlop={8}
                  onPress={() => setImages((current) => current.filter((_, i) => i !== index))}
                  style={styles.photoRemove}
                >
                  <Ionicons name="close" size={14} color={colors.text} />
                </Pressable>
              </View>
            ))}
          </ScrollView>

          {images.some((uri) => uri.startsWith('file:')) ? (
            <Notice
              tone="warning"
              icon="cloud-upload-outline"
              title="Photos are on this phone only"
              message="Image hosting is not wired up yet, so newly picked photos will not reach guests until it is. Paste a photo URL from your website for now, or add them from the web panel."
            />
          ) : null}
        </View>

        {/* ── the basics ──────────────────────────────────────────────── */}
        <View style={styles.block}>
          <Text variant="heading">The basics</Text>
          <Input
            label="Listing name"
            placeholder={slotBased ? '7-day Hunza & Khunjerab tour' : 'Cedar cottage with valley views'}
            value={name}
            onChangeText={setName}
            error={errors.name}
            autoCapitalize="sentences"
          />
          <TextArea
            label="Description"
            placeholder="What is it like, who is it for, and what makes it worth choosing?"
            value={description}
            onChangeText={setDescription}
            minHeight={140}
          />
          <Input
            label={slotBased ? 'Price per person' : 'Price per night'}
            icon="cash-outline"
            placeholder="0"
            value={price}
            onChangeText={setPrice}
            keyboardType="number-pad"
            error={errors.price}
            hint={price ? `Guests see ${pkr(Number(price))}` : undefined}
          />
        </View>

        {/* ── shape of it ─────────────────────────────────────────────── */}
        <Card style={styles.block}>
          <Text variant="heading" style={styles.cardTitle}>
            {slotBased ? 'The trip' : 'The property'}
          </Text>

          {slotBased ? (
            <>
              <Stepper label="Days" value={durationDays} onChange={setDurationDays} min={1} max={30} />
              <Divider />
              <Stepper label="Nights" value={durationNights} onChange={setDurationNights} min={0} max={30} />
              <Divider />
              <Stepper label="Minimum guests" value={minGuests} onChange={setMinGuests} min={1} max={50} />
              <Divider />
              <Stepper label="Maximum guests" value={maxGuests} onChange={setMaxGuests} min={1} max={50} />
            </>
          ) : (
            <>
              <Stepper label="Bedrooms" value={bedrooms} onChange={setBedrooms} min={0} max={20} />
              <Divider />
              <Stepper label="Bathrooms" value={bathrooms} onChange={setBathrooms} min={0} max={20} />
              <Divider />
              <Stepper label="Sleeps" sublabel="Maximum occupancy" value={maxOccupancy} onChange={setMaxOccupancy} min={1} max={40} />
            </>
          )}
        </Card>

        {/* ── pricing options ─────────────────────────────────────────── */}
        {!isNew ? (
          <View style={styles.block}>
            <View style={styles.sectionHead}>
              <View style={styles.flex}>
                <Text variant="heading">Pricing options</Text>
                <Text variant="small" tone="secondary">
                  Offer named variants on top of your base price — a Couple Discount, Solo Female
                  Traveler rate, Early Bird — guests pick one when they book.
                </Text>
              </View>
            </View>

            {pricingOptions.isLoading ? null : pricingOptions.data?.length ? (
              <View style={styles.optionsList}>
                {pricingOptions.data.map((option) => (
                  <Pressable
                    key={option.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${option.label}`}
                    onPress={() => openEditOption(option)}
                    style={({ pressed }) => [styles.optionRow, pressed && { opacity: 0.85 }]}
                  >
                    <View style={styles.flex}>
                      <Text variant="bodyStrong">{option.label}</Text>
                      <Text variant="small" tone="muted">
                        {option.pricingType === 'FIXED'
                          ? `Fixed at ${pkr(option.price ?? 0)}`
                          : `${option.pricingType === 'PERCENTAGE_INCREASE' ? '+' : '−'}${option.percentageChange ?? 0}% of base price`}
                      </Text>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${option.label}`}
                      hitSlop={8}
                      onPress={() => void removeOption(option)}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </Pressable>
                  </Pressable>
                ))}
              </View>
            ) : (
              <Text variant="small" tone="muted">
                No pricing options yet — your base price is all guests see.
              </Text>
            )}

            <Button
              label="Add pricing option"
              variant="outline"
              icon="pricetag-outline"
              onPress={openNewOption}
            />
          </View>
        ) : null}

        {/* ── logistics ───────────────────────────────────────────────── */}
        {slotBased ? (
          <View style={styles.block}>
            <Text variant="heading">Getting there</Text>
            <Input
              label="Meeting point"
              icon="flag-outline"
              placeholder="Where do guests meet you?"
              value={meetingPoint}
              onChangeText={setMeetingPoint}
            />
            <Input
              label="Starting city"
              icon="navigate-outline"
              placeholder="Islamabad, Gilgit…"
              value={startLocation}
              onChangeText={setStartLocation}
              autoCapitalize="words"
            />
            <Input
              label="Difficulty"
              icon="fitness-outline"
              placeholder="Easy, Moderate, Challenging"
              value={difficulty}
              onChangeText={setDifficulty}
            />
          </View>
        ) : null}

        {/* ── what's included ─────────────────────────────────────────── */}
        <View style={styles.block}>
          <Text variant="heading">What's included</Text>
          <ListEditor
            items={includes}
            onChange={setIncludes}
            placeholder="Transport, breakfast, guide…"
            tone="success"
          />

          <Text variant="heading" style={styles.subBlock}>
            Not included
          </Text>
          <ListEditor
            items={excludes}
            onChange={setExcludes}
            placeholder="Flights, personal expenses…"
            tone="danger"
          />
        </View>

        {/* ── policy ──────────────────────────────────────────────────── */}
        <View style={styles.block}>
          <Text variant="heading">Cancellation policy</Text>
          {CANCELLATION.map((option) => {
            const selected = cancellationPolicy === option;
            return (
              <Pressable
                key={option}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => setCancellationPolicy(option)}
                style={[styles.policy, selected && styles.policyOn]}
              >
                <Ionicons
                  name={selected ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={selected ? colors.primary : colors.borderStrong}
                />
                <Text variant="small" style={styles.flex}>
                  {option}
                </Text>
              </Pressable>
            );
          })}

          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: instantBook }}
            onPress={() => setInstantBook((value) => !value)}
            style={styles.toggleRow}
          >
            <View style={styles.flex}>
              <Text variant="bodyStrong">Instant booking</Text>
              <Text variant="small" tone="muted">
                Guests book without waiting for you to confirm. More bookings, less control.
              </Text>
            </View>
            <View style={[styles.toggle, instantBook && styles.toggleOn]}>
              <View style={[styles.knob, instantBook && styles.knobOn]} />
            </View>
          </Pressable>
        </View>

        {/* ── danger zone ─────────────────────────────────────────────── */}
        {!isNew ? (
          <View style={styles.block}>
            <Button
              label="Delete this listing"
              variant="danger"
              icon="trash-outline"
              onPress={() => setDeleteOpen(true)}
            />
          </View>
        ) : null}
      </View>

      <ConfirmSheet
        visible={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => void remove()}
        title="Delete this listing?"
        message="This cannot be undone, and it takes the listing's reviews with it. If you only want to stop taking bookings, hide it from the listings screen instead."
        confirmLabel="Delete"
        destructive
        loading={deleting}
      />

      <Sheet
        visible={optionSheetOpen}
        onClose={() => setOptionSheetOpen(false)}
        title={editingOption ? 'Edit pricing option' : 'Add a pricing option'}
        footer={
          <Button
            label={editingOption ? 'Save changes' : 'Add option'}
            size="lg"
            fullWidth
            loading={optionSaving}
            onPress={() => void saveOption()}
          />
        }
      >
        <Input
          label="Name"
          placeholder="Couple Discount, Solo Female Traveler…"
          value={optionLabel}
          onChangeText={setOptionLabel}
          error={optionErrors.label}
          autoCapitalize="words"
        />

        <View style={styles.pricingTypeRow}>
          {PRICING_TYPES.map((typeOption) => {
            const selected = optionType === typeOption.id;
            return (
              <Pressable
                key={typeOption.id}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => setOptionType(typeOption.id)}
                style={[styles.pricingTypeTile, selected && styles.pricingTypeTileOn]}
              >
                <Text variant="smallStrong" tone={selected ? 'primary' : 'default'} center>
                  {typeOption.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text variant="small" tone="muted">
          {PRICING_TYPES.find((t) => t.id === optionType)?.hint}
        </Text>

        <Input
          label={optionType === 'FIXED' ? 'Price' : 'Percentage'}
          icon={optionType === 'FIXED' ? 'cash-outline' : 'calculator-outline'}
          placeholder="0"
          value={optionValue}
          onChangeText={setOptionValue}
          keyboardType="number-pad"
          error={optionErrors.value}
          hint={
            optionValue && optionType !== 'FIXED'
              ? `${optionType === 'PERCENTAGE_INCREASE' ? 'Adds' : 'Takes off'} ${optionValue}% of the base price`
              : undefined
          }
        />

        <Input
          label="Note (optional)"
          placeholder="Who this is for, or any condition that applies"
          value={optionDescription}
          onChangeText={setOptionDescription}
        />

        {editingOption ? (
          <Button
            label="Remove this option"
            variant="danger"
            icon="trash-outline"
            onPress={() => {
              setOptionSheetOpen(false);
              void removeOption(editingOption);
            }}
          />
        ) : null}
      </Sheet>
    </Screen>
  );
}

/** An add-and-remove list of one-line strings. */
function ListEditor({
  items, onChange, placeholder, tone,
}: {
  items: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  tone: 'success' | 'danger';
}) {
  const [draft, setDraft] = useState('');
  const color = tone === 'success' ? colors.success : colors.danger;

  const add = () => {
    const value = draft.trim();
    if (!value) return;
    onChange([...items, value]);
    setDraft('');
  };

  return (
    <View style={styles.listEditor}>
      {items.map((item, index) => (
        <View key={`${item}-${index}`} style={styles.listItem}>
          <Ionicons
            name={tone === 'success' ? 'checkmark-circle' : 'close-circle'}
            size={17}
            color={color}
          />
          <Text variant="small" style={styles.flex}>
            {item}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Remove ${item}`}
            hitSlop={8}
            onPress={() => onChange(items.filter((_, i) => i !== index))}
          >
            <Ionicons name="close" size={16} color={colors.textMuted} />
          </Pressable>
        </View>
      ))}

      <View style={styles.listAdd}>
        <Input
          placeholder={placeholder}
          value={draft}
          onChangeText={setDraft}
          returnKeyType="done"
          onSubmitEditing={add}
          containerStyle={styles.flex}
        />
        <Button label="Add" variant="outline" size="sm" onPress={add} style={styles.addButton} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { paddingHorizontal: spacing.lg, gap: spacing['2xl'], paddingTop: spacing.sm, paddingBottom: spacing.xl },
  block: { gap: spacing.md },
  subBlock: { marginTop: spacing.lg },
  cardTitle: { marginBottom: spacing.xs },
  sectionHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },

  optionsList: { gap: spacing.sm },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },

  pricingTypeRow: { flexDirection: 'row', gap: spacing.sm },
  pricingTypeTile: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pricingTypeTileOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },

  typeRow: { flexDirection: 'row', gap: spacing.md },
  typeTile: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  typeTileOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },

  photoRow: { gap: spacing.md, paddingVertical: spacing.xs },
  addPhoto: {
    width: 104,
    height: 104,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    backgroundColor: colors.primarySoft,
  },
  photo: { width: 104, height: 104, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surfaceMuted },
  photoImage: { width: '100%', height: '100%' },
  photoRemove: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverTag: {
    position: 'absolute',
    left: 5,
    bottom: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
  },

  listEditor: { gap: spacing.sm },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  listAdd: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  addButton: { marginTop: 3 },

  policy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  policyOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  toggle: { width: 48, height: 28, borderRadius: 14, backgroundColor: colors.borderStrong, padding: 3 },
  toggleOn: { backgroundColor: colors.primary },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF' },
  knobOn: { marginLeft: 20 },
});
