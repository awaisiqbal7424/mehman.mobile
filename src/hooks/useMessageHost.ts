import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { messageApi } from '../api/services';
import { useAuth } from '../store/auth';
import type { Conversation } from '../types';
import { useToast } from '../components/ui';

/**
 * Opens (or reuses) the one conversation a guest has with a provider, then
 * navigates to it.
 *
 * `/api/messages/contact/{providerId}` is meant to find-or-create on its own,
 * but a guest should never end up with two threads for the same host just
 * because that lookup missed once. Checking the conversations list already
 * cached for the Chats tab first means this client cannot itself produce a
 * duplicate, network hiccup or not — it only falls through to the network
 * call when nothing local matches.
 */
export function useMessageHost(signInRedirect: string) {
  const router = useRouter();
  const toast = useToast();
  const user = useAuth((s) => s.user);
  const queryClient = useQueryClient();

  return useCallback(
    async (hostId?: string, providerId?: string) => {
      if (!user) {
        router.push(`/sign-in?redirect=${signInRedirect}`);
        return;
      }
      if (!hostId || !providerId) {
        toast.error('This host cannot be messaged just yet.');
        return;
      }

      const known = queryClient.getQueryData<Conversation[]>(['conversations', user.id]);
      const existing = known?.find((c) => c.providerId === providerId);
      if (existing) {
        router.push(`/chat/${existing.id}`);
        return;
      }

      try {
        const conversation = await messageApi.openWithProvider(user.id, hostId, providerId);
        router.push(`/chat/${conversation.id}`);
      } catch {
        toast.error('We could not open that conversation.');
      }
    },
    [queryClient, router, signInRedirect, toast, user],
  );
}
