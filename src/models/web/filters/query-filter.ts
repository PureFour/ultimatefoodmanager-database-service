import * as joi from 'joi';
import { Filter, FilterModel } from './filter';
import { Sorting, SortingModel } from './sorting';
import * as _ from 'lodash';

export class QueryFilterModel implements Foxx.Model {

	schema = joi.object().keys({
		filters: joi.array().items(new FilterModel().schema),
		sorting: new SortingModel().schema
	}).allow(null);

	forClient = (obj) => {
		return _.omit(obj, ['_id', '_key', '_rev']);
	};

	fromClient = (obj) => {
		return _.omit(obj, ['_id', '_key', '_rev']);
	}
}

export interface QueryFilter {
	filters: Filter[];
	sorting: Sorting;
}
