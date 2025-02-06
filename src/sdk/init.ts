import init, { init_panic_hook, InitOutput } from "tfhe";

export let tfheInstance: InitOutput;

export const initTfhe: () => Promise<void> = async () => {
  try {
    if (tfheInstance != null) return;
    tfheInstance = await init();
    await init_panic_hook();
  } catch (err) {
    throw new Error(`Error initializing TFHE ${err}`);
  }
};
