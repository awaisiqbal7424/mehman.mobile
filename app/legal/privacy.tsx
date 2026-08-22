import React from 'react';
import { Linking } from 'react-native';
import { Bold, LegalLink, LegalPage, List, P, useLegalNav, type LegalSection } from '../../src/components/LegalPage';

const LAST_UPDATED = '20 August 2026';
const PRIVACY_EMAIL = 'privacy@mehman.co';

export default function PrivacyScreen() {
  const legal = useLegalNav();

  const sections: LegalSection[] = [
    {
      heading: 'Who we are',
      body: (
        <P>
          Mehman is a marketplace operated by Mehman Technologies (Pvt) Ltd, registered in Gilgit,
          Gilgit-Baltistan, Pakistan. We connect travellers with verified hosts and travel
          agencies — we are the platform for the booking, and the host provides the trip or stay
          itself. On this page, "we" means Mehman and "you" means anyone using the app.
        </P>
      ),
    },
    {
      heading: 'What we collect',
      body: (
        <>
          <P>Only what the service needs to work:</P>
          <List
            items={[
              <>
                <Bold>Account details</Bold> — your name, email address, mobile number, password
                (stored hashed, never in readable form) and any profile picture you upload.
              </>,
              <>
                <Bold>Booking details</Bold> — the trips and stays you book, your travel dates,
                guest numbers and any special requests you send to a host.
              </>,
              <>
                <Bold>Identity documents</Bold> — if you apply for the verified badge, your CNIC
                number and the photos of your CNIC you submit.
              </>,
              <>
                <Bold>Payout details</Bold> — if you add them, your bank or mobile wallet details
                so refunds and host earnings can reach you.
              </>,
              <>
                <Bold>Messages</Bold> — conversations between you and a host through Mehman.
              </>,
              <>
                <Bold>Technical data</Bold> — IP address, device and app version, and the screens
                you visit, used to keep accounts secure and to fix faults.
              </>,
            ]}
          />
          <P>
            <Bold>We never see or store your full card number.</Bold> Card payments are handled by
            our payment provider; we keep only the last four digits so you can recognise the
            payment on a receipt.
          </P>
        </>
      ),
    },
    {
      heading: 'How we use it',
      body: (
        <List
          items={[
            'To create your account, take bookings and process payments and refunds.',
            'To pass a host the details they need to host you — your name, contact number, dates and requests.',
            'To verify identity and keep fraudulent listings and accounts off the platform.',
            'To send you booking confirmations, cancellation notices and receipts — these are service messages you cannot opt out of while you hold a booking.',
            'To send you travel offers, only if you asked for them. Every marketing message has an unsubscribe option.',
            'To investigate disputes between guests and hosts.',
          ]}
        />
      ),
    },
    {
      heading: 'Who we share it with',
      body: (
        <>
          <P>
            <Bold>We do not sell your personal data.</Bold> We share it only in these cases:
          </P>
          <List
            items={[
              <>
                <Bold>With your host</Bold> — the details needed to deliver your booking. Hosts do
                not receive your CNIC images or payout details.
              </>,
              <>
                <Bold>With service providers</Bold> — payment processors, message delivery and
                hosting providers, who may only use the data to perform that service for us.
              </>,
              <>
                <Bold>Where the law requires it</Bold> — a valid order from a Pakistani court or
                regulator, or where necessary to protect someone's safety.
              </>,
            ]}
          />
        </>
      ),
    },
    {
      heading: 'How we protect it',
      body: (
        <P>
          Traffic to and from Mehman is encrypted in transit. Passwords are hashed. Identity
          documents and payout details are restricted to the small number of staff who need them
          to review an application or resolve a payment. No system is perfectly secure, and if a
          breach ever affects your data we will tell you and the relevant authority without undue
          delay.
        </P>
      ),
    },
    {
      heading: 'How long we keep it',
      body: (
        <List
          items={[
            <>
              <Bold>Account data</Bold> — while your account is open, then up to 12 months after
              you close it.
            </>,
            <>
              <Bold>Booking and payment records</Bold> — up to 7 years, because tax and accounting
              law requires it.
            </>,
            <>
              <Bold>CNIC images</Bold> — deleted once a verification decision is made; only the
              outcome and the CNIC number are kept.
            </>,
            <>
              <Bold>Messages</Bold> — while the related booking is active, plus 2 years for dispute
              resolution.
            </>,
          ]}
        />
      ),
    },
    {
      heading: 'Your rights',
      body: (
        <>
          <P>You can ask us at any time to:</P>
          <List
            items={[
              'Show you the personal data we hold about you.',
              'Correct anything that is wrong — most of it you can edit yourself in your profile.',
              'Delete your account and the data we are not legally required to keep.',
              'Stop sending you marketing.',
            ]}
          />
          <P>
            Email <LegalLink label={PRIVACY_EMAIL} onPress={() => void Linking.openURL(`mailto:${PRIVACY_EMAIL}`)} />{' '}
            and we will respond within 30 days.
          </P>
        </>
      ),
    },
    {
      heading: 'Local storage',
      body: (
        <P>
          We keep a sign-in token on your device so you stay logged in between visits. We do not
          use advertising or cross-app tracking. Signing out, or clearing the app's storage, ends
          that session.
        </P>
      ),
    },
    {
      heading: "Children's data",
      body: (
        <P>
          Mehman is not intended for anyone under 18. You may book on behalf of children
          travelling with you, but the account must belong to an adult. If we learn we hold an
          account belonging to a child, we will close it and delete the data.
        </P>
      ),
    },
    {
      heading: 'Changes to this policy',
      body: (
        <P>
          If we make a material change we will email account holders and update the date at the
          top of this page. Continuing to use Mehman after a change means you accept the updated
          policy. See also our <LegalLink label="Terms of Service" onPress={legal.terms} />.
        </P>
      ),
    },
  ];

  return (
    <LegalPage
      eyebrow="Your data"
      title="Privacy Policy"
      intro="What we collect, why we collect it, and what you can ask us to do with it. Written to be read — if anything here is unclear, tell us and we will rewrite it."
      lastUpdated={LAST_UPDATED}
      sections={sections}
    />
  );
}
