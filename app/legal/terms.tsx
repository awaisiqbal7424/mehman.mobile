import React from 'react';
import { Linking } from 'react-native';
import { Bold, LegalLink, LegalPage, List, P, useLegalNav, type LegalSection } from '../../src/components/LegalPage';
import { CONTACT_EMAIL } from '../../src/constants';

const LAST_UPDATED = '20 August 2026';

export default function TermsScreen() {
  const legal = useLegalNav();

  const sections: LegalSection[] = [
    {
      heading: 'This agreement',
      body: (
        <P>
          These terms are between you and Mehman Technologies (Pvt) Ltd, Gilgit, Gilgit-Baltistan,
          Pakistan. By creating an account or making a booking you accept them. If you do not
          accept them, please do not use Mehman.
        </P>
      ),
    },
    {
      heading: 'What Mehman is — and is not',
      body: (
        <>
          <P>
            Mehman is a <Bold>marketplace</Bold>. Hosts — travel agencies, guides and property
            owners, whom we call Mezbans — list their tours and stays; you book them through us.
          </P>
          <P>
            The trip or stay itself is provided by the host, not by Mehman. We are responsible for
            the platform, the booking record, taking payment and applying the refund policy. The
            host is responsible for delivering what their listing describes, and for their own
            licences, insurance and safety standards.
          </P>
        </>
      ),
    },
    {
      heading: 'Your account',
      body: (
        <List
          items={[
            'You must be 18 or over and give accurate details.',
            'Keep your password to yourself — you are responsible for activity under your account.',
            'One person, one account. Accounts may not be sold or transferred.',
            <>
              Tell us immediately at{' '}
              <LegalLink label={CONTACT_EMAIL} onPress={() => void Linking.openURL(`mailto:${CONTACT_EMAIL}`)} /> if
              you think someone else has access.
            </>,
          ]}
        />
      ),
    },
    {
      heading: 'Bookings and payment',
      body: (
        <List
          items={[
            'A booking is confirmed when payment is completed, or when a host accepts a cash-on-arrival booking.',
            'Prices are in Pakistani Rupees and include the Mehman service fee shown at checkout.',
            "The host sets the price and what is included. Read the listing's inclusions and exclusions before you book.",
            'Anything you agree with a host outside Mehman — extra nights, extra services, side payments — is between you and them, and is not covered by our refund policy or support.',
          ]}
        />
      ),
    },
    {
      heading: 'Cancellations and refunds',
      body: (
        <P>
          Each listing carries one of four cancellation tiers, shown on the listing and again at
          checkout. The tiers, the guarantees that apply to every booking, and how to cancel are
          set out in full in our <LegalLink label="Cancellation & Refund Policy" onPress={legal.cancellation} />,
          which forms part of these terms.
        </P>
      ),
    },
    {
      heading: 'How to behave',
      body: (
        <>
          <P>While using Mehman you agree not to:</P>
          <List
            items={[
              'Post false, misleading or someone else’s content, including reviews you did not earn.',
              'Harass, threaten or discriminate against hosts, guests or our staff.',
              "Use the platform for anything unlawful, or damage a host's property.",
              'Scrape the site, attempt to break its security, or work around booking or payment flows.',
            ]}
          />
          <P>We may suspend or close accounts that break these rules, and cancel affected bookings.</P>
        </>
      ),
    },
    {
      heading: 'Additional terms for hosts',
      body: (
        <List
          items={[
            'Your listings must be accurate, and you must hold the licences and permissions your service requires under Pakistani law.',
            'You must honour confirmed bookings. Cancelling a confirmed booking without good reason may cost you your verified badge.',
            'Mehman deducts its commission from your payout at the agreed rate; you are responsible for your own taxes.',
            "Payouts are sent to the bank or wallet details on your account after the guest's trip begins, subject to any dispute.",
          ]}
        />
      ),
    },
    {
      heading: 'Reviews and content',
      body: (
        <P>
          You keep ownership of what you post, and grant Mehman a licence to display it on the
          platform and in related marketing. Reviews must describe a booking you actually took. We
          do not remove reviews for being negative, but we do remove content that is abusive,
          off-topic, or reveals someone's personal details.
        </P>
      ),
    },
    {
      heading: 'Liability',
      body: (
        <>
          <P>
            Travel in the mountains carries real risk. You are responsible for judging whether a
            trip suits your fitness and experience, for your own travel insurance, and for
            following your guide's safety instructions.
          </P>
          <P>
            Mehman is not liable for injury, loss or damage arising from a host's acts or
            omissions, or from road closures, weather or events outside our control. Where we are
            found liable, our liability is limited to the amount you paid for the booking in
            question. Nothing here limits liability that cannot be limited under Pakistani law.
          </P>
        </>
      ),
    },
    {
      heading: 'If we disagree',
      body: (
        <P>
          Contact <LegalLink label={CONTACT_EMAIL} onPress={() => void Linking.openURL(`mailto:${CONTACT_EMAIL}`)} />{' '}
          first — nearly everything is resolved that way. Failing that, these terms are governed
          by the laws of Pakistan, and the courts of Gilgit-Baltistan have jurisdiction.
        </P>
      ),
    },
    {
      heading: 'Changes and closing your account',
      body: (
        <P>
          You may close your account at any time; bookings already made remain subject to their
          cancellation policy. We may update these terms, and will email account holders about
          material changes. See also our <LegalLink label="Privacy Policy" onPress={legal.privacy} />.
        </P>
      ),
    },
  ];

  return (
    <LegalPage
      eyebrow="The rules"
      title="Terms of Service"
      intro="What you can expect from Mehman, what we expect from you, and who is responsible for what when you book a trip through us."
      lastUpdated={LAST_UPDATED}
      sections={sections}
    />
  );
}
