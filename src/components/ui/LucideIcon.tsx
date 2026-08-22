import {
  Airplane, ArrowLeft, ArrowRight, ArrowUUpLeft, ArrowsDownUp, Barbell, Bell, Bookmark, Briefcase,
  Calendar, CalendarBlank, Car, ChartBar, Check, Checks, CheckCircle, ChatCircle, CircleIcon,
  CloudArrowUp, CloudSlash, Compass, CreditCard, Copy, DotsThree, Envelope, EnvelopeOpen,
  Eye, EyeSlash, Heart, House, Info, Image, Images, Lightbulb, List, MapPin,
  MapTrifold, Megaphone, MagnifyingGlass, Minus, PaperPlaneTilt, PencilSimple, Plus, RadioButton, Receipt,
  ArrowClockwise, FileText, LockKey, Scales, SealCheck, Share, Shield, Sliders, Sparkle, Stack, Star,
  Tag, Timer, Trash, User, UserCircle, Users, Wallet,
  WarningCircle, X, XCircle, IconProps,
} from 'phosphor-react-native';
import React from 'react';
import { Pressable } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const ICONS = {
  add: Plus,
  remove: Minus,
  'alert-circle': WarningCircle,
  'alert-circle-outline': WarningCircle,
  'create-outline': PencilSimple,
  'information-circle': Info,
  'information-circle-outline': Info,
  'document-text-outline': FileText,
  'arrow-forward': ArrowRight,
  'arrow-forward-circle': ArrowRight,
  'arrow-undo': ArrowUUpLeft,
  'arrow-undo-outline': ArrowUUpLeft,
  calendar: Calendar,
  'calendar-outline': Calendar,
  'calendar-clear': CalendarBlank,
  'calendar-clear-outline': CalendarBlank,
  checkmark: Check,
  'checkmark-circle': CheckCircle,
  'checkmark-circle-outline': CheckCircle,
  'chevron-back': ArrowLeft,
  'chevron-down': ArrowLeft,
  'chevron-forward': ArrowRight,
  chatbubble: ChatCircle,
  'chatbubble-ellipses': ChatCircle,
  'chatbubble-ellipses-outline': ChatCircle,
  'chatbubble-outline': ChatCircle,
  'chatbubbles-outline': ChatCircle,
  'chatbox-outline': ChatCircle,
  'chatbox-ellipses-outline': ChatCircle,
  close: X,
  'close-circle': XCircle,
  'close-circle-outline': XCircle,
  'cloud-offline-outline': CloudSlash,
  compass: Compass,
  'compass-outline': Compass,
  'copy-outline': Copy,
  'ellipsis-horizontal-circle': DotsThree,
  'ellipsis-horizontal-circle-outline': DotsThree,
  'ellipsis-vertical': DotsThree,
  'eye-off-outline': EyeSlash,
  'eye-outline': Eye,
  flash: Lightbulb,
  'heart-outline': Heart,
  heart: Heart,
  home: House,
  'home-outline': House,
  'library-outline': List,
  'lock-closed-outline': LockKey,
  'location-outline': MapPin,
  'navigate-outline': MapPin,
  menu: List,
  'moon-outline': Sparkle,
  'notifications-outline': Bell,
  'people-outline': Users,
  'briefcase-outline': Briefcase,
  person: User,
  'person-outline': User,
  'person-circle-outline': UserCircle,
  send: PaperPlaneTilt,
  'paper-plane-outline': PaperPlaneTilt,
  'shield-checkmark-outline': SealCheck,
  'shield-outline': Shield,
  'share-outline': Share,
  'share-social-outline': Share,
  search: MagnifyingGlass,
  'search-outline': MagnifyingGlass,
  'swap-vertical': ArrowsDownUp,
  'options-outline': Sliders,
  star: Star,
  'star-outline': Star,
  'time-outline': Timer,
  'trash-outline': Trash,
  'trail-sign-outline': MapTrifold,
  'sparkles-outline': Sparkle,
  'flag-outline': MapPin,
  'images-outline': Images,
  'camera-outline': Image,
  'receipt-outline': Receipt,
  'refresh-outline': ArrowClockwise,
  'cash-outline': Scales,
  'pricetag-outline': Tag,
  'pricetags-outline': Tag,
  'call-outline': ChatCircle,
  'mail-outline': Megaphone,
  'mail-open-outline': EnvelopeOpen,
  'mail-unread-outline': Envelope,
  'logo-whatsapp': ChatCircle,
  'swap-horizontal': ArrowRight,
  business: Briefcase,
  'business-outline': Briefcase,
  'bed-outline': House,
  'hourglass-outline': Timer,
  'ribbon-outline': SealCheck,
  'wallet-outline': Wallet,
  'airplane-outline': Airplane,
  'albums-outline': Stack,
  'map-outline': MapTrifold,
  'car-outline': Car,
  'checkmark-done-outline': Checks,
  'bar-chart-outline': ChartBar,
  'cloud-upload-outline': CloudArrowUp,
  'fitness-outline': Barbell,
  'card-outline': CreditCard,
  'bookmark-outline': Bookmark,
  'radio-button-on': RadioButton,
  'radio-button-off': CircleIcon,
} as const;

export type IconName = keyof typeof ICONS;

export function Ionicons({
  name, size = 24, color, style, onPress, accessibilityRole, accessibilityLabel,
}: IconProps & {
  name: string;
  accessibilityRole?: string;
  accessibilityLabel?: string;
  onPress?: () => void;
}) {
  const Icon = ICONS[name as IconName] ?? WarningCircle;
  const icon = <Icon size={size} color={color} style={style} weight="regular" />;
  return onPress ? (
    <Pressable accessibilityRole={accessibilityRole as 'button'} accessibilityLabel={accessibilityLabel} onPress={onPress}>
      {icon}
    </Pressable>
  ) : icon;
}

export namespace Ionicons {
  export const glyphMap: Record<string, true> = ICONS as unknown as Record<string, true>;
}

export function TipiIcon({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 256 256" fill="none">
      <Path
        d="M238.74 211.69 137.5 53.5l21.24-33.19a8 8 0 0 0-13.48-8.62L128 38.66l-17.26-26.97a8 8 0 1 0-13.48 8.62L118.5 53.5 17.26 211.69A8 8 0 0 0 24 224h208a8 8 0 0 0 6.74-12.31ZM86.3 208l41.7-65.16L169.7 208Zm102.4 0-54-84.31a8 8 0 0 0-13.48 0L67.3 208H38.62L128 68.34 217.38 208Z"
        fill={color}
      />
    </Svg>
  );
}
