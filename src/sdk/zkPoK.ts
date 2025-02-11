import {
  TfheCompactPublicKey,
  ProvenCompactCiphertextList,
  CompactPkeCrs,
  ZkComputeLoad,
  FheTypes,
  CompactCiphertextListBuilder,
} from "tfhe";
import { EncryptableItem } from "../types";
import {
  fromHexString,
  recordToUint8Array,
  toBigInt,
  toBigIntOrThrow,
  validateBigIntInRange,
} from "./utils";
import {
  MAX_UINT128,
  MAX_UINT16,
  MAX_UINT256,
  MAX_UINT32,
  MAX_UINT64,
  MAX_UINT8,
} from "./consts";

// TODO: Receive from cofhe
const crs = "0xFAKECRS" as unknown as CompactPkeCrs;

export const zkPack = (
  items: EncryptableItem[],
  publicKey: TfheCompactPublicKey,
) => {
  const builder = ProvenCompactCiphertextList.builder(publicKey);

  for (const item of items) {
    switch (item.utype) {
      case FheTypes.Bool: {
        builder.push_boolean(item.data);
        break;
      }
      case FheTypes.Uint8: {
        const bint = toBigIntOrThrow(item.data);
        validateBigIntInRange(bint, MAX_UINT8);
        builder.push_u8(parseInt(bint.toString()));
        break;
      }
      case FheTypes.Uint16: {
        const bint = toBigIntOrThrow(item.data);
        validateBigIntInRange(bint, MAX_UINT16);
        builder.push_u16(parseInt(bint.toString()));
        break;
      }
      case FheTypes.Uint32: {
        const bint = toBigIntOrThrow(item.data);
        validateBigIntInRange(bint, MAX_UINT32);
        builder.push_u32(parseInt(bint.toString()));
        break;
      }
      case FheTypes.Uint64: {
        const bint = toBigIntOrThrow(item.data);
        validateBigIntInRange(bint, MAX_UINT64);
        builder.push_u64(bint);
        break;
      }
      case FheTypes.Uint128: {
        const bint = toBigIntOrThrow(item.data);
        validateBigIntInRange(bint, MAX_UINT128);
        builder.push_u128(bint);
        break;
      }
      case FheTypes.Uint256: {
        const bint = toBigIntOrThrow(item.data);
        validateBigIntInRange(bint, MAX_UINT256);
        builder.push_u256(bint);
        break;
      }
      case FheTypes.Uint160: {
        const bint =
          typeof item.data === "string"
            ? toBigInt(fromHexString(item.data))
            : item.data;
        builder.push_u160(bint);
        break;
      }
    }
  }

  return builder;
};

export const zkProve = async (
  builder: CompactCiphertextListBuilder,
  address: string,
): Promise<ProvenCompactCiphertextList> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const compactList = builder.build_with_proof_packed(
        crs,
        recordToUint8Array({ address }),
        ZkComputeLoad.Verify,
      );
      resolve(compactList);
    }, 0);
  });
};

export const zkVerify = async (
  coFheUrl: string,
  compactList: ProvenCompactCiphertextList,
) => {
  // Send to zkVerifier as an api call
  return fetch(`${coFheUrl}/VerifyZKProof`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: compactList.serialize(),
  });
};
