import { Metadata } from '../web/product/metadata';

export interface AssociatedProduct {
	uuid: string;
	quantity: number;
	metadata: Metadata;
}
