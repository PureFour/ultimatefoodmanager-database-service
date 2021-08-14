import { injectable } from 'inversify';
import { DOCUMENT_COLLECTION } from '../models/enums/document-collections';
import { aql, db } from '@arangodb';
import { AssociatedProduct } from '../models/internal/associated-product';
import { InternalProduct } from '../models/internal/internal-product';
import { Container } from '../models/internal/container';
import { UTILS_SERVICE } from '../services/util-service';
import { ProductCard } from '../models/web/product/product-card';
import { GlobalCardSynchronizationMetadata } from '../models/internal/global-card-synchronization-metadata';
import { GlobalCardWithSyncMetadata } from '../models/internal/global_card_with_sync_metadata';

const productCollection: ArangoDB.Collection = DOCUMENT_COLLECTION.PRODUCTS.collection;
const productCardsCollection: ArangoDB.Collection = DOCUMENT_COLLECTION.PRODUCT_CARDS.collection;
const globalCardSyncMetadataCollection: ArangoDB.Collection = DOCUMENT_COLLECTION.GLOBAL_CARD_SYNC_METADATA.collection;
const containersCollection: ArangoDB.Collection = DOCUMENT_COLLECTION.CONTAINERS.collection;

@injectable()
export class DefaultProductQueries implements ProductQueries {

	public createContainer = (userUuid: string): Container => {
		return db._query(aql`
            INSERT {
            	uuid: ${UTILS_SERVICE.generateUuid()},
            	ownerUuid: ${userUuid},
            	ownerProducts: [],
            	usersUuids: [],
            	sharedProducts: []
            }
            IN ${containersCollection}
            RETURN NEW
      	`).toArray()[0];
	};

	public findContainer = (userUuid: string): Container => {
		return db._query(aql`
           	FOR container IN ${containersCollection}
           	FILTER container.ownerUuid == ${userUuid}
            RETURN container
      	`).toArray()[0];
	};

	public getContainer = (uuid: string): Container => {
		return db._query(aql`
           	FOR container IN ${containersCollection}
           	FILTER container.uuid == ${uuid}
            RETURN container
      	`).toArray()[0];
	};

	public getContainersWithProduct = (productUuid: string): Container => {
		return db._query(aql`
           	FOR container IN ${containersCollection}
           	FILTER POSITION(container.ownerProducts, ${productUuid}) || POSITION(container.sharedProducts, ${productUuid})
            RETURN container
      	`).toArray()[0];
	};

	public updateContainer = (newContainer: Container): void => {
		db._query(aql`
            FOR container IN ${containersCollection}
			FILTER container.uuid == ${newContainer.uuid}
			UPDATE container
			WITH ${newContainer}
			IN ${containersCollection}
      	`);
	};

	public deleteContainer = (containerUuid: string): void => {
		db._query(aql`
            FOR container IN ${containersCollection}
            FILTER container.uuid == ${containerUuid}
            REMOVE container IN ${containersCollection}
      	`);
	};

	public addProduct = (product: InternalProduct, containerUuid: string): InternalProduct => {
		return db._query(aql`
			FOR container IN ${containersCollection}
			FILTER container.uuid == ${containerUuid}
			UPDATE container
			WITH ( ${product.metadata.shared} ? {sharedProducts: PUSH(container.sharedProducts, ${product.uuid})} : {ownerProducts: PUSH(container.ownerProducts, ${product.uuid})} )
			IN ${containersCollection}

            INSERT ${product}
            IN ${productCollection}
            RETURN NEW
      	`).toArray()[0];
	};

	public updateProduct = (newProduct: InternalProduct): void => {
		db._query(aql`
			FOR product IN ${productCollection}
			FILTER product._key == ${newProduct._key}
			UPDATE product
			WITH ${newProduct}
			IN ${productCollection}
      	`);
	};

	public addAssociatedProduct = (productUuid: string, associatedProduct: AssociatedProduct): InternalProduct => {
		return db._query(aql`
            FOR product IN ${productCollection}
            FILTER product.uuid == ${productUuid}
            UPDATE product
            WITH { associatedProducts: PUSH(product.associatedProducts, ${associatedProduct}) }
            IN ${productCollection} OPTIONS { keepNull: false }
			RETURN NEW
      	`).toArray()[0];
	};

	public findProduct = (containerProductsUuids: string[], barcode: string): InternalProduct => {
		return db._query(aql`
            FOR product IN ${productCollection}
            FILTER product.uuid IN ${containerProductsUuids} && product.productCard.barcode == ${barcode}
            RETURN product
      	`).toArray()[0];
	};

	public getProduct = (productUuid: string): InternalProduct => {
		return db._query(aql`
			LET result = (
		    	FOR product IN ${productCollection}
        			RETURN product.uuid == ${productUuid} ? product : FIRST(SORTED_UNIQUE(
            			FOR associatedProduct IN product.associatedProducts
                			FILTER associatedProduct.uuid == ${productUuid}
                			RETURN {
	            	  			uuid: associatedProduct.uuid,
	            				productCard: product.productCard,
	            				quantity: associatedProduct.quantity,
	            				metadata: associatedProduct.metadata
	            	   		}
            		))
			)
			RETURN LAST(SORTED_UNIQUE(result))
      	`).toArray()[0];
	};

	public getFullProduct = (productUuid: string): InternalProduct => {
		return db._query(aql`
			LET result = (
		    	FOR product IN ${productCollection}
        			RETURN DISTINCT product.uuid == ${productUuid} ? product : FIRST(SORTED_UNIQUE(
            			FOR associatedProduct IN product.associatedProducts
                			FILTER associatedProduct.uuid == ${productUuid}
                			RETURN product
            		))
			)
			RETURN LAST(SORTED_UNIQUE(result))
      	`).toArray()[0];
	};

