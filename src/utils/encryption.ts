import { Buffer } from "buffer";
import ShortUniqueId from "short-unique-id";
import { objectToBase64, uint8ArrayToBase64 } from "./base64";
import { RequestQueueWithPromise } from "./queue";
import { base64ToUint8Array } from "./publish";
import nacl from "../deps/nacl-fast";
import SHA256 from 'crypto-js/sha256';
import EncBase64 from 'crypto-js/enc-base64';

export const IDENTIFIER_BUILDER_VERSION = `v1`
export const requestQueueGetPublicKeys = new RequestQueueWithPromise(10);

export enum EnumCollisionStrength {
  LOW = 8,
  MEDIUM = 11,
  HIGH = 14,
  PARENT_REF = 14,
  ENTITY_LABEL = 6,
}

const deprecatedSafeBase64 = (base64: string): string =>
  base64
.replace(/\+/g, "-")
.replace(/\//g, "_")
.replace(/=+$/, "")


// Custom URL-safe replacements (reserving '-' and '_')
const safeBase64 = (base64: string): string =>
  base64
    .replace(/\+/g, ".")   // Replace '+' with '.' (URL-safe)
    .replace(/\//g, "~")   // Replace '/' with '~' (URL-safe)
    .replace(/_/g, "!")    // Replace '_' with '!' if needed (optional)
    .replace(/=+$/, "");   // Remove padding


    export async function hashWord(
      word: string,
      collisionStrength: number,
      publicSalt: string
    ): Promise<string> {
      const saltedWord = publicSalt + word;
    
      try {
        if (!crypto?.subtle?.digest) throw new Error("Web Crypto not available");
    
        const encoded = new TextEncoder().encode(saltedWord);
        const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
        const base64 = Buffer.from(hashBuffer).toString("base64");
    
        return safeBase64(base64).slice(0, collisionStrength);
      } catch (err) {
        const hash = SHA256(saltedWord);
        const base64 = EncBase64.stringify(hash);
    
        return safeBase64(base64).slice(0, collisionStrength);
      }
    }


export async function hashWordWithoutPublicSalt(
  word: string,
  collisionStrength: number
): Promise<string> {
  try {
    if (!crypto?.subtle?.digest) throw new Error("Web Crypto not available");

    const encoded = new TextEncoder().encode(word);
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
    const base64 = Buffer.from(hashBuffer).toString("base64");

    return safeBase64(base64).slice(0, collisionStrength);
  } catch (err) {
    const hash = SHA256(word);
    const base64 = EncBase64.stringify(hash);

    return safeBase64(base64).slice(0, collisionStrength);
  }
}


const uid = new ShortUniqueId({ length: 15, dictionary: "alphanum" });

interface EntityConfig {
  children?: Record<string, EntityConfig>;
}




// Function to generate a prefix for searching
export async function buildSearchPrefix(
  appName: string,
  publicSalt: string,
  entityType: string,
  parentId: string | null
): Promise<string> {
  // Hash app name (11 chars)
  const appHash: string = await hashWord(
    appName,
    EnumCollisionStrength.HIGH,
    publicSalt
  );

  // Hash entity type (4 chars)
  const entityPrefix: string = await hashWord(
    entityType,
    EnumCollisionStrength.ENTITY_LABEL,
    publicSalt
  );



  // Determine parent reference
  let parentRef = "";
  if (parentId === null) {
    parentRef = "00000000000000"; // ✅ Only for true root entities
  } else if (parentId) {
    parentRef = await hashWord(
      parentId,
      EnumCollisionStrength.PARENT_REF,
      publicSalt
    );
  }

  // ✅ If there's no parentRef, return without it
  return parentRef
    ? `${appHash}-${entityPrefix}-${parentRef}-` // ✅ Normal case with a parent
    : `${appHash}-${entityPrefix}-`; // ✅ Global search for entity type
}

export async function buildLooseSearchPrefix(
  entityType: string,
  parentId?: string | null
): Promise<string> {
  // Hash entity type (6 chars)
  const entityPrefix: string = await hashWord(
    entityType,
    EnumCollisionStrength.ENTITY_LABEL,
    ""
  );

  let parentRef = "";
  if (parentId === null) {
    parentRef = "00000000000000"; // for true root entities
  } else if (parentId) {
    parentRef = await hashWord(
      parentId,
      EnumCollisionStrength.PARENT_REF,
      ""
    );
  }

  return parentRef
    ? `${entityPrefix}-${parentRef}-` // for nested entity searches
    : `${entityPrefix}-`; // global entity type prefix
}

// Function to generate IDs dynamically with `publicSalt`
export async function buildIdentifier(
  appName: string,
  publicSalt: string,
  entityType: string, // ✅ Now takes only the entity type
  parentId: string | null
): Promise<string> {
  // Hash app name (11 chars)
  const appHash: string = await hashWord(
    appName,
    EnumCollisionStrength.HIGH,
    publicSalt
  );

  // Hash entity type (4 chars)
  const entityPrefix: string = await hashWord(
    entityType,
    EnumCollisionStrength.ENTITY_LABEL,
    publicSalt
  );

  // Generate a unique identifier for this entity
  const entityUid = uid.rnd();

  // Determine parent reference
  let parentRef = "00000000000000"; // Default for feeds
  if (parentId) {
    parentRef = await hashWord(
      parentId,
      EnumCollisionStrength.PARENT_REF,
      publicSalt
    );
  }

  return `${appHash}-${entityPrefix}-${parentRef}-${entityUid}-${IDENTIFIER_BUILDER_VERSION}`;
}

export async function buildLooseIdentifier(
  entityType: string,
  parentId?: string | null
): Promise<string> {
  // 4-char hash for entity type
  const entityPrefix: string = await hashWord(
    entityType,
    EnumCollisionStrength.ENTITY_LABEL,
    ""
  );

  // Generate 8-12 character random uid (depends on uid.rnd() settings)
  const entityUid = uid.rnd();

  // Optional hashed parent ref
  let parentRef = '';
  if (parentId) {
    parentRef = await hashWord(
      parentId,
      EnumCollisionStrength.PARENT_REF,
      ""
    );
  }

  return `${entityPrefix}${parentRef ? `-${parentRef}` : ''}-${entityUid}${IDENTIFIER_BUILDER_VERSION ? `-${IDENTIFIER_BUILDER_VERSION}` : ''}`;
}

export const createSymmetricKeyAndNonce = () => {
  const messageKey = new Uint8Array(32); // 32 bytes for the symmetric key
  crypto.getRandomValues(messageKey);

  return { messageKey: uint8ArrayToBase64(messageKey) };
};

const getPublicKeysByNames = async (names: string[]) => {
  // Use the request queue for fetching public keys
  const memberPromises = names.map((name) =>
    requestQueueGetPublicKeys.enqueue(async () => {
      try {
        const response = await fetch(`/names/${name}`);
        const nameInfo = await response.json();
        const resAddress = await fetch(`/addresses/${nameInfo.owner}`);
        const resData = await resAddress.json();
        return resData.publicKey;
      } catch (error) {
        return null;
      }
    })
  );

  const members = await Promise.all(memberPromises);
  return members?.filter((item: string | null) => !!item);
};

export const addAndEncryptSymmetricKeys = async ({
  previousData,
  names,
  disableAddNewKey
}: {
  previousData: Object;
  names: string[];
  disableAddNewKey?: boolean
}) => {
  try {
    if(disableAddNewKey){

      const groupmemberPublicKeys = await getPublicKeysByNames(names);
      const symmetricKeyAndNonceBase64 = await objectToBase64(previousData);
      const encryptedData = await qortalRequest({
        action: "ENCRYPT_DATA",
        base64: symmetricKeyAndNonceBase64,
        publicKeys: groupmemberPublicKeys,
      });
  
      if (encryptedData) {
        return {encryptedData, publicKeys: groupmemberPublicKeys, symmetricKeys: previousData};
      } else {
        throw new Error("Cannot encrypt content");
      }
    }
    let highestKey = 0;
    if (previousData && Object.keys(previousData)?.length > 0) {
      highestKey = Math.max(
        ...Object.keys(previousData || {})
          .filter((item) => !isNaN(+item))
          .map(Number)
      );
    }
    const groupmemberPublicKeys = await getPublicKeysByNames(names);
    const symmetricKey = createSymmetricKeyAndNonce();
    const nextNumber = highestKey + 1;
    const objectToSave = {
      ...previousData,
      [nextNumber]: symmetricKey,
    };

    const symmetricKeyAndNonceBase64 = await objectToBase64(objectToSave);
    const encryptedData = await qortalRequest({
      action: "ENCRYPT_DATA",
      base64: symmetricKeyAndNonceBase64,
      publicKeys: groupmemberPublicKeys,
    });

    if (encryptedData) {
      return {encryptedData, publicKeys: groupmemberPublicKeys, symmetricKeys: objectToSave};
    } else {
      throw new Error("Cannot encrypt content");
    }
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const encryptWithSymmetricKeys = async ({
  base64,
  secretKeyObject,
  typeNumber = 2,
}: any) => {
  // Find the highest key in the secretKeyObject
  const highestKey = Math.max(
    ...Object.keys(secretKeyObject)
      .filter((item) => !isNaN(+item))
      .map(Number)
  );
  const highestKeyObject = secretKeyObject[highestKey];

  // Convert data and keys from base64
  const Uint8ArrayData = base64ToUint8Array(base64);
  const messageKey = base64ToUint8Array(highestKeyObject.messageKey);

  if (!(Uint8ArrayData instanceof Uint8Array)) {
    throw new Error("The Uint8ArrayData you've submitted is invalid");
  }

  let nonce, encryptedData, encryptedDataBase64, finalEncryptedData;

  // Convert type number to a fixed length of 3 digits
  const typeNumberStr = typeNumber.toString().padStart(3, "0");

  if (highestKeyObject.nonce) {
    // Old format: Use the nonce from secretKeyObject
    nonce = base64ToUint8Array(highestKeyObject.nonce);

    // Encrypt the data with the existing nonce and message key
    encryptedData = nacl.secretbox(Uint8ArrayData, nonce, messageKey);
    encryptedDataBase64 = uint8ArrayToBase64(encryptedData);

    // Concatenate the highest key, type number, and encrypted data (old format)
    const highestKeyStr = highestKey.toString().padStart(10, "0"); // Fixed length of 10 digits
    finalEncryptedData = btoa(highestKeyStr + encryptedDataBase64);
  } else {
    // New format: Generate a random nonce and embed it in the message
    nonce = new Uint8Array(24); // 24 bytes for the nonce
    crypto.getRandomValues(nonce);

    // Encrypt the data with the new nonce and message key
    encryptedData = nacl.secretbox(Uint8ArrayData, nonce, messageKey);
    encryptedDataBase64 = uint8ArrayToBase64(encryptedData);

    // Convert the nonce to base64
    const nonceBase64 = uint8ArrayToBase64(nonce);

    // Concatenate the highest key, type number, nonce, and encrypted data (new format)
    const highestKeyStr = highestKey.toString().padStart(10, "0"); // Fixed length of 10 digits

    const highestKeyBytes = new TextEncoder().encode(
      highestKeyStr.padStart(10, "0")
    );
    const typeNumberBytes = new TextEncoder().encode(
      typeNumberStr.padStart(3, "0")
    );

    // Step 3: Concatenate all binary
    const combinedBinary = new Uint8Array(
      highestKeyBytes.length +
        typeNumberBytes.length +
        nonce.length +
        encryptedData.length
    );
    //   finalEncryptedData = btoa(highestKeyStr) + btoa(typeNumberStr) + nonceBase64 + encryptedDataBase64;
    combinedBinary.set(highestKeyBytes, 0);
    combinedBinary.set(typeNumberBytes, highestKeyBytes.length);
    combinedBinary.set(nonce, highestKeyBytes.length + typeNumberBytes.length);
    combinedBinary.set(
      encryptedData,
      highestKeyBytes.length + typeNumberBytes.length + nonce.length
    );

    // Step 4: Base64 encode once
    finalEncryptedData = uint8ArrayToBase64(combinedBinary);
  }

  return finalEncryptedData;
};

export interface SecretKeyValue {
  messageKey: string;
}

export type SymmetricKeys = Record<number, SecretKeyValue>

export const decryptWithSymmetricKeys = async ({
  base64,
  secretKeyObject,
}: {
  base64: string;
  secretKeyObject: SymmetricKeys;
}) => {
  // First, decode the base64-encoded input (if skipDecodeBase64 is not set)
  const decodedData = base64;

  // Then, decode it again for the specific format (if double encoding is used)
  const decodeForNumber = atob(decodedData);

  // Extract the key (assuming it's always the first 10 characters)
  const keyStr = decodeForNumber.slice(0, 10);

  // Convert the key string back to a number
  const highestKey = parseInt(keyStr, 10);

  // Check if we have a valid secret key for the extracted highestKey
  if (!secretKeyObject[highestKey]) {
    throw new Error("Cannot find correct secretKey");
  }

  const secretKeyEntry = secretKeyObject[highestKey];

  let typeNumberStr, nonceBase64, encryptedDataBase64;

  // Determine if typeNumber exists by checking if the next 3 characters after keyStr are digits
  const possibleTypeNumberStr = decodeForNumber.slice(10, 13);

  // const typeNumberStr = new TextDecoder().decode(typeNumberBytes);
  if (decodeForNumber.slice(10, 13) !== "001") {
    const decodedBinary = base64ToUint8Array(decodedData);
    const highestKeyBytes = decodedBinary.slice(0, 10); // if ASCII digits only
    const highestKeyStr = new TextDecoder().decode(highestKeyBytes);

    const nonce = decodedBinary.slice(13, 13 + 24);
    const encryptedData = decodedBinary.slice(13 + 24);
    const highestKey = parseInt(highestKeyStr, 10);

    const messageKey = base64ToUint8Array(
      secretKeyObject[+highestKey].messageKey
    );
    const decryptedBytes = nacl.secretbox.open(
      encryptedData,
      nonce,
      messageKey
    );

    // Check if decryption was successful
    if (!decryptedBytes) {
      throw new Error("Decryption failed");
    }

    // Convert the decrypted Uint8Array back to a Base64 string
    return uint8ArrayToBase64(decryptedBytes);
  }
  // New format: Extract type number and nonce
  typeNumberStr = possibleTypeNumberStr; // Extract type number
  nonceBase64 = decodeForNumber.slice(13, 45); // Extract nonce (next 32 characters after type number)
  encryptedDataBase64 = decodeForNumber.slice(45); // The remaining part is the encrypted data

  // Convert Base64 strings to Uint8Array
  const Uint8ArrayData = base64ToUint8Array(encryptedDataBase64);
  const nonce = base64ToUint8Array(nonceBase64);
  const messageKey = base64ToUint8Array(secretKeyEntry.messageKey);

  if (!(Uint8ArrayData instanceof Uint8Array)) {
    throw new Error("The Uint8ArrayData you've submitted is invalid");
  }

  // Decrypt the data using the nonce and messageKey
  const decryptedData = nacl.secretbox.open(Uint8ArrayData, nonce, messageKey);

  // Check if decryption was successful
  if (!decryptedData) {
    throw new Error("Decryption failed");
  }

  // Convert the decrypted Uint8Array back to a Base64 string
  return uint8ArrayToBase64(decryptedData);
};
