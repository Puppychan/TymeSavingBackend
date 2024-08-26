import { addHours, subHours } from 'date-fns';

// usage: localDate(someDate)
export const localDate = (date: Date) => {
    const timezoneOffset = 7;
    return addHours(date, timezoneOffset);
}

// usage: handleDateFromFE(someDate)
export const handleDateFromFE = (date: Date) => {
    const timezoneOffset = 7;
    return subHours(date, timezoneOffset);
}
