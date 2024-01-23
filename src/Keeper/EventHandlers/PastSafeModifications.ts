import { ethers } from "ethers";
import { Geb } from "@hai-on-op/sdk";

interface EventFetchingInfra {
  geb: Geb;
  provider: ethers.providers.JsonRpcProvider;
}

// Extend the LogWithDescription interface to include Log interface properties
interface LogWithDescription
  extends ethers.utils.LogDescription,
    ethers.providers.Log {}

/**
 * Retrieves historical events related to changes in the collateralization of Ethereum safes.
 *
 * @param {EventFetchingInfra} param0 - The infrastructure configuration including a `Geb` instance and an Ethereum provider.
 * @returns {Function} - A function that takes parameters for the block range, collateral type, and optional chunk size, and returns an array of unique logs describing modifications to safes' collateralization.
 *
 * @property {Geb} geb - The `Geb` instance.
 * @property {ethers.providers.JsonRpcProvider} provider - The Ethereum provider.
 *
 *
 * @function
 * @name getPastSafeModifications
 *
 * @param {number} from - The starting block number for querying events.
 * @param {number} to - The ending block number for querying events.
 * @param {string} collateral - The type of collateral associated with the safes.
 * @param {number} [chunk=2000] - Optional parameter specifying the chunk size for efficient data retrieval.
 *
 * @returns {Promise<Array<LogWithDescription>>} - A promise that resolves to an array of unique logs describing modifications to safes' collateralization during the specified block range.
 *
 * @example
 * const infra = { geb: myGebInstance, provider: myEthereumProvider };
 * const logs = await getPastSafeModifications(infra)(1000000, 1000100, 'ETH', 500);
 *
 *
 *  * @description
 * **What:**
 * The `getPastSafeModifications` function retrieves historical events related to changes in the collateralization of Ethereum safes. It takes input parameters such as the infrastructure configuration (including a `Geb` instance and an Ethereum provider), the block range to query, the collateral type, and an optional chunk size for efficient data retrieval. The primary purpose is to gather and return an array of unique logs describing modifications to safes' collateralization during the specified block range.
 *
 * **How:**
 * The function iterates over the designated block range in chunks, using Ethereum event filters to identify relevant logs associated with safe modifications. It employs an Ethereum interface (`iface`) for parsing these logs and extracting specific details. To prevent duplicates, the function maintains a set (`hashStore`) of unique log hashes. The logs, along with their descriptions, are accumulated in the `retval` array. The process is logged at each step to provide insights into the function's progress. Overall, the function serves as a useful utility for efficiently querying and organizing past events related to safe collateralization on the Ethereum blockchain.
 */
export const getPastSafeModifications =
  ({ geb, provider }: EventFetchingInfra) =>
  async (
    from: number,
    to: number,
    collateral: string,
    chunk: number = 2000
  ) => {
    // TODO: Add presistent caching for logs

    console.debug(
      `Consumer requested safe modification data from block ${from} to ${to}`
    );

    // Initialize variables for iteration
    let start = from;
    let end: null | number = null;
    let chunks_queried = 0;

    // Array to store fetched logs with descriptions
    const retval: Array<LogWithDescription> = [];

    // Set to store unique log hashes and avoid duplicates
    const hashStore = new Set();

    // Iterate over blocks in chunks
    while (end === null || start <= to) {
      end = Math.min(to, start + chunk);
      chunks_queried += 1;

      console.debug(
        `Querying safe modifications from block ${start} to ${end} (${
          end - start
        } blocks) \naccumulated ${retval.length} safe modification in ${
          chunks_queried - 1
        } requests`
      );

      // Fetch logs from the specified range
      const logs = await provider.getLogs({
        ...geb.contracts.safeEngine.filters[
          "ModifySAFECollateralization(bytes32,address,address,address,int256,int256)"
        ](),
        fromBlock: start,
        toBlock: end,
      });

      // Define the event interface for parsing logs
      let iface = new ethers.utils.Interface([
        `
        event ModifySAFECollateralization(
            bytes32 indexed _cType,
            address indexed _safe,
            address _collateralSource,
            address _debtDestination,
            int256 _deltaCollateral,
            int256 _deltaDebt
        );
        `,
      ]);

      console.debug(
        `Found ${logs.length} total logs from block ${start} to ${end}`
      );

      // Process each log, add to retval if it's not a duplicate
      logs.forEach((log) => {
        const logHash = ethers.utils.keccak256(
          ethers.utils.toUtf8Bytes(JSON.stringify(log))
        );
        if (!hashStore.has(logHash)) {
          retval.push({ ...log, ...iface.parseLog(log) });
          hashStore.add(logHash);
        }
      });

      // Move to the next chunk
      start += chunk;
    }

    // Return the accumulated logs
    return retval;
  };
