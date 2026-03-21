import { toZonedTime } from 'date-fns-tz';
import { isToday, format } from 'date-fns';

export interface TimeSlot {
  value: string;
  label: string;
  period: 'morning' | 'afternoon' | 'evening';
  isPast?: boolean;
}

export interface TimeSlotWithAvailability extends TimeSlot {
  unavailableReason?: 'past' | 'preparation' | 'blocked';
}

export interface BlockedSlot {
  block_date: string;
  time_slot: string | null;
}

export interface RawBlockedSlot {
  block_date: string;
  time_slot: string | null;
  block_type?: string | null;
  block_start?: string | null;
  block_end?: string | null;
  duration_hours?: number | null;
  fulfillment_type?: string | null;
  block_severity?: string | null;
}

// Kuwait timezone constant (UTC+3, same as Qatar)
const KUWAIT_TIMEZONE = 'Asia/Kuwait';

/**
 * Get current time in local timezone
 */
export const getCurrentLocalTime = (): Date => {
  return toZonedTime(new Date(), KUWAIT_TIMEZONE);
};

// Backward-compatible alias
export const getCurrentDohaTime = getCurrentLocalTime;

/**
 * Check if the store is currently closed based on time_slot_blocks
 */
export const isStoreCurrentlyClosed = (rawBlocks: RawBlockedSlot[]): boolean => {
  const localTime = getCurrentLocalTime();
  const today = format(localTime, 'yyyy-MM-dd');
  
  return rawBlocks.some(block => {
    if (block.block_severity !== 'closed') return false;
    
    if (block.block_type === 'duration' && block.block_start && block.block_end) {
      const blockStart = new Date(block.block_start);
      const blockEnd = new Date(block.block_end);
      const blockStartLocal = toZonedTime(blockStart, KUWAIT_TIMEZONE);
      const blockEndLocal = toZonedTime(blockEnd, KUWAIT_TIMEZONE);
      return localTime >= blockStartLocal && localTime <= blockEndLocal;
    }
    
    return block.block_date === today && block.time_slot === null;
  });
};

/**
 * Expand raw blocked slots from database into individual date/time slot pairs.
 */
