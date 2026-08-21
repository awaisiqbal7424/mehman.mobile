import { Redirect } from 'expo-router';
import React from 'react';
import { useAuth } from '../src/store/auth';

/**
 * The entry point decides which of the three worlds to open.
 *
 * Browsing does not require an account — a traveller can explore, search and
 * open a listing signed out, and is only asked to sign in at the point of
 * booking. So the signed-out destination is the guest tabs, not the sign-in
 * screen.
 */
export default function Index() {
  const role = useAuth((s) => s.role);
  const providerStatus = useAuth((s) => s.providerStatus);

  if (role === 'host' && providerStatus === 'approved') return <Redirect href="/(host)" />;
  return <Redirect href="/(guest)" />;
}
