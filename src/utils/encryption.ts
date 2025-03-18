import { Buffer } from "buffer";
import  ShortUniqueId  from "short-unique-id";

export enum EnumCollisionStrength {
    LOW = 8,
    MEDIUM = 11,
    HIGH = 14,
    PARENT_REF = 14,
    ENTITY_LABEL= 6
  }


export async function hashWord(word: string, collisionStrength: number, publicSalt: string) {
  const saltedWord = publicSalt + word; // Use public salt directly
  const encoded = new TextEncoder().encode(saltedWord);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);

  // Convert to base64 and make it URL-safe
  return Buffer.from(hashBuffer)
      .toString("base64")
      .replace(/\+/g, "-") // Replace '+' with '-'
      .replace(/\//g, "_") // Replace '/' with '_'
      .replace(/=+$/, "") // Remove trailing '='
      .slice(0, collisionStrength);
}



const uid = new ShortUniqueId({ length: 10, dictionary: "alphanum" });

interface EntityConfig {
  children?: Record<string, EntityConfig>;
}

export type IdentifierBuilder = {
  [key: string]: {
    children?: IdentifierBuilder;
  };
};

// Recursive function to traverse identifierBuilder
function findEntityConfig(identifierBuilder: IdentifierBuilder, path: string[]): EntityConfig {
  let current: EntityConfig | undefined = { children: identifierBuilder }; // ✅ Wrap it inside `{ children }` so it behaves like other levels


  for (const key of path) {
      if (!current.children || !current.children[key]) {
          throw new Error(`Entity '${key}' is not defined in identifierBuilder`);
      }
      current = current.children[key];
  }

  return current;
}


// Function to generate a prefix for searching
export async function buildSearchPrefix(
  appName: string,
  publicSalt: string,
  entityType: string,
  parentId: string | null,
  identifierBuilder: IdentifierBuilder
): Promise<string> {
  // Hash app name (11 chars)
  const appHash: string = await hashWord(appName, EnumCollisionStrength.HIGH, publicSalt);

  // Hash entity type (4 chars)
  const entityPrefix: string = await hashWord(entityType, EnumCollisionStrength.ENTITY_LABEL, publicSalt);

  // ✅ Detect if this entity is actually a root entity
  const isRootEntity = !!identifierBuilder[entityType];

  // Determine parent reference
  let parentRef = "";
  if (isRootEntity && parentId === null) {
      parentRef = "00000000000000"; // ✅ Only for true root entities
  } else if (parentId) {
      parentRef = await hashWord(parentId, EnumCollisionStrength.PARENT_REF, publicSalt);
  }

  // ✅ If there's no parentRef, return without it
  return parentRef
      ? `${appHash}-${entityPrefix}-${parentRef}-`  // ✅ Normal case with a parent
      : `${appHash}-${entityPrefix}-`;              // ✅ Global search for entity type
}



// Function to generate IDs dynamically with `publicSalt`
export async function buildIdentifier(
  appName: string,
  publicSalt: string,
  entityType: string,  // ✅ Now takes only the entity type
  parentId: string | null,
  identifierBuilder: IdentifierBuilder
): Promise<string> {
  console.log("Entity Type:", entityType); // Debugging
  console.log("Parent ID:", parentId); // Debugging

  // Hash app name (11 chars)
  const appHash: string = await hashWord(appName, EnumCollisionStrength.HIGH, publicSalt);

  // Hash entity type (4 chars)
  const entityPrefix: string = await hashWord(entityType, EnumCollisionStrength.ENTITY_LABEL, publicSalt);

  // Generate a unique identifier for this entity
  const entityUid = uid.rnd();

  // Determine parent reference
  let parentRef = "00000000000000"; // Default for feeds
  if (parentId) {
      parentRef = await hashWord(parentId, EnumCollisionStrength.PARENT_REF, publicSalt);
  }

  return `${appHash}-${entityPrefix}-${parentRef}-${entityUid}`;
}
