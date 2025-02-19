/* eslint-disable @typescript-eslint/no-explicit-any */
import { Permit, permitStore, PermitParamsValidator } from "./permit";
import { isString } from "./validation";
import {
  _sdkStore,
  _store_getConnectedChainFheKey,
  _store_initialize,
  SdkStore,
} from "./store";
import {
  CoFheInItem,
  Prepared_Inputs,
  isEncryptableItem,
  PermitOptions,
  PermitInterface,
  Permission,
  Result,
  ResultErr,
  ResultOk,
  MappedUnsealedTypes,
  InitializationParams,
  EncryptableItem,
} from "../types";
import { zkPack, zkProve, zkVerify } from "./zkPoK";
import { initTfhe } from "./tfhe-wrapper";

/**
 * Initializes the `fhenixsdk` to enable encrypting input data, creating permits / permissions, and decrypting sealed outputs.
 * Initializes `fhevm` client FHE wasm module and fetches the provided chain's FHE publicKey.
 * If a valid signer is provided, a `permit/permission` is generated automatically
 */
const initialize = async (
  params: InitializationParams & {
    ignoreErrors?: boolean;
    generatePermit?: boolean;
  },
): Promise<Result<Permit | undefined>> => {
  // Initialize the fhevm
  await initTfhe(params.target).catch((err: unknown) => {
    if (params.ignoreErrors) {
      return undefined;
    } else {
      return ResultErr(
        `initialize :: failed to initialize fhenixjs - is the network FHE-enabled? ${err}`,
      );
    }
  });

  if (params.provider == null)
    return ResultErr(
      "initialize :: missing provider - Please provide an AbstractProvider interface",
    );

  if (params.securityZones != null && params.securityZones.length === 0)
    return ResultErr(
      "initialize :: a list of securityZones was provided, but it is empty",
    );

  await _store_initialize(params);

  // `generatePermit` must set to `false` to early exit here
  if (params.generatePermit === false) return ResultOk(undefined);

  // Return the existing active permit
  const userActivePermit = getPermit();
  if (userActivePermit.success) return userActivePermit;

  // Create permit and return it
  return createPermit();
};

/**
 * Internal reusable initialization checker
 */
const _checkInitialized = (
  state: SdkStore,
  options?: {
    fheKeys?: boolean;
    provider?: boolean;
    signer?: boolean;
    coFheUrl?: boolean;
  },
) => {
  if (options?.fheKeys !== false && !state.fheKeysInitialized) {
    return ResultErr(
      "fhenixsdk not initialized. Use `fhenixsdk.initialize(...)`.",
    );
  }

  if (options?.coFheUrl !== false && !state.coFheUrl)
    return ResultErr(
      "fhenixsdk not initialized with a coFheUrl. Set `coFheUrl` in `fhenixsdk.initialize`.",
    );

  if (options?.provider !== false && !state.providerInitialized)
    return ResultErr(
      "fhenixsdk not initialized with valid provider. Use `fhenixsdk.initialize(...)` with a valid provider that satisfies `AbstractProvider`.",
    );

  if (options?.signer !== false && !state.signerInitialized)
    return ResultErr(
      "fhenixsdk not initialized with a valid signer. Use `fhenixsdk.initialize(...)` with a valid signer that satisfies `AbstractSigner`.",
    );

  return ResultOk(null);
};

// Permit

/**
 * Creates a new permit with options, prompts user for signature.
 * Handles all `permit.type`s, and prompts for the correct signature type.
 * The created Permit will be inserted into the store and marked as the active permit.
 * NOTE: This is a wrapper around `Permit.create` and `Permit.sign`
 *
 * @param {PermitOptions} options - Partial Permit fields to create the Permit with, if no options provided will be filled with the defaults:
 * { type: "self", issuer: initializedUserAddress, projects: initializedProjects, contracts: initializedContracts }
 * @returns {Result<Permit>} - Newly created Permit as a Result object
 */
