import { TfheCompactPublicKey } from 'node-tfhe';
import { encrypt8, encrypt16, encrypt32 } from './encrypt';
import { EIP712, generateToken } from './token';
import { decrypt } from './decrypt';
import { fromHexString, isAddress, toHexString } from '../utils';
import { ContractKeypairs } from './types';

export type FhevmInstance = {
  encrypt8: (value: number) => Uint8Array;
  encrypt16: (value: number) => Uint8Array;
  encrypt32: (value: number) => Uint8Array;
  generateToken: (options: {
    verifyingContract: string;
    name?: string;
    version?: string;
    force?: boolean;
  }) => Promise<{ publicKey: Uint8Array; token: EIP712 }>;
  setTokenSignature: (contractAddress: string, signature: string) => void;
  getTokenSignature: (contractAddress: string) => { publicKey: Uint8Array; signature: string } | null;
  hasKeypair: (contractAddress: string) => boolean;
  decrypt: (contractAddress: string, ciphertext: string) => Promise<number>;
  serializeKeypairs: () => ExportedContractKeypairs;
};

export type ExportedContractKeypairs = {
  [key: string]: {
    publicKey: string;
    privateKey: string;
    signature?: string | null;
  };
};

export type FhevmInstanceParams = {
  chainId: number;
  publicKey: TfheCompactPublicKey;
  keypairs?: ExportedContractKeypairs;
};

export const createInstance = (params: FhevmInstanceParams): FhevmInstance => {
  const { chainId, publicKey, keypairs } = params;

  let contractKeypairs: ContractKeypairs = {};

  if (keypairs) {
    Object.keys(keypairs).forEach((contractAddress) => {
      if (isAddress(contractAddress)) {
        const oKeys = Object.keys(keypairs[contractAddress]);
        if (['signature', 'privateKey', 'publicKey'].every((v) => oKeys.includes(v))) {
          contractKeypairs[contractAddress] = {
            signature: keypairs[contractAddress].signature,
            publicKey: fromHexString(keypairs[contractAddress].publicKey),
            privateKey: fromHexString(keypairs[contractAddress].privateKey),
          };
        }
      }
    });
  }

  return {
    // Parameters
    encrypt8(value) {
      if (!value) throw new Error('Missing value');
      return encrypt8(value, publicKey);
    },
    encrypt16(value) {
      if (!value) throw new Error('Missing value');
      return encrypt16(value, publicKey);
    },

    encrypt32(value) {
      if (!value) throw new Error('Missing value');

      return encrypt32(value, publicKey);
    },

    // Reencryption
    async generateToken(options) {
      if (!options.verifyingContract) throw new Error('Missing contract address');
      if (!isAddress(options.verifyingContract)) throw new Error('Invalid contract address');
      let kp;
      if (!options.force && contractKeypairs[options.verifyingContract]) {
        kp = contractKeypairs[options.verifyingContract];
      }
      const { token, keypair } = await generateToken({
        verifyingContract: options.verifyingContract,
        name: options.name,
        version: options.version,
        chainId,
        keypair: kp,
      });
      contractKeypairs[options.verifyingContract] = {
        privateKey: keypair.privateKey,
        publicKey: keypair.publicKey,
        signature: null,
      };
      return { token, publicKey: keypair.publicKey };
    },

    setTokenSignature(contractAddress: string, signature: string) {
      if (contractKeypairs[contractAddress] && contractKeypairs[contractAddress].privateKey) {
        contractKeypairs[contractAddress].signature = signature;
      }
    },

    getTokenSignature(contractAddress: string) {
      if (this.hasKeypair(contractAddress)) {
        return {
          publicKey: contractKeypairs[contractAddress].publicKey,
          signature: contractKeypairs[contractAddress].signature!,
        };
      }
      return null;
    },

    hasKeypair(contractAddress: string) {
      return contractKeypairs[contractAddress] != null && !!contractKeypairs[contractAddress].signature;
    },

    async decrypt(contractAddress, ciphertext) {
      if (!ciphertext) throw new Error('Missing ciphertext');
      if (!contractAddress) throw new Error('Missing contract address');
      const kp = contractKeypairs[contractAddress];
      if (!kp) throw new Error(`Missing keypair for ${contractAddress}`);

      return decrypt(kp, ciphertext);
    },

    serializeKeypairs() {
      const stringKeypairs: ExportedContractKeypairs = {};
      Object.keys(contractKeypairs).forEach((contractAddress) => {
        const signature = contractKeypairs[contractAddress].signature;
        if (!signature) return;
        stringKeypairs[contractAddress] = {
          signature,
          publicKey: toHexString(contractKeypairs[contractAddress].publicKey),
          privateKey: toHexString(contractKeypairs[contractAddress].privateKey),
        };
      });
      return stringKeypairs;
    },
  };
};
