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
import {
  type TfheCompactPublicKey,
  type CompactPkeCrs,
  type CompactCiphertextListBuilder,
  type ProvenCompactCiphertextList,
} from "tfhe";
import { getTfhe } from "./tfhe-wrapper";

// TODO: Receive from cofhe
const crs = "0xFAKECRS" as unknown as CompactPkeCrs;

export const zkPack = (
  items: EncryptableItem[],
  publicKey: TfheCompactPublicKey,
) => {
  const tfhe = getTfhe();
  const builder = tfhe.ProvenCompactCiphertextList.builder(publicKey);

  for (const item of items) {
    switch (item.utype) {
      case tfhe.FheTypes.Bool: {
        builder.push_boolean(item.data);
        break;
      }
      case tfhe.FheTypes.Uint8: {
        const bint = toBigIntOrThrow(item.data);
        validateBigIntInRange(bint, MAX_UINT8);
        builder.push_u8(parseInt(bint.toString()));
        break;
      }
      case tfhe.FheTypes.Uint16: {
        const bint = toBigIntOrThrow(item.data);
        validateBigIntInRange(bint, MAX_UINT16);
        builder.push_u16(parseInt(bint.toString()));
        break;
      }
      case tfhe.FheTypes.Uint32: {
        const bint = toBigIntOrThrow(item.data);
        validateBigIntInRange(bint, MAX_UINT32);
        builder.push_u32(parseInt(bint.toString()));
        break;
      }
      case tfhe.FheTypes.Uint64: {
        const bint = toBigIntOrThrow(item.data);
        validateBigIntInRange(bint, MAX_UINT64);
        builder.push_u64(bint);
        break;
      }
      case tfhe.FheTypes.Uint128: {
        const bint = toBigIntOrThrow(item.data);
        validateBigIntInRange(bint, MAX_UINT128);
        builder.push_u128(bint);
        break;
      }
      case tfhe.FheTypes.Uint256: {
        const bint = toBigIntOrThrow(item.data);
        validateBigIntInRange(bint, MAX_UINT256);
        builder.push_u256(bint);
        break;
      }
      case tfhe.FheTypes.Uint160: {
        const bint =
          typeof item.data === "string"
            ? toBigInt(fromHexString(item.data))
            : item.data;
        builder.push_u160(bint);
        break;
      }
    }
  }

  return builder as CompactCiphertextListBuilder;
};

export const zkProve = async (
  builder: CompactCiphertextListBuilder,
  address: string,
  securityZone: number,
): Promise<ProvenCompactCiphertextList> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const tfhe = getTfhe();

      const compactList = builder.build_with_proof_packed(
        crs,
        recordToUint8Array({
          account_address: address,
          security_zone: securityZone,
        }),
        tfhe.ZkComputeLoad.Verify,
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