const createPermit = async (
  options?: PermitOptions,
): Promise<Result<Permit>> => {
  const state = _sdkStore.getState();

  const initialized = _checkInitialized(state);
  if (!initialized.success)
    return ResultErr(`${createPermit.name} :: ${initialized.error}`);

  const optionsWithDefaults: PermitOptions = {
    type: "self",
    issuer: state.account,
    contracts: state.accessRequirements.contracts,
    projects: state.accessRequirements.projects,
    ...options,
  };

  let permit: Permit;
  try {
    permit = await Permit.createAndSign(
      optionsWithDefaults,
      state.chainId,
      state.signer,
    );
  } catch (e) {
    return ResultErr(`${createPermit.name} :: ${e}`);
  }

  permitStore.setPermit(state.account!, permit);
  permitStore.setActivePermitHash(state.account!, permit.getHash());

  return ResultOk(permit);
};

/**
 * Imports a fully formed existing permit, expected to be valid.
 * Does not ask for user signature, expects to already be populated.
 * Will throw an error if the imported permit is invalid, see `Permit.isValid`.
 * The imported Permit will be inserted into the store and marked as the active permit.
 *
 * @param {string | PermitInterface} imported - Permit to import as a text string or PermitInterface
 */
const importPermit = async (
  imported: string | PermitInterface,
): Promise<Result<Permit>> => {
  const state = _sdkStore.getState();

  const initialized = _checkInitialized(state);
  if (!initialized.success)
    return ResultErr(`${createPermit.name} :: ${initialized.error}`);

  // Import validation
  if (typeof imported === "string") {
    try {
      imported = JSON.parse(imported);
    } catch (e) {
      return ResultErr(`importPermit :: json parsing failed - ${e}`);
    }
  }

  const {
    success,
    data: parsedPermit,
    error: permitParsingError,
  } = PermitParamsValidator.safeParse(imported as PermitInterface);
  if (!success) {
    const errorString = Object.entries(permitParsingError.flatten().fieldErrors)
      .map(([field, err]) => `- ${field}: ${err}`)
      .join("\n");
    return ResultErr(`importPermit :: invalid permit data - ${errorString}`);
  }
  if (parsedPermit.type !== "self") {
    if (parsedPermit.issuer === state.account) parsedPermit.type = "sharing";
    else if (parsedPermit.recipient === state.account)
      parsedPermit.type = "recipient";
    else {
      return ResultErr(
        `importPermit :: invalid Permit - connected account <${state.account}> is not issuer or recipient`,
      );
    }
  }

  let permit: Permit;
  try {
    permit = await Permit.create(parsedPermit as PermitInterface);
  } catch (e) {
    return ResultErr(`importPermit :: ${e}`);
  }

  const { valid, error } = permit.isValid();
  if (!valid) {
    return ResultErr(
      `importPermit :: newly imported permit is invalid - ${error}`,
    );
  }

  permitStore.setPermit(state.account!, permit);
  permitStore.setActivePermitHash(state.account!, permit.getHash());

  return ResultOk(permit);
};

/**
 * Selects the active permit using its hash.
 * If the hash is not found in the stored permits store, throws an error.
 * The matched permit will be marked as the active permit.
 *
 * @param {string} hash - The `Permit.getHash` of the target permit.
 */
const selectActivePermit = (hash: string): Result<Permit> => {
  const state = _sdkStore.getState();

  const initialized = _checkInitialized(state);
  if (!initialized.success)
    return ResultErr(`${selectActivePermit.name} :: ${initialized.error}`);

  const permit = permitStore.getPermit(state.account, hash);
  if (permit == null)
    return ResultErr(
      `${selectActivePermit.name} :: Permit with hash <${hash}> not found`,
    );

  permitStore.setActivePermitHash(state.account!, permit.getHash());

  return ResultOk(permit);
};

/**
 * Retrieves a stored permit based on its hash.
 * If no hash is provided, the currently active permit will be retrieved.
 *
 * @param {string} hash - Optional `Permit.getHash` of the permit.
 * @returns {Result<Permit>} - The active permit or permit associated with `hash` as a Result object.
 */
const getPermit = (hash?: string): Result<Permit> => {
  const state = _sdkStore.getState();

  const initialized = _checkInitialized(state);
  if (!initialized.success)
    return ResultErr(`${getPermit.name} :: ${initialized.error}`);

  if (hash == null) {
    const permit = permitStore.getActivePermit(state.account);
    if (permit == null)
      return ResultErr(`getPermit :: active permit not found`);

    return ResultOk(permit);
  }

  const permit = permitStore.getPermit(state.account, hash);
  if (permit == null)
    return ResultErr(`getPermit :: permit with hash <${hash}> not found`);

  return ResultOk(permit);
};

