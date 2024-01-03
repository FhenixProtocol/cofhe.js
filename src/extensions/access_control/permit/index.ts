import { isAddress, toHexString } from '../../../sdk/utils';
import { determineRequestMethod, determineRequestSigner, SupportedProvider } from '../../../sdk/types';
import { EIP712 } from '../EIP712';
import { GenerateSealingKey, SealingKey } from '../../../sdk/sealing';

const PERMIT_PREFIX = "Fhenix_saved_permit_";

export type Permit = {
  contractAddress: string,
  sealingKey: SealingKey;
  signature: string;
  publicKey: string
};

type SerializedPermit = {
  contractAddress: string;
  sealingKey: {
    privateKey: string;
    publicKey: string;
  }
  signature: string;
}

const parsePermit = (savedPermit: string): Permit => {
  const o = JSON.parse(savedPermit) as SerializedPermit;
  if (o) {
    return {
      contractAddress: o.contractAddress,
      sealingKey: new SealingKey(o.sealingKey.privateKey, o.sealingKey.publicKey),
      signature: o.signature,
      publicKey: o.sealingKey.publicKey
    };
  }
  throw new Error(`Cannot parse permit`);
}

export const getPermit = async (contract: string, provider: SupportedProvider): Promise<Permit> => {
  isAddress(contract);
  if (!provider) {
    throw new Error(`Missing provider`);
  }


  let savedPermit = null;
  if (typeof window !== 'undefined' && window.localStorage) {
    savedPermit = window.localStorage.getItem(`${PERMIT_PREFIX}${contract}`);
  }

  if (savedPermit) {
    try {
      return parsePermit(savedPermit);
    } catch (err) {
      console.warn(err);
    }
  }
  return generatePermit(contract, provider);
}

export const getAllPermits = (): Map<string, Permit> => {
  let permits: Map<string, Permit> = new Map();

  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key && key.includes(PERMIT_PREFIX)) {
      const contract = key.replace(PERMIT_PREFIX,"");
      try {
        const permit = parsePermit(window.localStorage.getItem(key)!);
        permits.set(contract, permit);
      } catch(err) {
        console.warn(err);
      }
    }
  }
  return permits;

}

const sign = async (signer: any, domain: any, types: any, value: any): Promise<string> => {
  if ('_signTypedData' in signer && typeof signer._signTypedData == 'function') {
    return await signer._signTypedData(domain, types, value);
  } else if ('signTypedData' in signer && typeof signer.signTypedData == 'function') {
    return await signer.signTypedData(domain, types, value);
  }
  throw new Error('Unsupported signer');
}

export const generatePermit = async (contract: string, provider: SupportedProvider): Promise<Permit> => {
  if (!provider) {
    throw new Error('Provider is undefined');
  }

  const requestMethod = determineRequestMethod(provider);

  const getSigner = determineRequestSigner(provider);
  const signer = await getSigner(provider);

  const chainId = await requestMethod(provider, "eth_chainId", [ ]);

  const keypair = await GenerateSealingKey();
  const msgParams: EIP712 = {
    types: {
      // This refers to the domain the contract is hosted on.
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
      // Refer to primaryType.
      Reencrypt: [{ name: 'publicKey', type: 'bytes32' }],
    },
    // This defines the message you're proposing the user to sign, is dapp-specific, and contains
    // anything you want. There are no required fields. Be as explicit as possible when building out
    // the message schema.
    // This refers to the keys of the following types object.
    primaryType: 'Reencrypt',
    domain: {
      // Give a user-friendly name to the specific contract you're signing for.
      name: 'Authorization permit', // params.name
      // This identifies the latest version.
      version: '1', //params.version ||
      // This defines the network, in this case, Mainnet.
      chainId: chainId,
      // // Add a verifying contract to make sure you're establishing contracts with the proper entity.
      verifyingContract: contract //params.verifyingContract,
    },
    message: {
      publicKey: `0x${keypair.publicKey}`,
    },
  };

  const msgSig = await sign(signer, msgParams.domain, 
    { Reencrypt: msgParams.types.Reencrypt }, 
    msgParams.message
  );

  const permit : Permit = {
    contractAddress: contract,
    sealingKey: keypair,
    signature: msgSig,
    publicKey: `0x${keypair.publicKey}`
    //permit: msgParams,
    //msgSig
  };
  if (typeof window !== 'undefined' && window.localStorage) {

    // Sealing key is a class, and will include methods in the JSON
    let serialized: SerializedPermit = {
      contractAddress: permit.contractAddress,
      sealingKey: {
        publicKey: permit.sealingKey.publicKey,
        privateKey: permit.sealingKey.privateKey
      },
      signature: permit.signature
    };

    window.localStorage.setItem(`${PERMIT_PREFIX}${contract}`, JSON.stringify(serialized));
  }
  return permit;
};

export const removePermit = (contract: string): void => {
  window.localStorage.removeItem(`${PERMIT_PREFIX}${contract}`);
}