export const expandBlockedSlots = (rawBlocks: RawBlockedSlot[], fulfillmentType?: 'delivery' | 'pickup'): BlockedSlot[] => {
  const expandedBlocks: BlockedSlot[] = [];
  const timeSlots = generateTimeSlots();
  
  rawBlocks.forEach(block => {
    if (fulfillmentType && block.fulfillment_type && block.fulfillment_type !== 'both' && block.fulfillment_type !== fulfillmentType) {
      return;
    }
    
    if (block.block_type === 'duration' && block.block_start && block.block_end) {
      const blockStart = new Date(block.block_start);
      const blockEnd = new Date(block.block_end);
      
      const blockStartLocal = toZonedTime(blockStart, KUWAIT_TIMEZONE);
      const blockEndLocal = toZonedTime(blockEnd, KUWAIT_TIMEZONE);
      
      let currentDate = new Date(blockStartLocal);
      currentDate.setHours(0, 0, 0, 0);
      
      const endDateNormalized = new Date(blockEndLocal);
      endDateNormalized.setHours(23, 59, 59, 999);
      
      while (currentDate <= endDateNormalized) {
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        
        timeSlots.forEach(slot => {
          const slotStartHour = parseInt(slot.value.split('-')[0].split(':')[0], 10);
          const slotEndHour = parseInt(slot.value.split('-')[1].split(':')[0], 10);
          
          const slotStart = new Date(currentDate);
          slotStart.setHours(slotStartHour, 0, 0, 0);
          
          const slotEnd = new Date(currentDate);
          slotEnd.setHours(slotEndHour, 0, 0, 0);
          
          if (slotEnd > blockStartLocal && slotStart < blockEndLocal) {
            expandedBlocks.push({
              block_date: dateStr,
              time_slot: slot.value
            });
          }
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
    } else {
      expandedBlocks.push({
        block_date: block.block_date,
        time_slot: block.time_slot
      });
    }
  });
  
  return expandedBlocks;
};


const getSlotEndHour = (slotValue: string): number => {
  const endTime = slotValue.split('-')[1];
  return parseInt(endTime.split(':')[0], 10);
};

const getSlotStartHour = (slotValue: string): number => {
  const startTime = slotValue.split('-')[0];
  return parseInt(startTime.split(':')[0], 10);
};

export const isTimeSlotPast = (slotValue: string, selectedDate: Date): boolean => {
  const localTime = getCurrentLocalTime();
  const selectedDateLocal = toZonedTime(selectedDate, KUWAIT_TIMEZONE);
  
  if (!isToday(selectedDateLocal)) {
    return false;
  }
  
  const currentHour = localTime.getHours();
  const slotEndHour = getSlotEndHour(slotValue);
  
  return currentHour >= slotEndHour;
};

export const isSlotUnavailableDueToPreparation = (
  slotValue: string, 
  selectedDate: Date, 
  preparationMinutes: number,
  deliveryMinutes: number = 0
): boolean => {
  const localTime = getCurrentLocalTime();
  
  const totalLeadTimeMinutes = preparationMinutes + deliveryMinutes;
  const readyTime = new Date(localTime.getTime() + totalLeadTimeMinutes * 60 * 1000);
  
  const selectedDateLocal = toZonedTime(selectedDate, KUWAIT_TIMEZONE);
  const slotEndHour = getSlotEndHour(slotValue);
  const slotEndTime = new Date(selectedDateLocal);
  slotEndTime.setHours(slotEndHour, 0, 0, 0);
  
  const MINIMUM_BUFFER_MINUTES = 15;
  const bufferMinutes = (slotEndTime.getTime() - readyTime.getTime()) / (60 * 1000);
  
  return bufferMinutes < MINIMUM_BUFFER_MINUTES;
};

export const isSlotBlockedByStaff = (
  slotValue: string,
  selectedDate: Date,
  blockedSlots: BlockedSlot[] = []
): boolean => {
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  
  return blockedSlots.some(block => {
    if (block.block_date !== dateStr) return false;
    return block.time_slot === null || block.time_slot === slotValue;
  });
};

export const generateTimeSlots = (): TimeSlot[] => {
  return [
    { value: '09:00-12:00', label: '09:00 AM - 12:00 PM', period: 'morning' },
    { value: '12:00-15:00', label: '12:00 PM - 03:00 PM', period: 'afternoon' },
    { value: '15:00-18:00', label: '03:00 PM - 06:00 PM', period: 'afternoon' },
    { value: '18:00-21:00', label: '06:00 PM - 09:00 PM', period: 'evening' },
    { value: '21:00-23:00', label: '09:00 PM - 11:00 PM', period: 'evening' }
  ];
};

export const generateTimeSlotsWithStatus = (
  selectedDate?: Date, 
  preparationMinutes: number = 0,
  deliveryMinutes: number = 0,
  blockedSlots: BlockedSlot[] = []
): TimeSlotWithAvailability[] => {
  const baseSlots = generateTimeSlots();
  
  if (!selectedDate) {
    return baseSlots;
  }
  
  return baseSlots.map(slot => {
    const isBlocked = isSlotBlockedByStaff(slot.value, selectedDate, blockedSlots);
    if (isBlocked) {
      return { ...slot, isPast: true, unavailableReason: 'blocked' as const };
    }
    
    const isPast = isTimeSlotPast(slot.value, selectedDate);
    const unavailableDueToPrep = !isPast && isSlotUnavailableDueToPreparation(
      slot.value, selectedDate, preparationMinutes, deliveryMinutes
    );
    
    return {
      ...slot,
      isPast: isPast || unavailableDueToPrep,
      unavailableReason: isPast ? 'past' : unavailableDueToPrep ? 'preparation' : undefined
    };
  });
};

export const isDateFullyUnavailable = (
  date: Date,
  preparationMinutes: number = 0,
  deliveryMinutes: number = 0,
  blockedSlots: BlockedSlot[] = []
): boolean => {
  const slots = generateTimeSlotsWithStatus(date, preparationMinutes, deliveryMinutes, blockedSlots);
  return slots.every(slot => slot.isPast);
};

export const getPopularTimeSlots = (): string[] => {
  return ['10:00', '14:00', '16:00', '18:00', '20:00'];
};
