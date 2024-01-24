// preparing args list for processing,
// it helps for args that have multiple values
export const prepareArgsList = (argsList: string[]) =>
  argsList.reduce((pV: any, cV: any, i: number) => {
    // Retrieve the last processed value
    const lastValue = pV[pV.length - 1];

    // If there is no last value, simply add the current value to the processed list
    if (!lastValue) {
      return [...pV, cV];
    }

    // If the last value is an array, and the current value does not start with "--"
    if (Array.isArray(lastValue)) {
      if (!cV.startsWith("--")) {
        // Append the current value to the last array in the processed list
        return [...pV.slice(0, -1), [...lastValue, cV]];
      } else {
        // If the current value starts with "--", add it as a separate value in the processed list
        return [...pV, cV];
      }
    } else if (!lastValue.startsWith("--") && !cV.startsWith("--")) {
      // If both the last and current values do not start with "--",
      // combine them into a new array in the processed list
      return [...pV.slice(0, -1), [lastValue, cV]];
    } else {
      // If none of the above conditions match, add the current value as a separate value in the processed list
      return [...pV, cV];
    }
  }, []);
