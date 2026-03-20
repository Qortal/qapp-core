/**
 * Utility function to check an address's subscription status for a private group
 * This is a standalone function that can be used in any app without React dependencies
 */

import { subscriptionAppPublicSalt } from '../hooks/useSubscriptionCheck';
import { EnumCollisionStrength } from './encryption';

export type SubscriptionStatus =
  | 'not-subscribed'
  | 'subscribed-paid'
  | 'subscribed-unpaid'
  | 'owner'
  | 'no-subscription';

export interface CheckSubscriptionStatusParams {
  /**
   * The address to check subscription status for
   */
  address: string;

  /**
   * The name to check subscription status for
   */
  name: string;
  /**
   * The group ID to check membership in
   */
  groupId: number;

  /**
   * Identifier operations from qapp-core (required for hashing)
   * Get this from useGlobal() hook: const { identifierOperations } = useGlobal();
   */
  identifierOperations: any;

  lists: any;
}

/** Subscription pricing state (historical) */
interface SubscriptionState {
  version: number;
  price: number;
  interval: 'MONTH';
  effectiveFrom: number;
}

/**
 * Get the primary name registered to an address
 */
async function getPrimaryName(address: string): Promise<string | null> {
  try {
    const response = await fetch(`/names/primary/${address}`);
    if (!response.ok) {
      return null;
    }
    const nameData = await response.json();
    const name = nameData?.name || null;
    return name;
  } catch (error) {
    console.error('[getPrimaryName] Failed to fetch primary name:', error);
    return null;
  }
}

/**
 * Build the subscription identifier for a given group
 * This follows the same logic as buildSubscriptionIdentifiers in subscriptionPublishing.ts
 */