/**
 * Retrieves a stored permission based on the permit's hash.
 * If no hash is provided, the currently active permit will be used.
 * The `Permission` is extracted from the permit.
 *
 * @param {string} hash - Optional hash of the permission to get, defaults to active permit's permission
 * @returns {Result<Permission>} - The active permission or permission associated with `hash`, as a result object.
 */
const getPermission = (hash?: string): Result<Permission> => {
  const permitResult = getPermit(hash);
  if (!permitResult.success)
    return ResultErr(`${getPermission.name} :: ${permitResult.error}`);

  return ResultOk(permitResult.data.getPermission());
};

/**
 * Exports all stored permits.
 * @returns {Result<Record<string, Permit>>} - All stored permits.
 */
const getAllPermits = (): Result<Record<string, Permit>> => {
  const state = _sdkStore.getState();

  const initialized = _checkInitialized(state);
  if (!initialized.success)
    return ResultErr(`${getAllPermits.name} :: ${initialized.error}`);

  return ResultOk(permitStore.getPermits(state.account));
};

// Encrypt

function extractEncryptables<T>(item: T): EncryptableItem[];
function extractEncryptables<T extends any[]>(item: [...T]): EncryptableItem[];
function extractEncryptables<T>(item: T) {
  if (isEncryptableItem(item)) {
    return item;
  }

  // Object | Array
  if (typeof item === "object" && item !== null) {
    if (Array.isArray(item)) {
      // Array - recurse
      return item.flatMap((nestedItem) => extractEncryptables(nestedItem));
    } else {
      // Object - recurse
      return Object.values(item).flatMap((value) => extractEncryptables(value));
    }
  }

  return [];
}

function replaceEncryptablesAndInjectPermission<T>(
  item: T,
  encryptedItems: CoFheInItem[],
): [Prepared_Inputs<T>, CoFheInItem[]];
function replaceEncryptablesAndInjectPermission<T extends any[]>(
  item: [...T],
  encryptedItems: CoFheInItem[],
): [...Prepared_Inputs<T>, CoFheInItem[]];
function replaceEncryptablesAndInjectPermission<T>(
  item: T,
  encryptedItems: CoFheInItem[],
) {
  if (item === "permission") {
    return getPermission();
  }

  if (isEncryptableItem(item)) {
    return [encryptedItems[0], encryptedItems.slice(1)];
  }

  // Object | Array
  if (typeof item === "object" && item !== null) {
    if (Array.isArray(item)) {
      // Array - recurse
      return item.reduce<[any[], CoFheInItem[]]>(
        ([acc, remaining], item) => {
          const [newItem, newRemaining] =
            replaceEncryptablesAndInjectPermission(item, remaining);
          return [[...acc, newItem], newRemaining];
        },
        [[], encryptedItems],
      );
    } else {
      // Object - recurse
      return Object.entries(item).reduce<[Record<string, any>, CoFheInItem[]]>(
        ([acc, remaining], [key, value]) => {
          const [newValue, newRemaining] =
            replaceEncryptablesAndInjectPermission(value, remaining);
          return [{ ...acc, [key]: newValue }, newRemaining];
        },
        [{}, encryptedItems],
      );
    }
  }

  return [item, encryptedItems];
}