	public getAllOutdatedProducts = (): InternalProduct[] => {
		return db._query(aql`
			LET outdatedRootProducts = (
				FOR product IN ${productCollection}
				FILTER product.metadata.expiryDate <= DATE_ADD(DATE_NOW(), 3, "day")
				RETURN product
			)
			LET outdatedAssociatedProduct = (
				FOR product IN ${productCollection}
				FOR associatedProduct IN product.associatedProducts
				FILTER associatedProduct.metadata.expiryDate <= DATE_ADD(DATE_NOW(), 3, "day")
				RETURN {
            		uuid: associatedProduct.uuid,
            		productCard: product.productCard,
            		quantity: associatedProduct.quantity,
            		metadata: associatedProduct.metadata
            	}
			)
			RETURN FLATTEN(PUSH(outdatedAssociatedProduct, outdatedRootProducts), 2)
      	`).toArray()[0];
	};

	public deleteFullProduct = (productUuid: string, containerUuid: string, shared: boolean): InternalProduct => {
		return db._query(aql`
			FOR container IN ${containersCollection}
			FILTER container.uuid == ${containerUuid}
			UPDATE container
			WITH (${shared} ? { sharedProducts: REMOVE_VALUE(container.sharedProducts, ${productUuid}) } : { ownerProducts: REMOVE_VALUE(container.ownerProducts, ${productUuid}) } )
			IN ${containersCollection}

            FOR product IN ${productCollection}
            FILTER product.uuid == ${productUuid}
            REMOVE product IN ${productCollection}
            LET removed = OLD
            RETURN removed
      	`).toArray()[0];
	};

	public findGlobalProductCard = (barcode: string): ProductCard => {
		return db._query(aql`
            FOR productCard IN ${productCardsCollection}
            FILTER productCard.barcode == ${barcode}
            RETURN UNSET(productCard, "_id", "_rev", "_key")
      	`).toArray()[0];
	};

	public getGlobalCardSyncMetadata = (barcode: string): GlobalCardSynchronizationMetadata => {
		return db._query(aql`
            FOR globalCardSyncMetadata IN ${globalCardSyncMetadataCollection}
            FILTER globalCardSyncMetadata.barcode == ${barcode}
            RETURN UNSET(globalCardSyncMetadata, "_id", "_rev", "_key")
      	`).toArray()[0];
	};

	public addGlobalProductCard = (productCard: ProductCard, globalCardSyncMetadata: GlobalCardSynchronizationMetadata): void => {
		db._query(aql`
            INSERT ${productCard}
            IN ${productCardsCollection}
            INSERT ${globalCardSyncMetadata}
            IN ${globalCardSyncMetadataCollection}
      	`);
	};

	public updateGlobalProductCard = (productCard: ProductCard): void => {
		db._query(aql`
            FOR productCard IN ${productCardsCollection}
			FILTER productCard.barcode == ${productCard.barcode}
			UPDATE productCard
			WITH ${productCard}
			IN ${productCardsCollection}
      	`);
	};

	public updateGlobalCardSyncMetadata = (globalCardSyncMetadata: GlobalCardSynchronizationMetadata): void => {
		db._query(aql`
            FOR globalCardSyncMetadata IN ${globalCardSyncMetadataCollection}
			FILTER globalCardSyncMetadata.barcode == ${globalCardSyncMetadata.barcode}
			UPDATE globalCardSyncMetadata
			WITH ${globalCardSyncMetadata}
			IN ${globalCardSyncMetadataCollection}
      	`);
	};

	public getAllProductCardsWithMetadata = (): GlobalCardWithSyncMetadata[] => {
		return db._query(aql`
            FOR productCard IN ${productCardsCollection}
            RETURN {
         		globalProductCard: UNSET(productCard, "_id", "_rev", "_key"),
         		syncMetadata: FIRST(
         			FOR globalCardSyncMetadata IN ${globalCardSyncMetadataCollection}
         			FILTER globalCardSyncMetadata.barcode == productCard.barcode
         			RETURN UNSET(globalCardSyncMetadata, "_id", "_rev", "_key")
         		)
         	}
      	`).toArray();
	};
}

export interface ProductQueries {
	createContainer: (userUuid: string) => Container;
	findContainer: (userUuid: string) => Container;
	getContainer: (uuid: string) => Container;
	getContainersWithProduct: (productUuid: string) => Container;
	updateContainer: (container: Container) => void;
	deleteContainer: (containerUuid: string) => void;
	addProduct: (product: InternalProduct, containerUuid: string) => InternalProduct;
	updateProduct: (product: InternalProduct) => void;
	addAssociatedProduct: (productUuid: string, associatedProduct: AssociatedProduct) => InternalProduct;
	findProduct: (containerProductsUuids: string[], barcode: string) => InternalProduct;
	getProduct: (productUuid: string) => InternalProduct;
	getFullProduct: (productUuid: string) => InternalProduct;
	getAllOutdatedProducts: () => InternalProduct[];
	deleteFullProduct: (productUuid: string, containerUuid: string, shared: boolean) => InternalProduct;
	findGlobalProductCard: (barcode: string) => ProductCard;
	getGlobalCardSyncMetadata: (barcode: string) => GlobalCardSynchronizationMetadata;
	addGlobalProductCard: (productCard: ProductCard, globalCardSynchronizationMetadata: GlobalCardSynchronizationMetadata) => void;
	updateGlobalProductCard: (productCard: ProductCard) => void;
	updateGlobalCardSyncMetadata: (globalCardSyncMetadata: GlobalCardSynchronizationMetadata) => void;
	getAllProductCardsWithMetadata: () => GlobalCardWithSyncMetadata[];
}