import { Nutriments } from '../web/nutriments';
import { Price } from '../web/price';
import { Metadata } from '../web/metadata';
import { AssociatedProduct } from './associated-product';

export interface InternalProduct {
	uuid: string;
	name: string;
	brand: string;
	photoUrl: string;
	barcode: string;
	category: string;
	price: Price;
	totalQuantity: number;
	quantity: number;
	measurementUnit: string;
	nutriments: Nutriments;
	metadata: Metadata;
	associatedProducts: AssociatedProduct[];
}
