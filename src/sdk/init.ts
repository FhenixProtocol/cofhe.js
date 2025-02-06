import init, { init_panic_hook, InitOutput } from "tfhe";

let initialized: boolean;

export const initTfhe: () => Promise<void> = async () => {
  try {
    if (initialized) return;
    await init();
    await init_panic_hook();
    initialized = true;
  } catch (err) {
    throw new Error(`Error initializing TFHE ${err}`);
  }
};
