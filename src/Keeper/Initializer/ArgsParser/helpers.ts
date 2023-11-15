// preparing args list for processing,
// it helps for args that have multiple values
export const prepareArgsList = (argsList: string[]) =>
  argsList.reduce((pV: any, cV: any, i: number) => {
    const lastValue = pV[pV.length - 1];
    if (!lastValue) {
      return [...pV, cV];
    }
    if (Array.isArray(lastValue)) {
      if (!cV.startsWith("--")) {
        return [...pV.slice(0, -1), [...lastValue, cV]];
      } else {
        return [...pV, cV];
      }
    } else if (!lastValue.startsWith("--") && !cV.startsWith("--")) {
      return [...pV.slice(0, -1), [lastValue, cV]];
    } else {
      return [...pV, cV];
    }
  }, []);
