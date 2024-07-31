// Define the base FlashSwapStrategy interface
export interface FlashSwapStrategy {
  liquidateAndSettleSafe(safe: string): Promise<void>;
}
