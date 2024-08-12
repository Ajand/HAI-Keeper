# Safe Modules Documentation (DeFi Keeper System for GEB/RAI)

## Table of Contents

1. [Introduction](#introduction)
2. [Safe Class](#safe-class)
3. [SafeFactory Class](#safefactory-class)
4. [GebSafeProvider Class](#gebsafeprovider-class)
5. [Interfaces and Types](#interfaces-and-types)
6. [Usage Examples](#usage-examples)
7. [Error Handling and Logging](#error-handling-and-logging)

## Introduction

The Safe modules are a crucial component in a flexible DeFi keeper system, focusing on liquidation of Safes for the GEB framework (the foundation of the RAI stablecoin). The primary focus of these modules is to efficiently track the state of existing Safes and execute liquidations when necessary, contributing to the stability and functionality of the RAI ecosystem.

## Safe Class

The `Safe` class represents an existing Safe (collateralized debt position) within the GEB framework that can be monitored and potentially liquidated by the keeper system.

### Key Features

- Initialization with existing Safe information
- Updating Safe information
- Checking if a Safe is in a critical state
- Liquidation of Safes

### Class Structure

```typescript
export class Safe {
  constructor(
    private safeProvider: ISafeProvider,
    private logger: ILogger,
    public readonly address: string,
    public readonly collateral: Collateral,
    public readonly flashSwapStrategy?: FlashSwapStrategy
  ) {}

  async init(): Promise<void> {
    /* ... */
  }
  async updateInfo(): Promise<void> {
    /* ... */
  }
  isCritical(): boolean {
    /* ... */
  }
  canLiquidate(): boolean {
    /* ... */
  }
  async liquidate(): Promise<void> {
    /* ... */
  }
}
```

### Methods

- `init()`: Initializes the Safe by fetching its current information from the GEB system.
- `updateInfo()`: Updates the Safe's information to reflect its current state in the GEB system.
- `isCritical()`: Checks if the Safe is in a critical state (i.e., can be liquidated) based on GEB parameters.
- `canLiquidate()`: Determines if the Safe meets the criteria for liquidation in the GEB framework.
- `liquidate()`: Attempts to liquidate the Safe, potentially using a flash swap strategy if provided.

## SafeFactory Class

The `SafeFactory` class is responsible for creating Safe instances within the keeper system for monitoring and potential liquidation.

### Key Features

- Creation of Safe instances for existing Safes in the GEB system
- Integration with GEB framework
- Support for flash swap liquidation strategies

### Class Structure

```typescript
export class SafeFactory {
  constructor(
    private geb: Geb,
    private provider: ethers.providers.JsonRpcProvider,
    private transactionQueue: TransactionQueue,
    private logger: ILogger,
    private flashSwapStrategy?: FlashSwapStrategy
  ) {
    /* ... */
  }

  createSafe(
    collateral: Collateral,
    safeAddress: string,
    keeperAddress: string
  ): Safe {
    /* ... */
  }
}
```

### Methods

- `createSafe()`: Creates a new Safe instance for an existing Safe in the GEB system, to be monitored by the keeper.

## GebSafeProvider Class

The `GebSafeProvider` class provides functionality to interact with existing Safes in the GEB system, facilitating the keeper's monitoring and liquidation operations.

### Key Features

- Retrieval of Safe information from the GEB system
- Execution of Safe liquidations within the GEB framework

### Class Structure

```typescript
export class GebSafeProvider implements ISafeProvider {
  constructor(private geb: Geb) {}

  async getSafeInfo(
    safeAddress: string,
    collateralType: string
  ): Promise<SafeInfo> {
    /* ... */
  }

  async liquidateSafe(
    safeAddress: string,
    collateralType: string
  ): Promise<ethers.ContractReceipt> {
    /* ... */
  }
}
```

### Methods

- `getSafeInfo()`: Retrieves information about a specific existing Safe from the GEB system.
- `liquidateSafe()`: Executes the liquidation of a specific Safe within the GEB framework.

## Interfaces and Types

### ISafeProvider

```typescript
interface ISafeProvider {
  getSafeInfo(safeAddress: string, collateralType: string): Promise<SafeInfo>;
  liquidateSafe(
    safeAddress: string,
    collateralType: string
  ): Promise<ethers.ContractReceipt>;
}
```

### SafeInfo

```typescript
interface SafeInfo {
  lockedCollateral: ethers.BigNumber;
  generatedDebt: ethers.BigNumber;
}
```

### FlashSwapStrategy

```typescript
interface FlashSwapStrategy {
  liquidateAndSettleSafe(safeAddress: string): Promise<void>;
}
```

## Usage Examples

### Setting Up a Keeper to Monitor a Safe

```typescript
import { Geb } from "@hai-on-op/sdk";
import { ethers } from "ethers";
import { SafeFactory, Collateral, ConsoleLogger, TransactionQueue } from "./your-modules";

// Initialize necessary components for the GEB keeper
const provider = new ethers.providers.JsonRpcProvider("YOUR_RPC_URL");
const geb = new Geb("mainnet", provider);
const logger = new ConsoleLogger();
const transactionQueue = new TransactionQueue(/* ... */);

// Create SafeFactory for the keeper
const safeFactory = new SafeFactory(geb, provider, transactionQueue, logger);

// Create a Safe instance for an existing Safe to be monitored
const collateral: Collateral = /* ... */; // Collateral instance from GEB
const existingSafeAddress = "0x..."; // Address of an existing Safe in GEB
const keeperAddress = "0x..."; // Address of the keeper

const safe = safeFactory.createSafe(collateral, existingSafeAddress, keeperAddress);

// Initialize the Safe (fetch current information from GEB)
await safe.init();

console.log("Safe initialized for monitoring by keeper");
```

### Keeper Monitoring and Liquidating a Safe

```typescript
// Keeper periodically checks the Safe's status
setInterval(async () => {
  await safe.updateInfo();

  if (safe.canLiquidate()) {
    console.log("Safe can be liquidated. Keeper attempting liquidation...");
    try {
      await safe.liquidate();
      console.log("Safe liquidated successfully by keeper");
    } catch (error) {
      console.error("Keeper liquidation attempt failed:", error);
    }
  } else {
    console.log("Safe is not in a critical state, keeper continues monitoring");
  }
}, 60000); // Keeper checks every minute
```

## Error Handling and Logging

The Safe modules use a logger interface for debugging and error reporting within the keeper system:

```typescript
export interface ILogger {
  debug(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
}
```

Implement this interface to create custom loggers for the keeper. For example:

```typescript
export class ConsoleLogger implements ILogger {
  debug(message: string, ...args: any[]): void {
    console.log(`[KEEPER DEBUG] ${message}`, ...args);
  }

  error(message: string, ...args: any[]): void {
    console.error(`[KEEPER ERROR] ${message}`, ...args);
  }

  info(message: string, ...args: any[]): void {
    console.info(`[KEEPER INFO] ${message}`, ...args);
  }
}
```

The Safe class uses this logger for reporting initialization, update, and liquidation events, as well as for debugging information within the keeper system.
