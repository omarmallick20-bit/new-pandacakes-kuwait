import { addDays, format, isSameDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { isDateFullyUnavailable, BlockedSlot } from './timeSlots';

/**
 * Format preparation time in a human-readable way
 * - Less than 60 mins: "X mins"
 * - 60+ mins: "X hour(s)" or "Xh Ym" for mixed
 */
export const formatPreparationTime = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} mins`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  if (remainingMins === 0) {
    return hours === 1 ? `${hours} hour` : `${hours} hours`;
  }
  return `${hours}h ${remainingMins}m`;
};

const DOHA_TIMEZONE = 'Asia/Qatar';

export interface DateOption {
  date: Date;
  label: string; // "Today", "Tomorrow", or day name like "Saturday"
  dateDisplay: string; // "Oct 19" format
  isToday: boolean;
  isTomorrow: boolean;
  isUnavailable?: boolean; // true if all time slots are unavailable
}

/**
 * Generate 7 days starting from today in Doha timezone
 * Optionally marks dates as unavailable based on preparation time, delivery time, and blocked slots
 */
export const generateDateOptions = (
  preparationMinutes: number = 0,
  deliveryMinutes: number = 0,
  blockedSlots: BlockedSlot[] = []
): DateOption[] => {
  const dohaToday = toZonedTime(new Date(), DOHA_TIMEZONE);
  const dateOptions: DateOption[] = [];

  for (let i = 0; i < 5; i++) {
    const date = addDays(dohaToday, i);
    const isToday = i === 0;
    const isTomorrow = i === 1;

    let label: string;
    if (isToday) {
      label = 'Today';
    } else if (isTomorrow) {
      label = 'Tomorrow';
    } else {
      label = format(date, 'EEEE'); // Full day name: "Saturday"
    }

    // Check if this date has any available time slots
    const isUnavailable = isDateFullyUnavailable(
      date,
      preparationMinutes,
      deliveryMinutes,
      blockedSlots
    );

    dateOptions.push({
      date,
      label,
      dateDisplay: format(date, 'MMM d'), // "Oct 19"
      isToday,
      isTomorrow,
      isUnavailable
    });
  }

  return dateOptions;
};
