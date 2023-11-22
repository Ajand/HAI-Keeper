import { KeyValue } from "../../src/types";

export const keyValueArgsToList = (keyValue: KeyValue) => {
  return Object.entries(keyValue).reduce((pV: string[], cV) => {
    if (typeof cV[1] === "boolean") {
      if (cV[1] === true) {
        return [...pV, cV[0]];
      } else {
        return [...pV];
      }
    } else if (Array.isArray(cV[1])) {
      return [...pV, cV[0], ...cV[1]];
    } else {
      return [...pV, cV[0], cV[1]];
    }
  }, []);
};
