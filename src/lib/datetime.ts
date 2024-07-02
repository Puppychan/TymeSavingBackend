import {addHours } from 'date-fns';


export const localDate = (date: Date) => {
    const timezoneOffset = 7;
    return addHours(date, timezoneOffset);
}