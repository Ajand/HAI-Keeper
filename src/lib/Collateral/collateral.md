# Collateral Module Documentation

## Table of Contents

1. [Introduction](#introduction)
2. [Collateral Class](#collateral-class)
3. [ICollateralFetcher Interface](#icollateralfetcher-interface)
4. [GebCollateralFetcher](#gebcollateralfetcher)
5. [Collateral Factory Pattern](#collateral-factory-pattern)
6. [Usage Examples](#usage-examples)
7. [Extending the Module](#extending-the-module)
8. [Error Handling and Logging](#error-handling-and-logging)

## Introduction

The Collateral module is a crucial component in a flexible DeFi keeper system, focusing on liquidation of Safes for the GEB framework (the foundation of the RAI stablecoin). This module is responsible for handling collateral data and is utilized by other modules, such as the Safe module.

## Collateral Class

The `Collateral` class represents a collateral in the keeper system. It encapsulates the logic for initializing, updating, and retrieving collateral information.

### Key Features

- Initialization with token data and a collateral fetcher
- Asynchronous initialization and update methods
- Retrieval of normalized collateral information
- Access to raw collateral parameters and data

### Class Structure

```typescript
export class Collateral {
  constructor(
    public readonly tokenData: TokenData,
    private readonly fetcher: ICollateralFetcher,
    private readonly log: ILogger
  ) {}

  public async init(): Promise<void> {
    /* ... */
  }
  public async updateInfo(): Promise<void> {
    /* ... */
  }
  public getNormalizedInfo(): Record<string, string> {
    /* ... */
  }
  public getParams(): CollateralParams {
    /* ... */
  }
  public getData(): CollateralData {
    /* ... */
  }
}
```

## ICollateralFetcher Interface

The `ICollateralFetcher` interface defines the contract for classes that fetch collateral information:

```typescript
export interface ICollateralFetcher {
  fetchParams(tokenBytes32: string): Promise<CollateralParams>;
  fetchData(tokenBytes32: string): Promise<CollateralData>;
}
```

## GebCollateralFetcher

The `GebCollateralFetcher` is an implementation of `ICollateralFetcher` specifically for the GEB framework:

```typescript
export class GebCollateralFetcher implements ICollateralFetcher {
  constructor(private geb: Geb) {}

  async fetchParams(tokenBytes32: string): Promise<CollateralParams> {
    /* ... */
  }
  async fetchData(tokenBytes32: string): Promise<CollateralData> {
    /* ... */
  }
}
```

## Collateral Factory Pattern

The module uses the Factory pattern to create `Collateral` instances and `ICollateralFetcher` implementations. This pattern allows for easy extension and flexibility in creating different types of collateral fetchers.

### CollateralFetcherFactory

```typescript
export interface CollateralFetcherFactory {
  createFetcher(): ICollateralFetcher;
}

export class GebCollateralFetcherFactory implements CollateralFetcherFactory {
  constructor(private geb: Geb) {}
  createFetcher(): ICollateralFetcher {
    /* ... */
  }
}
```

### CollateralFactory

```typescript
export class CollateralFactory {
  constructor(
    private fetcherFactory: CollateralFetcherFactory,
    private logger: ILogger
  ) {}

  createCollateral(tokenData: TokenData): Collateral {
    /* ... */
  }
}
```

## Usage Examples

### Creating and Initializing a Collateral Instance

```typescript
import { Geb, TokenData } from "@hai-on-op/sdk";
import {
  CollateralFactory,
  GebCollateralFetcherFactory,
  CollateralFetcherType,
} from "./collateral-factory";
import { ConsoleLogger } from "./logger";

// Initialize Geb SDK
const geb = new Geb(/* ... */);

// Create token data
const tokenData: TokenData = {
  address: "0x...",
  symbol: "ETH",
  name: "Ethereum",
  decimals: 18,
  bytes32String: "0x...",
};

// Create logger
const logger = new ConsoleLogger();

// Create collateral fetcher factory
const fetcherFactory = createCollateralFetcherFactory(
  CollateralFetcherType.GEB,
  geb
);

// Create collateral factory
const collateralFactory = new CollateralFactory(fetcherFactory, logger);

// Create and initialize collateral
const collateral = collateralFactory.createCollateral(tokenData);
await collateral.init();

// Use collateral
const normalizedInfo = collateral.getNormalizedInfo();
console.log("Normalized Collateral Info:", normalizedInfo);
```

### Updating Collateral Information

```typescript
// Periodically update collateral information
setInterval(async () => {
  await collateral.updateInfo();
  console.log("Updated Collateral Info:", collateral.getNormalizedInfo());
}, 60000); // Update every minute
```

## Extending the Module

To extend the module for new types of `ICollateralFetcher`, follow these steps:

1. Implement the new fetcher:

```typescript
export class NewCollateralFetcher implements ICollateralFetcher {
  constructor(private dataSource: any) {}

  async fetchParams(tokenBytes32: string): Promise<CollateralParams> {
    // Implement fetching logic
  }

  async fetchData(tokenBytes32: string): Promise<CollateralData> {
    // Implement fetching logic
  }
}
```

2. Create a new factory for the fetcher:

```typescript
export class NewCollateralFetcherFactory implements CollateralFetcherFactory {
  constructor(private dataSource: any) {}

  createFetcher(): ICollateralFetcher {
    return new NewCollateralFetcher(this.dataSource);
  }
}
```

3. Update the `CollateralFetcherType` enum and `createCollateralFetcherFactory` function:

```typescript
export enum CollateralFetcherType {
  GEB = "GEB",
  NEW = "NEW",
}

export function createCollateralFetcherFactory(
  type: CollateralFetcherType,
  geb: Geb,
  dataSource?: any
): CollateralFetcherFactory {
  switch (type) {
    case CollateralFetcherType.GEB:
      return new GebCollateralFetcherFactory(geb);
    case CollateralFetcherType.NEW:
      return new NewCollateralFetcherFactory(dataSource);
    default:
      throw new Error(`Unsupported collateral fetcher type: ${type}`);
  }
}
```

4. Use the new fetcher type:

```typescript
const fetcherFactory = createCollateralFetcherFactory(
  CollateralFetcherType.NEW,
  null,
  newDataSource
);
const collateralFactory = new CollateralFactory(fetcherFactory, logger);
```

## Error Handling and Logging

The Collateral module uses a logger interface for debugging and error reporting:

```typescript
export interface ILogger {
  debug(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}
```

Implement this interface to create custom loggers. For example:

```typescript
export class ConsoleLogger implements ILogger {
  debug(message: string, ...args: any[]): void {
    console.log(`[DEBUG] ${message}`, ...args);
  }

  error(message: string, ...args: any[]): void {
    console.error(`[ERROR] ${message}`, ...args);
  }
}
```

The Collateral class uses this logger for reporting initialization and update errors, as well as for debugging information.
