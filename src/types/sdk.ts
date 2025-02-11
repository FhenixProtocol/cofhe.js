export interface AbstractProvider {
  getChainId(): Promise<string>;
  call(tx: { to: string; data: string }): Promise<string>;
}

export interface AbstractSigner {
  getAddress(): Promise<string>;
  signTypedData(
    domain: object,
    types: Record<string, Array<object>>,
    value: object,
  ): Promise<string>;
}

export type PermitAccessRequirements = {
  contracts: string[];
  projects: string[];
};

type PermitAccessRequirementsParams =
  | {
      contracts?: never[];
      projects: string[];
    }
  | {
      contracts: string[];
      projects?: never[];
    };

export type InitializationParams = {
  provider: AbstractProvider;
  signer?: AbstractSigner;
  securityZones?: number[];
  coFheUrl?: string;
} & PermitAccessRequirementsParams;
