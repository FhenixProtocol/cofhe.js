import { getTfhe } from "./tfhe-wrapper";

export const createTfheKeypair = () => {
  const tfhe = getTfhe();
  // const block_params = new ShortintParameters(
  //   ShortintParametersName.PARAM_MESSAGE_2_CARRY_2_COMPACT_PK_PBS_KS,
  // );
  const config = tfhe.TfheConfigBuilder.default()
    //..(block_params)
    .build();
  const clientKey = tfhe.TfheClientKey.generate(config);
  let publicKey = tfhe.TfheCompactPublicKey.new(clientKey);
  publicKey = tfhe.TfheCompactPublicKey.deserialize(publicKey.serialize());
  return { clientKey, publicKey };
};

export const createTfhePublicKey = () => {
  const { publicKey } = createTfheKeypair();
  return toHexString(publicKey.serialize());
};

export const toHexString = (bytes: Uint8Array) =>
  bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, "0"), "");
