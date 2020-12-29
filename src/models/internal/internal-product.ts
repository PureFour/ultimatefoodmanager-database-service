import { Metadata } from '../web/metadata';
import { AssociatedProduct } from './associated-product';
import { ProductCard } from '../web/product-card';

export interface InternalProduct {
	_key?: string;
	uuid: string;
	productCard: ProductCard;
	quantity: number;
	metadata: Metadata;
	associatedProducts: AssociatedProduct[];
}
