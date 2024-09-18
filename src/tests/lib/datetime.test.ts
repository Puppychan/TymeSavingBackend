
import { addHours, subHours } from 'date-fns';
import { localDate, handleDateFromFE } from 'src/lib/datetime';

describe('datetime', () => {
  it('should add timezone offset to a date', () => {
    const originalDate = new Date('2024-09-06T00:00:00Z');
    const expectedDate = new Date('2024-09-06T07:00:00Z');

    const result = localDate(originalDate);

    expect(result).toEqual(expectedDate);
  });

  it('should subtract timezone offset from a date', () => {
    const originalDate = new Date('2024-09-06T07:00:00Z');
    const expectedDate = new Date('2024-09-06T00:00:00Z');

    const result = handleDateFromFE(originalDate);

    expect(result).toEqual(expectedDate);
  });
});