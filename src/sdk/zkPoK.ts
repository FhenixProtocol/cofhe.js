import init, {
  initThreadPool,
  init_panic_hook,
  ShortintParametersName,
  ShortintParameters,
  TfheClientKey,
  TfheCompactPublicKey,
  TfheCompressedServerKey,
  TfheConfigBuilder,
  ProvenCompactCiphertextList,
  CompactPkeCrs,
  ZkComputeLoad,
  ShortintCompactPublicKeyEncryptionParameters,
  ShortintCompactPublicKeyEncryptionParametersName,
  set_server_key,
  TfheServerKey,
  FheTypes,
  CompactCiphertextListBuilder,
} from "tfhe";
import { EncryptableItem } from "../types";
import { recordToUint8Array } from "./utils";

// TODO: Receive from cofhe
const crs = "0xFAKECRS" as unknown as CompactPkeCrs;

export const zkPack = (
  items: EncryptableItem[],
  publicKey: TfheCompactPublicKey,
) => {
  const builder = ProvenCompactCiphertextList.builder(publicKey);

  for (const item of items) {
    switch (item.utype) {
      case FheTypes.Bool:
        builder.push_boolean(item.data);
        break;
      case FheTypes.Uint8:
        builder.push_u8(parseInt(`${item.data}`));
        break;
      case FheTypes.Uint16:
        builder.push_u16(parseInt(`${item.data}`));
        break;
      case FheTypes.Uint32:
        builder.push_u32(parseInt(`${item.data}`));
        break;
      case FheTypes.Uint64:
        builder.push_u64(BigInt(item.data));
        break;
      case FheTypes.Uint128:
        builder.push_u128(BigInt(item.data));
        break;
      case FheTypes.Uint256:
        builder.push_u256(BigInt(item.data));
        break;
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

export const zkCoFHEVerify = async (
  compactList: ProvenCompactCiphertextList,
) => {};
