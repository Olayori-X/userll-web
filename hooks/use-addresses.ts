"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/components/providers/session-provider";
import { createAddress, deleteAddress, getAddresses, updateAddress } from "@/lib/api/checkout";
import type { NewAddress } from "@/lib/types/checkout";

const ADDRESSES_KEY = ["addresses"] as const;

/**
 * The buyer's saved addresses, default first. Like the cart, it asks the API only for someone who can
 * have them (logged in, email verified), and logging out wipes it.
 */
export function useAddresses() {
  const { user } = useSession();

  return useQuery({
    queryKey: ADDRESSES_KEY,
    queryFn: getAddresses,
    enabled: Boolean(user?.email_verified),
    staleTime: 60_000,
  });
}

/**
 * After any change the list is fetched again, not patched by hand: saving one address can change the default
 * flag on the others, and the API is the one that knows. The returned promise makes the change wait for that
 * fresh list, so whoever called it sees the up-to-date addresses straight away.
 *
 * Changes are never repeated automatically (the app's default for all writes).
 */
function useAddressMutation<TVariables, TResult>(change: (variables: TVariables) => Promise<TResult>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: change,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADDRESSES_KEY }),
  });
}

export const useCreateAddress = () => useAddressMutation((input: NewAddress) => createAddress(input));

export const useUpdateAddress = () =>
  useAddressMutation(({ id, input }: { id: number; input: Partial<NewAddress> }) => updateAddress(id, input));

export const useDeleteAddress = () => useAddressMutation((id: number) => deleteAddress(id));