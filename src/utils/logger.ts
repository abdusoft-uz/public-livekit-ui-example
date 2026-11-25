/**
 * Development-only logger. console.log noise is removed from production builds;
 * warnings and errors still go through console.warn / console.error.
 */
export const debug: (...args: unknown[]) => void =
  process.env.NODE_ENV === "production"
    ? () => {}
    : (...args) => console.log(...args);
