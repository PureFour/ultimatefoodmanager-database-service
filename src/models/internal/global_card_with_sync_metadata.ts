import { ProductCard } from '../web/product/product-card';
import { GlobalCardSynchronizationMetadata } from './global-card-synchronization-metadata';

export interface GlobalCardWithSyncMetadata {
	globalProductCard: ProductCard;
	syncMetadata: GlobalCardSynchronizationMetadata;
}
