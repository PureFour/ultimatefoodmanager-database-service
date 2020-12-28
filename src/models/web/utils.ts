import * as joi from 'joi';

export const positiveNumber = joi.number().positive().allow(0);