async function buildDetailsIdentifier(
  groupId: number,
  identifierOperations: any
): Promise<string> {
  const subscriptionId = `subscription-${groupId.toString()}`;

  // Hash the type and ID using identifierOperations (same as in subscriptionPublishing.ts)
  const typeHash = await identifierOperations.hashString(
    'subscription_details',
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

  const identifier = typeHash + idHash;

  return identifier;
}

export interface CheckSubscriptionStatusResult {
  /**
   * The subscription status
   */
  status: SubscriptionStatus;

  /**
   * Whether the address is subscribed (member of the group)
   */
  isSubscribed: boolean;

  /**
   * Whether the subscription needs payment
   */
  needsPayment: boolean;

  /**
   * Whether the address is the group owner
   */
  isOwner: boolean;

  /**
   * Whether the address is a member of the group
   */
  isMember: boolean;

  /**
   * Whether a payment record exists on the blockchain
   */
  hasPaymentRecord: boolean;

  /**
   * The payment transaction signature from the PRODUCT record (if found)
   */
  paymentTxSignature?: string;

  /**
   * Whether the payment transaction was validated on-chain
   */
  isPaymentTxValid?: boolean;

  /**
   * Error message if payment validation failed
   */
  paymentValidationError?: string;

  /**
   * Whether the group owner has enabled a subscription for this group
   */
  hasSubscriptionEnabled: boolean;

  /**
   * Error message if subscription is not enabled
   */
  subscriptionDisabledReason?: string;
}

const AMOUNT_TOLERANCE = 0.00001;

function amountMatches(a: number, b: number): boolean {
  return Math.abs(a - b) <= AMOUNT_TOLERANCE;
}

export function getPaidIntervalsFromAmount(
  paidAmount: number,
  unitPrice: number
): number {
  if (
    !Number.isFinite(paidAmount) ||
    !Number.isFinite(unitPrice) ||
    unitPrice <= 0
  ) {
    return 0;
  }
  const raw = paidAmount / unitPrice;
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return Math.floor(raw + AMOUNT_TOLERANCE);
}

export function isMultipleOfUnitPrice(
  paidAmount: number,
  unitPrice: number
): boolean {
  const intervals = getPaidIntervalsFromAmount(paidAmount, unitPrice);
  if (intervals < 1) return false;
  return amountMatches(paidAmount, unitPrice * intervals);
}

/**
 * Check an address's subscription status for a private group
 *
 * This function automatically:
 * - Fetches the primary name registered to the address
 * - Checks if the address is the group owner
 * - Checks if the address is a member of the group (join request approved)
 * - Checks if a payment record exists on the blockchain
 *
 * Subscription flow context:
 * 1. User sends payment to group owner
 * 2. User requests to join group
 * 3. Group owner approves join request (user becomes member)
 * 4. User publishes subscription record (PRODUCT resource with payment signature)
 *
 * @param params - Parameters for checking subscription status
 * @returns Promise with subscription status details
 *
 * @example
 * ```typescript
 * const { identifierOperations } = useGlobal();
 * const result = await checkSubscriptionStatus({
 *   address: 'QUserAddress123',
 *   groupId: 12345,
 *   identifierOperations
 * });
 *
 * // result.status: 'subscribed-paid' | 'subscribed-unpaid' | 'not-subscribed' | 'owner'
 * // result.isSubscribed, result.needsPayment
 * ```
 */
export async function checkSubscriptionStatus(
  params: CheckSubscriptionStatusParams
): Promise<CheckSubscriptionStatusResult> {
  const { address, name, groupId, identifierOperations, lists } = params;

  const defaultResult: CheckSubscriptionStatusResult = {
    status: 'no-subscription',
    isSubscribed: false,
    needsPayment: false,
    isOwner: false,
    isMember: false,
    hasPaymentRecord: false,
    hasSubscriptionEnabled: false,
  };

  if (!address || !groupId || !identifierOperations) {
    return defaultResult;
  }

  try {
    // Step 1: Check if the address is the group owner
    const groupResponse = await fetch(`/groups/${groupId}`);
    if (!groupResponse.ok) {
      console.error(
        '[checkSubscriptionStatus] Failed to fetch group info:',
        groupResponse.statusText
      );
      throw new Error(
        `Failed to fetch group info: ${groupResponse.statusText}`
      );
    }

    const groupData = await groupResponse.json();
    const groupOwner = groupData?.owner;

    if (groupOwner === address) {
      return {
        status: 'owner',
        isSubscribed: false,
        needsPayment: false,
        isOwner: true,
        isMember: false, // Owner is not considered a "member" for subscription purposes
        hasPaymentRecord: false,
        hasSubscriptionEnabled: true, // Owner always has access
      };
    }

    // Step 1.5: Check if the owner has enabled a subscription for this group
    // Get the owner's primary name
    const ownerName = groupData?.ownerPrimaryName;
    if (!ownerName) {
      return {
        status: 'no-subscription',
        isSubscribed: false,
        needsPayment: false,
        isOwner: false,
        isMember: false,
        hasPaymentRecord: false,
        hasSubscriptionEnabled: false,
        subscriptionDisabledReason: 'Group owner has no registered name',
      };
    }

    // Build the details identifier to check if subscription exists
    const subscriptionIdentifier = await buildDetailsIdentifier(
      groupId,
      identifierOperations
    );

    // Check if subscription details exist (DOCUMENT service)
    const subscriptionDetailsResponse = await fetch(
      `/arbitrary/DOCUMENT/${encodeURIComponent(ownerName)}/${encodeURIComponent(subscriptionIdentifier)}`
    );

    if (!subscriptionDetailsResponse.ok) {
      return {
        status: 'no-subscription',
        isSubscribed: false,
        needsPayment: false,
        isOwner: false,
        isMember: false,
        hasPaymentRecord: false,
        hasSubscriptionEnabled: false,
        subscriptionDisabledReason: 'No subscription configured for this group',
      };
    }

    const subscriptionDetails = await subscriptionDetailsResponse.json();

    // Check if subscription is disabled
    if (subscriptionDetails?.status === 'disabled') {
      return {
        status: 'no-subscription',
        isSubscribed: false,
        needsPayment: false,
        isOwner: false,
        isMember: false,
        hasPaymentRecord: false,
        hasSubscriptionEnabled: false,
        subscriptionDisabledReason:
          subscriptionDetails?.disabledReason || 'Subscription is disabled',
      };
    }

    // Step 2: Check if the address is a member of the group
    const memberResponse = await fetch(`/groups/member/${address}`);
    if (!memberResponse.ok) {
      console.error(
        '[checkSubscriptionStatus] Failed to fetch member groups:',
        memberResponse.statusText
      );
      // If the endpoint fails, assume not a member
      return defaultResult;
    }

    const groups = await memberResponse.json();

    const isMember =
      Array.isArray(groups) &&
      groups.some((group: any) => group.groupId === groupId);

    if (!isMember) {
      return {
        ...defaultResult,
        status: 'not-subscribed',
        hasSubscriptionEnabled: true, // Subscription exists, user just isn't a member
      };
    }

    // Step 3: Get the primary name for this address

    if (!name) {
      // If no name is registered, can't check for payment records
      return {
        status: 'subscribed-unpaid',
        isSubscribed: true,
        needsPayment: true,
        isOwner: false,
        isMember: true,
        hasPaymentRecord: false,
        hasSubscriptionEnabled: true,
      };
    }

    // Step 4: Build the details identifier for this subscription (reuse from earlier)
    // Step 5: Check if there's a payment record for THIS specific subscription
    // Search for PRODUCT resource with the specific subscriptionIdentifier
    const searchUrl =
      `/arbitrary/resources/search?` +
      `service=PRODUCT&` +
      `identifier=${encodeURIComponent(subscriptionIdentifier)}&` +
      `name=${encodeURIComponent(name)}&` +
      `exactmatchnames=true&` +
      `reverse=true&` +
      `prefix=true&` +
      `limit=1`;

    const resourcesResponse = await fetch(searchUrl);

    if (!resourcesResponse.ok) {
      console.error(
        '[checkSubscriptionStatus] Failed to fetch payment records:',
        resourcesResponse.statusText
      );
      // If resource check fails, assume unpaid but still subscribed (member)
      return {
        status: 'subscribed-unpaid',
        isSubscribed: true,
        needsPayment: true,
        isOwner: false,
        isMember: true,
        hasPaymentRecord: false,
        hasSubscriptionEnabled: true,
      };
    }

    const resources = await resourcesResponse.json();

    const hasPaymentRecord = Array.isArray(resources) && resources.length > 0;

    if (!hasPaymentRecord) {
      return {
        status: 'subscribed-unpaid',
        isSubscribed: true,
        needsPayment: true,
        isOwner: false,
        isMember: true,
        hasPaymentRecord: false,
        hasSubscriptionEnabled: true,
        paymentValidationError: 'No PRODUCT record found',
      };
    }

    // Step 6: Fetch and validate the payment transaction
    let recordData: any = null;
    try {
      const dataResponse = await fetch(
        `/arbitrary/PRODUCT/${encodeURIComponent(name)}/${encodeURIComponent(subscriptionIdentifier)}`
      );
      if (dataResponse.ok) {
        recordData = await dataResponse.json();
      } else {
        console.warn(
          '[checkSubscriptionStatus] Failed to fetch PRODUCT record data:',
          dataResponse.statusText
        );
      }
    } catch (e) {
      console.error(
        '[checkSubscriptionStatus] Failed to fetch PRODUCT record data:',
        e
      );
    }

    const paymentTxSignature =
      recordData && typeof recordData.tx === 'string'
        ? recordData.tx
        : undefined;

    if (!paymentTxSignature) {
      return {
        status: 'subscribed-unpaid',
        isSubscribed: true,
        needsPayment: true,
        isOwner: false,
        isMember: true,
        hasPaymentRecord: true,
        paymentTxSignature: undefined,
        isPaymentTxValid: false,
        hasSubscriptionEnabled: true,
        paymentValidationError: 'PRODUCT record missing tx signature',
      };
    }

    // Step 7: Validate the transaction on-chain
    try {
      const txResponse = await fetch(
        `/transactions/signature/${paymentTxSignature}`
      );
      if (!txResponse.ok) {
        console.error(
          '[checkSubscriptionStatus] Transaction not found on-chain'
        );
        return {
          status: 'subscribed-unpaid',
          isSubscribed: true,
          needsPayment: true,
          isOwner: false,
          isMember: true,
          hasPaymentRecord: true,
          paymentTxSignature,
          isPaymentTxValid: false,
          hasSubscriptionEnabled: true,
          paymentValidationError: 'Transaction not found on blockchain',
        };
      }

      const txData = await txResponse.json();

      // Validate it's a PAYMENT transaction
      const typeOk = txData?.type === 'PAYMENT' || txData?.type === 2;
      if (!typeOk) {
        console.error(
          '[checkSubscriptionStatus] Invalid tx type:',
          txData?.type
        );
        return {
          status: 'subscribed-unpaid',
          isSubscribed: true,
          needsPayment: true,
          isOwner: false,
          isMember: true,
          hasPaymentRecord: true,
          paymentTxSignature,
          isPaymentTxValid: false,
          hasSubscriptionEnabled: true,
          paymentValidationError: `Invalid transaction type: ${txData?.type}`,
        };
      }

      // Validate recipient is the group owner
      if (groupOwner && txData?.recipient !== groupOwner) {
        console.error(
          '[checkSubscriptionStatus] Payment sent to wrong recipient:',
          txData?.recipient,
          'Expected:',
          groupOwner
        );
        return {
          status: 'subscribed-unpaid',
          isSubscribed: true,
          needsPayment: true,
          isOwner: false,
          isMember: true,
          hasPaymentRecord: true,
          paymentTxSignature,
          isPaymentTxValid: false,
          hasSubscriptionEnabled: true,
          paymentValidationError: `Payment sent to wrong recipient: ${txData?.recipient}`,
        };
      }

      // Validate amount matches the price that was active at payment time (historical pricing)
      const paymentTimestamp = txData?.timestamp;
      if (paymentTimestamp != null) {
        const paymentRecord = resources[0];

        let recordData: any = null;
        try {
          const dataResponse = await fetch(
            `/arbitrary/PRODUCT/${paymentRecord.name}/${paymentRecord.identifier}`
          );
          if (dataResponse.ok) {
            recordData = await dataResponse.json();
          }
        } catch (error) {
          console.error(
            `Failed to fetch subscription record for ${name}:`,
            error
          );
        }

        const indexData = await fetchSubscriptionIndexPrice(
          ownerName!,
          recordData.si
        );
        const expectedPrice = indexData?.priceQort;
        const intervalDaysAtPayment = 30;

        const amountPaid = parseFloat(txData?.amount) ?? 0;
        if (
          expectedPrice == null ||
          !isMultipleOfUnitPrice(amountPaid, expectedPrice)
        ) {
          console.error(
            '[checkSubscriptionStatus] Payment amount does not match expected price:',
            amountPaid,
            'expected',
            expectedPrice
          );
          return {
            status: 'subscribed-unpaid',
            isSubscribed: true,
            needsPayment: true,
            isOwner: false,
            isMember: true,
            hasPaymentRecord: true,
            paymentTxSignature,
            isPaymentTxValid: false,
            hasSubscriptionEnabled: true,
            paymentValidationError: `Payment amount ${amountPaid} doesn't match expected price ${expectedPrice} (price at time of payment)`,
          };
        }
        const paidIntervals = getPaidIntervalsFromAmount(
          amountPaid,
          expectedPrice
        );
        const subscriptionEndsAt =
          paymentTimestamp +
          paidIntervals * intervalDaysAtPayment! * 24 * 60 * 60 * 1000;

        const now = Date.now();
        if (now < subscriptionEndsAt) {
        } else {
          return {
            status: 'subscribed-unpaid',
            isSubscribed: true,
            needsPayment: true,
            isOwner: false,
            isMember: true,
            hasPaymentRecord: true,
            paymentTxSignature,
            isPaymentTxValid: false,
            hasSubscriptionEnabled: true,
            paymentValidationError: `Subscription has expired`,
          };
        }
      }

      // All validations passed!
      return {
        status: 'subscribed-paid',
        isSubscribed: true,
        needsPayment: false,
        isOwner: false,
        isMember: true,
        hasPaymentRecord: true,
        paymentTxSignature,
        isPaymentTxValid: true,
        hasSubscriptionEnabled: true,
      };
    } catch (e) {
      console.error(
        '[checkSubscriptionStatus] Failed to validate transaction:',
        e
      );
      return {
        status: 'subscribed-unpaid',
        isSubscribed: true,
        needsPayment: true,
        isOwner: false,
        isMember: true,
        hasPaymentRecord: true,
        paymentTxSignature,
        isPaymentTxValid: false,
        hasSubscriptionEnabled: true,
        paymentValidationError: 'Failed to fetch/validate transaction',
      };
    }
  } catch (error) {
    console.error('[checkSubscriptionStatus] Error:', error);
    return defaultResult;
  }
}

/**
 * Simplified version that only checks if an address is a member of a group
 * Useful when you don't need to verify payment records
 *
 * @param address - The address to check
 * @param groupId - The group ID
 * @returns Promise<boolean> - true if the address is a member, false otherwise
 *
 * @example
 * ```typescript
 * const isMember = await isGroupMember('QUserAddress123', 12345);
 * // isMember is true/false
 * ```
 */
export async function isGroupMember(
  address: string,
  groupId: number
): Promise<boolean> {
  try {
    const response = await fetch(`/groups/member/${address}`);
    if (!response.ok) {
      return false;
    }

    const groups = await response.json();
    return (
      Array.isArray(groups) &&
      groups.some((group: any) => group.groupId === groupId)
    );
  } catch (error) {
    console.error('Failed to check group membership:', error);
    return false;
  }
}

/**
 * Check if an address is the owner of a group
 *
 * @param address - The address to check
 * @param groupId - The group ID
 * @returns Promise<boolean> - true if the address is the owner, false otherwise
 *
 * @example
 * ```typescript
 * const isOwner = await isGroupOwner('QOwnerAddress123', 12345);
 * // isOwner is true/false
 * ```
 */
export async function isGroupOwner(
  address: string,
  groupId: number
): Promise<boolean> {
  try {
    const response = await fetch(`/groups/${groupId}`);
    if (!response.ok) {
      return false;
    }

    const groupData = await response.json();
    const groupOwner = groupData?.owner || groupData?.ownerAddress;
    return groupOwner === address;
  } catch (error) {
    console.error('Failed to check group ownership:', error);
    return false;
  }
}

export function parseOnChainIndexData(
  data: string
): { priceQort: number; intervalDays: number } | null {
  if (!data || typeof data !== 'string') return null;
  const decoded =
    data.length > 0 && !data.includes('|')
      ? (() => {
          try {
            return atob(data);
          } catch {
            return data;
          }
        })()
      : data;
  const parts = decoded.trim().split('|');
  if (parts.length < 5 || parts[0] !== 'qsub1') return null;
  const amt = parseFloat(parts[2]);
  if (Number.isNaN(amt)) return null;
  return { priceQort: amt, intervalDays: 30 };
}

export async function fetchSubscriptionIndexPrice(
  ownerName: string,
  indexIdentifier: string
): Promise<{ priceQort: number; intervalDays: number } | null> {
  const res = await fetch(
    `/arbitrary/DOCUMENT/${encodeURIComponent(ownerName)}/${encodeURIComponent(indexIdentifier)}`
  );
  if (!res.ok) return null;
  let dataStr = await res.text();
  try {
    const parsed = JSON.parse(dataStr);
    if (parsed && typeof parsed === 'object') {
      const raw = parsed.resource?.data ?? parsed.data;
      if (raw != null) dataStr = typeof raw === 'string' ? raw : String(raw);
    }
  } catch {
    // not JSON
  }
  if (!dataStr.includes('|')) {
    try {
      dataStr = atob(dataStr);
    } catch {
      return null;
    }
  }
  return parseOnChainIndexData(dataStr);
}
