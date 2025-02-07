import { Primitive, LiteralToPrimitive } from "type-fest";
import { FheAllUTypes } from "./base";
import {
  CoFheInBool,
  CoFheEncryptedUint8,
  CoFheInUint16,
  CoFheInUint32,
  CoFheInUint64,
  CoFheInUint128,
  CoFheInUint256,
} from "./encrypted";
import { FheTypes } from "tfhe";

export type EncryptableBool = {
  data: boolean;
  securityZone?: number;
  utype: FheTypes.Bool;
};
export type EncryptableUint8 = {
  data: string | bigint;
  securityZone?: number;
  utype: FheTypes.Uint8;
};
export type EncryptableUint16 = {
  data: string | bigint;
  securityZone?: number;
  utype: FheTypes.Uint16;
};
export type EncryptableUint32 = {
  data: string | bigint;
  securityZone?: number;
  utype: FheTypes.Uint32;
};
export type EncryptableUint64 = {
  data: string | bigint;
  securityZone?: number;
  utype: FheTypes.Uint64;
};
export type EncryptableUint128 = {
  data: string | bigint;
  securityZone?: number;
  utype: FheTypes.Uint128;
};
export type EncryptableUint256 = {
  data: string | bigint;
  securityZone?: number;
  utype: FheTypes.Uint256;
};

export const Encryptable = {
  bool: (data: EncryptableBool["data"], securityZone = 0) =>
    ({ data, securityZone, utype: FheTypes.Bool }) as EncryptableBool,
  uint8: (data: EncryptableUint8["data"], securityZone = 0) =>
    ({ data, securityZone, utype: FheTypes.Uint8 }) as EncryptableUint8,
  uint16: (data: EncryptableUint16["data"], securityZone = 0) =>
    ({ data, securityZone, utype: FheTypes.Uint16 }) as EncryptableUint16,
  uint32: (data: EncryptableUint32["data"], securityZone = 0) =>
    ({ data, securityZone, utype: FheTypes.Uint32 }) as EncryptableUint32,
  uint64: (data: EncryptableUint64["data"], securityZone = 0) =>
    ({ data, securityZone, utype: FheTypes.Uint64 }) as EncryptableUint64,
  uint128: (data: EncryptableUint128["data"], securityZone = 0) =>
    ({ data, securityZone, utype: FheTypes.Uint128 }) as EncryptableUint128,
  uint256: (data: EncryptableUint256["data"], securityZone = 0) =>
    ({ data, securityZone, utype: FheTypes.Uint256 }) as EncryptableUint256,
} as const;

export type EncryptableItem =
  | EncryptableBool
  | EncryptableUint8
  | EncryptableUint16
  | EncryptableUint32
  | EncryptableUint64
  | EncryptableUint128
  | EncryptableUint256;

// COFHE Encrypt
export type CoFheEncryptedItemMap<E extends EncryptableItem> =
  E extends EncryptableBool
    ? CoFheInBool
    : E extends EncryptableUint8
      ? CoFheEncryptedUint8
      : E extends EncryptableUint16
        ? CoFheInUint16
        : E extends EncryptableUint32
          ? CoFheInUint32
          : E extends EncryptableUint64
            ? CoFheInUint64
            : E extends EncryptableUint128
              ? CoFheInUint128
              : E extends EncryptableUint256
                ? CoFheInUint256
                : never;

// export type MappedCoFheEncryptedTypes<T> = T extends "permission"
//   ? PermissionV2
//   : T extends Primitive
//     ? LiteralToPrimitive<T>
//     : T extends EncryptableItem
//       ? CoFheEncryptedItemMap<T>
//       : {
//           [K in keyof T]: MappedCoFheEncryptedTypes<T[K]>;
//         };

export type MappedCoFheEncryptedTypes<T> = T extends Primitive
  ? LiteralToPrimitive<T>
  : T extends EncryptableItem
    ? CoFheEncryptedItemMap<T>
    : {
        [K in keyof T]: MappedCoFheEncryptedTypes<T[K]>;
      };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isEncryptableItem(value: any): value is EncryptableItem {
  return (
    typeof value === "object" &&
    value !== null &&
    ["string", "number", "bigint", "boolean"].includes(typeof value.data) &&
    typeof value.securityZone === "number" &&
    FheAllUTypes.includes(value.utype)
  );
}
