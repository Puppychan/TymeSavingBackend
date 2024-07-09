import {addHours } from 'date-fns';

// usage: localDate(someDate)
export const localDate = (date: Date) => {
    const timezoneOffset = 7;
    return addHours(date, timezoneOffset);
}
