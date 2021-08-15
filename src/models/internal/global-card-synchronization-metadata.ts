import { ValueWithRepetitions } from './value-with-repetitions';

export interface GlobalCardSynchronizationMetadata {
	barcode: string;
	changedFieldsMap: Map<string, ValueWithRepetitions[]>;
}
