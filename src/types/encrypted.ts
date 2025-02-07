import { FheTypes } from "tfhe";

export type EncryptedNumber = {
  data: Uint8Array;
  securityZone: number;
};

export interface EncryptedBool extends EncryptedNumber {}
export interface EncryptedUint8 extends EncryptedNumber {}
export interface EncryptedUint16 extends EncryptedNumber {}
export interface EncryptedUint32 extends EncryptedNumber {}
export interface EncryptedUint64 extends EncryptedNumber {}
export interface EncryptedUint128 extends EncryptedNumber {}
export interface EncryptedUint256 extends EncryptedNumber {}
export interface EncryptedAddress extends EncryptedNumber {}

export type CoFheEncryptedNumber = {
  securityZone: number;
  hash: bigint;
  signature: string;
  utype: FheTypes;
};
export type CoFheEncryptedBool = CoFheEncryptedNumber & {
  utype: FheTypes.Bool;
};
export type CoFheEncryptedUint8 = CoFheEncryptedNumber & {
  utype: FheTypes.Uint8;
};
export type CoFheEncryptedUint16 = CoFheEncryptedNumber & {
  utype: FheTypes.Uint16;
};
export type CoFheEncryptedUint32 = CoFheEncryptedNumber & {
  utype: FheTypes.Uint32;
};
export type CoFheEncryptedUint64 = CoFheEncryptedNumber & {
  utype: FheTypes.Uint64;
};
export type CoFheEncryptedUint128 = CoFheEncryptedNumber & {
  utype: FheTypes.Uint128;
};
export type CoFheEncryptedUint256 = CoFheEncryptedNumber & {
  utype: FheTypes.Uint256;
};
