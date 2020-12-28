import { Nutriments } from '../web/nutriments';
import { Price } from '../web/price';
import { Metadata } from '../web/metadata';
import { AssociatedProduct } from './associated-product';

export interface InternalProduct { // TODO wyciągnąć dane i zmienić model na {uuid, data, metadata, associatedProducts}
	_key?: string;
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
