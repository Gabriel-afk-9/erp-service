export interface ListUnitsOutput {
  units: Array<{
    unitId: string;
    symbol: string;
    name: string;
    decimalPlaces: number;
    quantityIncrement: number;
    isActive: boolean;
  }>;
}
