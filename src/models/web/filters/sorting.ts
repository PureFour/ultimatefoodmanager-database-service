import * as joi from 'joi';
import { Selector } from './selector';

export class SortingModel implements Foxx.Model {

	schema = joi.object().keys({
		selector: joi.string(),
		ascending: joi.boolean()
	});
}

export interface Sorting {
	selector: Selector;
	ascending: boolean;
}
