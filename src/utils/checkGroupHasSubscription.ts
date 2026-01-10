/**
 * Utility function to quickly check if a group has a subscription enabled
 *
 * This function checks if a subscription exists for a given groupId by:
 * 1. Fetching the group information and owner
 * 2. Getting the owner's primary name
 * 3. Building the subscription index identifier base
 * 4. Using searchsimple to check if any version of the index exists on the blockchain
 * 5. If validated, fetches the subscription details to get the title
 *
 * Performance: Uses the on-chain index (DOCUMENT resource) for validation first,
 * then fetches details only if subscription exists.
 *
 * @param groupId - The group ID to check
 * @param identifierOperations - The identifier operations from qapp-core
 * @returns Promise with exists flag, and if exists: groupId and title
 *
 * @example
 * ```typescript
 * import { checkGroupHasSubscription } from './lib/checkGroupHasSubscription';
 * import { useGlobal } from 'qapp-core';
 *
 * const { identifierOperations } = useGlobal();
 * const result = await checkGroupHasSubscription(12345, identifierOperations);
 *
 * if (result.exists) {
 *   console.log(`Group ${result.groupId}: ${result.title}`);
 * } else {
 *   console.log('No subscription found');
 * }
 * ```
 */

import { EnumCollisionStrength } from './encryption';

export const subscriptionAppPublicSalt =
  'gnRp+Pao85XZlExcqynLS0+GaKCL3ia9E1sEm9XPaOA=';

/**
 * Get the primary name for an address
 */
async function getPrimaryName(address: string): Promise<string | null> {
  try {
    const response = await fetch(`/names/primary/${address}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data?.name || null;
  } catch (error) {
    console.error(
      '[checkGroupHasSubscription] Failed to fetch primary name:',
      error
    );
    return null;
  }
}

/**
 * Build the subscription details identifier for a group
 */
async function buildDetailsIdentifier(
  groupId: number,
  identifierOperations: any
): Promise<string> {
  const subscriptionId = `test-subscription-${groupId.toString()}`;

  const typeHash = await identifierOperations.hashString(
    'test-subscription_details',
    EnumCollisionStrength.HIGH,
    subscriptionAppPublicSalt
  );
  const idHash = await identifierOperations.hashString(
    subscriptionId,
    EnumCollisionStrength.HIGH,
    subscriptionAppPublicSalt
  );

  if (!typeHash || !idHash) {
    throw new Error('Failed to create subscription identifier');
  }

  return typeHash + idHash;
}

/**
 * Build the subscription index identifier base for a group (without version suffix)
 * We'll use this as a prefix to search for any version
 */
async function buildIndexIdentifierBase(
  groupId: number,
  identifierOperations: any
): Promise<string> {
  const subscriptionId = `test-subscription-${groupId.toString()}`;

  const typeHash = await identifierOperations.hashString(
    'test-subscription_index',
    EnumCollisionStrength.HIGH,
    subscriptionAppPublicSalt
  );
  const idHash = await identifierOperations.hashString(
    subscriptionId,
    EnumCollisionStrength.HIGH,
    subscriptionAppPublicSalt
  );

  if (!typeHash || !idHash) {
    throw new Error('Failed to create subscription identifier');
  }

  // Return base without version - we'll search for any version
  return typeHash + idHash;
}

/**
 * Check if a group has a subscription enabled and return details
 */
export async function checkGroupHasSubscription(
  groupId: number,
  identifierOperations: any
): Promise<
  { exists: false } | { exists: true; groupId: number; title: string }
> {
  if (!groupId || !identifierOperations) {
    return { exists: false };
  }

  try {
    // Step 1: Get group information
    const groupResponse = await fetch(`/groups/${groupId}`);
    if (!groupResponse.ok) {
      console.error(
        '[checkGroupHasSubscription] Failed to fetch group:',
        groupResponse.statusText
      );
      return { exists: false };
    }

    const groupData = await groupResponse.json();
    const groupOwner = groupData?.owner || groupData?.ownerAddress;

    if (!groupOwner) {
      console.error('[checkGroupHasSubscription] Group has no owner');
      return { exists: false };
    }

    // Step 2: Get owner's primary name
    const ownerName = await getPrimaryName(groupOwner);
    if (!ownerName) {
      // No primary name = no subscription can be enabled
      return { exists: false };
    }

    // Step 3: Build subscription index identifier base (without version)
    const subscriptionIdentifierBase = await buildIndexIdentifierBase(
      groupId,
      identifierOperations
    );

    // Step 4: Search for any index resource with this identifier prefix
    // Using searchsimple to check if any version exists
    const searchResponse = await fetch(
      `/arbitrary/resources/searchsimple?mode=ALL&service=DOCUMENT&identifier=${subscriptionIdentifierBase}&name=${ownerName}&limit=1&prefix=true&exactmatchnames=true`
    );

    if (!searchResponse.ok) {
      return { exists: false };
    }

    const searchResults = await searchResponse.json();
    if (!Array.isArray(searchResults) || searchResults.length === 0) {
      return { exists: false };
    }

    // Step 5: On-chain validation passed, now fetch the details
    const detailsIdentifier = await buildDetailsIdentifier(
      groupId,
      identifierOperations
    );

    const detailsResponse = await fetch(
      `/arbitrary/DOCUMENT/${ownerName}/${detailsIdentifier}`
    );

    if (!detailsResponse.ok) {
      console.error(
        '[checkGroupHasSubscription] Failed to fetch details after validation'
      );
      return { exists: false };
    }

    const details = await detailsResponse.json();
    const title =
      typeof details?.title === 'string'
        ? details.title
        : 'Untitled Subscription';

    return {
      exists: true,
      groupId,
      title,
    };
  } catch (error) {
    console.error('[checkGroupHasSubscription] Error:', error);
    return { exists: false };
  }
}
