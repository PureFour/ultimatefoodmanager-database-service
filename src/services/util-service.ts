import { StatusCodes } from 'http-status-codes';

export const UTILS_SERVICE = {

	generateUuid: (): string => {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
			// tslint:disable-next-line:no-bitwise one-variable-per-declaration
			const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
			return v.toString(16);
		});
	},

	generateDate: (): string => {
		return new Date().toISOString().substring(0, 10);
	},

	areEqualDates: (firstDateString: string, secondDateString: string): boolean => {
		const firstDate: Date = new Date(firstDateString);
		const secondDate: Date = new Date(secondDateString);
		return firstDate.getTime() === secondDate.getTime();
	},

	isBetweenDates: (dateToCompareString: string, firstDateString: string, secondDateString: string): boolean => {
		const dateToCompare: Date = new Date(dateToCompareString);
		const firstDate: Date = new Date(firstDateString);
		const secondDate: Date = new Date(secondDateString);
		return firstDate <= dateToCompare && dateToCompare <= secondDate;
	},

	isBeforeDate: (dateToCompareString: string, secondDateString: string): boolean => {
		const dateToCompare: Date = new Date(dateToCompareString);
		const secondDate: Date = new Date(secondDateString);
		return dateToCompare < secondDate;
	},

	finalize: (res: Foxx.Response, payload: any, status: StatusCodes): void => {
		res.status(status);
		res.send(payload);
	}
};