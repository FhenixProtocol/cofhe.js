import { SealingKey } from "../sdk/sealing";

/**
 * Type representing the full Permit
 */
export type PermitInterface = {
  /**
   * Name for this permit, for organization and UI usage, not included in signature.
   */
  name: string;
  /**
   * The type of the Permit (self / sharing)
   * (self) Permit that will be signed and used by the issuer
   * (sharing) Permit that is signed by the issuer, but intended to be shared with recipient
   * (recipient) Permit that has been received, and signed by the recipient
   */
  type: "self" | "sharing" | "recipient";
  /**
   * (base) User that initially created the permission, target of data fetching
   */
  issuer: string;
  /**
   * (base) Expiration timestamp
   */
  expiration: number;
  /**
   * (base) List of contract addresses that can be accessed with this permission
   */
  contracts: string[];
  /**
   * (base) List of project identifiers (strings) that can be accessed
   */
  projects: string[];
  /**
   * (sharing) The user that this permission will be shared with
   * ** optional, use `address(0)` to disable **
   */
  recipient: string;
  /**
   * (issuer defined validation) An id used to query a contract to check this permissions validity
   * ** optional, use `0` to disable **
   */
  validatorId: number;
  /**
   * (issuer defined validation) The contract to query to determine permission validity
   * ** optional, user `address(0)` to disable **
   */
  validatorContract: string;
  /**
   * (base) The publicKey of a sealingPair used to re-encrypt `issuer`s confidential data
   *   (non-sharing) Populated by `issuer`
   *   (sharing)     Populated by `recipient`
   */
  sealingPair: SealingKey;
  /**
   * (base) `signTypedData` signature created by `issuer`.
   * (base) Shared- and Self- permissions differ in signature format: (`sealingKey` absent in shared signature)
   *   (non-sharing) < issuer, expiration, contracts, projects, recipient, validatorId, validatorContract, sealingKey >
   *   (sharing)     < issuer, expiration, contracts, projects, recipient, validatorId, validatorContract >
   */
  issuerSignature: string;
  /**
   * (sharing) `signTypedData` signature created by `recipient` with format:
   * (sharing) < sealingKey, issuerSignature>
   * ** required for shared permits **
   */
  recipientSignature: string;
};

/**
 * Optional additional metadata of a Permit
 * Can be passed into the constructor, but not necessary
 * Useful for deserialization
 */
export type PermitMetadata = {
  /**
   * Chain that this permit was signed on. In part used for mock encrypt/unseal on hardhat network.
   * Should not be set manually, included in metadata as part of serialization flows.
   */
  _signedChainId: string | undefined;
};

export type PickPartial<T, F extends keyof T> = Expand<
  Omit<T, F> & Partial<Pick<T, F>>
>;

export type PermitSatisfiers = Expand<
  Pick<PermitInterface, "contracts" | "projects">
>;

export type PermitCore = Expand<
  Pick<PermitInterface, "issuer"> &
    Partial<
      Pick<
        PermitInterface,
        | "contracts"
        | "projects"
        | "recipient"
        | "validatorId"
        | "validatorContract"
      >
    >
>;
// export type PermitOptions = Expand<
//   Partial<PermitInterface> & Pick<PermitInterface, "type" | "issuer">
// >;

export type PermitOptions =
  // Self permit requires at minimum `issuer`, excludes `recipient` and `recipientSignature`
  | Expand<
      Partial<Omit<PermitInterface, "recipient" | "recipientSignature">> & {
        type: "self";
        issuer: string;
      }
    >
  // Sharing permit requires at minimum `issuer` and `recipient`, excludes `recipientSignature`
  | Expand<
      Partial<Omit<PermitInterface, "recipientSignature">> & {
        type: "sharing";
        issuer: string;
        recipient: string;
      }
    >
  // Recipient permit requires the full issuer's permit
  | Expand<
      Partial<PermitInterface> & {
        type: "recipient";
        issuer: string;
        recipient: string;
        issuerSignature: string;
      }
    >;

export type SerializedPermit = Omit<PermitInterface, "sealingPair"> &
  PermitMetadata & {
    sealingPair: {
      privateKey: string;
      publicKey: string;
    };
  };

/**
 * A type representing the Permission struct that is passed to Permissioned.sol to grant encrypted data access.
 */
export type Permission = Expand<
  Omit<PermitInterface, "name" | "type" | "sealingPair"> & {
    sealingKey: string;
  }
>;

// Utils
export type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;
