import { Image } from 'expo-image';
import React from 'react';

/**
 * The brand's square M mark.
 *
 * Not the wordmark: that is ~4.4:1 and turns to mush at icon size, so anywhere the brand
 * has to fit in a small square — TravelBuddy's face, the Discover header — uses this
 * instead. It is drawn bare, with no disc behind it.
 *
 * Hidden from screen readers by default: every place it appears sits next to a control
 * that already carries a real label, and announcing "Mehman" twice helps nobody. Pass
 * `label` on the rare occasion it is the only thing identifying something.
 */
export function MehmanMark({
  size,
  tone = 'orange',
  label,
}: {
  size: number;
  /** `white` for use on the brand orange; `orange` on cream, white or a photo. */
  tone?: 'white' | 'orange';
  label?: string;
}) {
  return (
    <Image
      source={
        tone === 'white'
          ? require('../../../assets/brand/mehman-mark-white-transparent.png')
          : require('../../../assets/brand/mehman-mark-orange-transparent.png')
      }
      style={{ width: size, height: size }}
      contentFit="contain"
      accessible={Boolean(label)}
      accessibilityRole={label ? 'image' : undefined}
      accessibilityLabel={label}
      accessibilityElementsHidden={!label}
      importantForAccessibility={label ? 'yes' : 'no'}
    />
  );
}

export default MehmanMark;
