/** Dev-only. Production builds replace `import.meta.env.DEV` with false. */
export const isGachaTestSpinEnabled =
  import.meta.env.DEV === true && import.meta.env.VITE_ENABLE_GACHA_TEST_SPIN === 'true';
