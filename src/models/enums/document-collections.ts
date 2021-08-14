import {Collection} from '../collection';

export const DOCUMENT_COLLECTION = Object.freeze({
	USERS: new Collection('users', [
		{type: 'hash', fields: ['uuid'], unique: true, deduplicate: false}
	]),

	PRODUCTS: new Collection('products', [
		{type: 'hash', fields: ['uuid'], unique: true, deduplicate: false}
	]),

	PRODUCT_CARDS: new Collection('product_cards', [
		{type: 'hash', fields: ['barcode'], unique: true, deduplicate: false}
	]),

	GLOBAL_CARD_SYNC_METADATA: new Collection('global_card_sync_metadata', [
		{type: 'hash', fields: ['barcode'], unique: true, deduplicate: false}
	]),

	CONTAINERS: new Collection('containers', [
		{type: 'hash', fields: ['uuid'], unique: true, deduplicate: false}
	]),

	IMAGES: new Collection('images', [
		{type: 'hash', fields: ['uuid'], unique: true, deduplicate: false}
	])
});

export const ALL_DOCUMENT_COLLECTIONS: Collection[] = Object.values(DOCUMENT_COLLECTION);
