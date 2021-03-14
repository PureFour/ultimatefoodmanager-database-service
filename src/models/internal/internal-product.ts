import { Metadata } from '../web/product/metadata';
import { AssociatedProduct } from './associated-product';
import { ProductCard } from '../web/product/product-card';

export interface InternalProduct {
	_key?: string;
	uuid: string;
	productCard: ProductCard;
	quantity: number;
	metadata: Metadata;
	associatedProducts: AssociatedProduct[];
}