async function prepareInputs<T>(
  item: T,
  securityZone?: number,
): Promise<Result<Prepared_Inputs<T>>>;
async function prepareInputs<T extends any[]>(
  item: [...T],
  securityZone?: number,
): Promise<Result<[...Prepared_Inputs<T>]>>;
async function prepareInputs<T>(item: T, securityZone = 0) {
  const state = _sdkStore.getState();

  // Only need to check `fheKeysInitialized`, signer and provider not needed for encryption
  const initialized = _checkInitialized(state, {
    provider: false,
    signer: false,
  });
  if (!initialized.success)
    return ResultErr(`prepareInputs :: ${initialized.error}`);

  if (state.account == null)
    return ResultErr("prepareInputs :: account uninitialized");

  const fhePublicKey = _store_getConnectedChainFheKey(0);
  if (fhePublicKey == null)
    return ResultErr("prepareInputs :: fheKey for current chain not found");

  const coFheUrl = state.coFheUrl;
  if (coFheUrl == null)
    return ResultErr("prepareInputs :: coFheUrl not initialized");

  const encryptableItems = extractEncryptables(item);

  const builder = zkPack(encryptableItems, fhePublicKey);
  const proved = await zkProve(builder, state.account, securityZone);
  const zkVerifyRes = await zkVerify(coFheUrl, proved);

  if (!zkVerifyRes.ok)
    return ResultErr(
      `prepareInputs :: ZK proof verification failed - ${await zkVerifyRes.text()}`,
    );

  const inItems: CoFheInItem[] = await zkVerifyRes.json();

  const [preparedInputItems, remainingInItems] =
    replaceEncryptablesAndInjectPermission(item, inItems);

  if (remainingInItems != null)
    return ResultErr(
      "prepareInputs :: some encrypted inputs remaining after replacement",
    );

  return ResultOk(preparedInputItems);
}

// Unseal

/**
 * Unseals an encrypted message using the stored permit for a specific contract address.
 * NOTE: Wrapper around `Permit.unseal`
 *
 * @param {string} ciphertext - The encrypted message to unseal.
 * @param {string} account - Users address, defaults to store.account
 * @param {string} hash - The hash of the permit to use for this operation, defaults to active permit hash
 * @returns bigint - The unsealed message.
 */
const unsealCiphertext = (
  ciphertext: string,
  account?: string,
  hash?: string,
): Result<bigint> => {
  const state = _sdkStore.getState();

  const initialized = _checkInitialized(state);
  if (!initialized.success)
    return ResultErr(`${getAllPermits.name} :: ${initialized.error}`);

  isString(ciphertext);
  const resolvedAccount = account ?? state.account;
  const resolvedHash = hash ?? permitStore.getActivePermitHash(resolvedAccount);
  if (resolvedAccount == null || resolvedHash == null) {
    return ResultErr(
      `unsealCiphertext :: Permit hash not provided and active Permit not found`,
    );
  }

  const permit = permitStore.getPermit(resolvedAccount, resolvedHash);
  if (permit == null) {
    return ResultErr(
      `unsealCiphertext :: Permit with account <${account}> and hash <${hash}> not found`,
    );
  }

  let unsealed: bigint;
  try {
    unsealed = permit.unsealCiphertext(ciphertext);
  } catch (e) {
    return ResultErr(`unsealCiphertext :: ${e}`);
  }

  return ResultOk(unsealed);
};

/**
 * Uses the privateKey of `permit.sealingPair` to recursively unseal any contained `SealedItems`.
 * If `item` is a single `SealedItem` it will be individually.
 * NOTE: Only unseals typed `SealedItem`s returned from `FHE.sealoutputTyped` and the FHE bindings' `e____.sealTyped`.
 *
 * @param {any | any[]} item - Array, object, or item. Any nested `SealedItems` will be unsealed.
 * @returns - Recursively unsealed data in the target type, SealedBool -> boolean, SealedAddress -> string, etc.
 */
function unseal<T>(
  item: T,
  account?: string,
  hash?: string,
): Result<MappedUnsealedTypes<T>> {
  const resolvedAccount = account ?? _sdkStore.getState().account;
  const resolvedHash = hash ?? permitStore.getActivePermitHash(resolvedAccount);
  if (resolvedAccount == null || resolvedHash == null) {
    return ResultErr(
      `unseal :: Permit hash not provided and active Permit not found`,
    );
  }

  const permit = permitStore.getPermit(resolvedAccount, resolvedHash);
  if (permit == null) {
    return ResultErr(
      `unseal :: Permit with account <${account}> and hash <${hash}> not found`,
    );
  }

  let unsealed: MappedUnsealedTypes<T>;
  try {
    unsealed = permit.unseal(item);
  } catch (e) {
    return ResultErr(`unseal :: ${e}`);
  }

  return ResultOk(unsealed);
}

// Export

export const fhenixsdk = {
  store: _sdkStore,
  initialize,

  createPermit,
  importPermit,
  selectActivePermit,
  getPermit,
  getPermission,
  getAllPermits,

  prepareInputs,

  unsealCiphertext,
  unseal,
};
