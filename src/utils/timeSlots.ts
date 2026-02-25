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
  block_severity?: string | null; // 'busy' | 'closed'
}

// Doha timezone constant
const DOHA_TIMEZONE = 'Asia/Qatar';

/**
 * Get current time in Doha, Qatar timezone
 */
export const getCurrentDohaTime = (): Date => {
  return toZonedTime(new Date(), DOHA_TIMEZONE);
};

/**
 * Check if the store is currently closed based on time_slot_blocks
 * Returns true if there's an active 'closed' block for today
 */
export const isStoreCurrentlyClosed = (rawBlocks: RawBlockedSlot[]): boolean => {
  const dohaTime = getCurrentDohaTime();
  const today = format(dohaTime, 'yyyy-MM-dd');
  
  return rawBlocks.some(block => {
    if (block.block_severity !== 'closed') return false;
    
    // Check if block applies to today (duration-based)
    if (block.block_type === 'duration' && block.block_start && block.block_end) {
      const blockStart = new Date(block.block_start);
      const blockEnd = new Date(block.block_end);
      // Convert block times to Doha timezone for proper comparison
      const blockStartDoha = toZonedTime(blockStart, DOHA_TIMEZONE);
      const blockEndDoha = toZonedTime(blockEnd, DOHA_TIMEZONE);
      return dohaTime >= blockStartDoha && dohaTime <= blockEndDoha;
    }
    
    // Simple date block - check if it's today and covers all slots (time_slot is null)
    return block.block_date === today && block.time_slot === null;
  });
};

/**
 * Expand raw blocked slots from database into individual date/time slot pairs.
 * Handles both simple blocks (specific date/slot) and duration-based blocks (date range).
 */
export const expandBlockedSlots = (rawBlocks: RawBlockedSlot[], fulfillmentType?: 'delivery' | 'pickup'): BlockedSlot[] => {
  const expandedBlocks: BlockedSlot[] = [];
  const timeSlots = generateTimeSlots();
  
  rawBlocks.forEach(block => {
    // Filter by fulfillment type if specified
    if (fulfillmentType && block.fulfillment_type && block.fulfillment_type !== 'both' && block.fulfillment_type !== fulfillmentType) {
      return;
    }
    
    if (block.block_type === 'duration' && block.block_start && block.block_end) {
      // Duration-based block - expand to cover all dates and time slots within the range
      const blockStart = new Date(block.block_start);
      const blockEnd = new Date(block.block_end);
      
      // Convert block times to Doha timezone for proper comparison
      const blockStartDoha = toZonedTime(blockStart, DOHA_TIMEZONE);
      const blockEndDoha = toZonedTime(blockEnd, DOHA_TIMEZONE);
      
      // Iterate through each day in the range - use Doha timezone
      let currentDate = new Date(blockStartDoha);
      currentDate.setHours(0, 0, 0, 0);
      
      const endDateNormalized = new Date(blockEndDoha);
      endDateNormalized.setHours(23, 59, 59, 999);
      
      while (currentDate <= endDateNormalized) {
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        
        // For each time slot, check if it falls within the blocked range
        timeSlots.forEach(slot => {
          const slotStartHour = parseInt(slot.value.split('-')[0].split(':')[0], 10);
          const slotEndHour = parseInt(slot.value.split('-')[1].split(':')[0], 10);
          
          // Create slot start/end datetime in the same day context
          const slotStart = new Date(currentDate);
          slotStart.setHours(slotStartHour, 0, 0, 0);
          
          const slotEnd = new Date(currentDate);
          slotEnd.setHours(slotEndHour, 0, 0, 0);
          
          // Block if slot overlaps with the blocked range (both in Doha time)
          if (slotEnd > blockStartDoha && slotStart < blockEndDoha) {
            expandedBlocks.push({
              block_date: dateStr,
              time_slot: slot.value
            });
          }
        });
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }
    } else {
      // Simple date/slot block - use as-is
      expandedBlocks.push({
        block_date: block.block_date,
        time_slot: block.time_slot
      });
    }
  });
  
  return expandedBlocks;
};


/**
 * Parse time slot end time (e.g., "09:00-12:00" returns 12)
 */
const getSlotEndHour = (slotValue: string): number => {
  const endTime = slotValue.split('-')[1]; // Get "12:00" from "09:00-12:00"
  return parseInt(endTime.split(':')[0], 10); // Get 12 from "12:00"
};

/**
 * Parse time slot start time (e.g., "09:00-12:00" returns 9)
 */
const getSlotStartHour = (slotValue: string): number => {
  const startTime = slotValue.split('-')[0]; // Get "09:00" from "09:00-12:00"
  return parseInt(startTime.split(':')[0], 10); // Get 9 from "09:00"
};

/**
 * Check if a time slot has passed for the given date
 */
export const isTimeSlotPast = (slotValue: string, selectedDate: Date): boolean => {
  const dohaTime = getCurrentDohaTime();
  const selectedDateInDoha = toZonedTime(selectedDate, DOHA_TIMEZONE);
  
  // If selected date is not today, no slots are past
  if (!isToday(selectedDateInDoha)) {
    return false;
  }
  
  // Get current hour in Doha
  const currentHour = dohaTime.getHours();
  
  // Get the end hour of the time slot
  const slotEndHour = getSlotEndHour(slotValue);
  
  // If current time has passed the slot's end time, mark as past
  return currentHour >= slotEndHour;
};

/**
 * Check if a time slot is unavailable due to preparation + delivery time
 * Combined time = preparation time + delivery time from zone
 */
export const isSlotUnavailableDueToPreparation = (
  slotValue: string, 
  selectedDate: Date, 
  preparationMinutes: number,
  deliveryMinutes: number = 0
): boolean => {
  const dohaTime = getCurrentDohaTime();
  
  const totalLeadTimeMinutes = preparationMinutes + deliveryMinutes;
  
  // Calculate absolute ready time (when order will be ready for delivery)
  const readyTime = new Date(dohaTime.getTime() + totalLeadTimeMinutes * 60 * 1000);
  
  // Build absolute slot end time on the selected date
  const selectedDateInDoha = toZonedTime(selectedDate, DOHA_TIMEZONE);
  const slotEndHour = getSlotEndHour(slotValue);
  const slotEndTime = new Date(selectedDateInDoha);
  slotEndTime.setHours(slotEndHour, 0, 0, 0);
  
  // MINIMUM BUFFER REQUIREMENT: 60 minutes before slot end
  // Slot is AVAILABLE if ready time is at least 60 mins before slot ends
  // Example: Ready at 5:00 PM, slot ends 6 PM → buffer = 60 mins → ALLOW
  // Example: Ready at 5:30 PM, slot ends 6 PM → buffer = 30 mins → BLOCK
  // Works across days: 24h prep cake ordered at 2 PM → ready 2 PM tomorrow → blocks morning slots
  const MINIMUM_BUFFER_MINUTES = 60;
  const bufferMinutes = (slotEndTime.getTime() - readyTime.getTime()) / (60 * 1000);
  
  // Slot is UNAVAILABLE if buffer is less than 60 minutes
  return bufferMinutes < MINIMUM_BUFFER_MINUTES;
};

/**
 * Check if a slot is blocked by staff via time_slot_blocks table
 */
export const isSlotBlockedByStaff = (
  slotValue: string,
  selectedDate: Date,
  blockedSlots: BlockedSlot[] = []
): boolean => {
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  
  return blockedSlots.some(block => {
    if (block.block_date !== dateStr) return false;
    // If time_slot is null, entire day is blocked
    // Otherwise, check if specific slot matches
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

/**
 * Generate time slots with availability status based on:
 * - Current time (past slots)
 * - Preparation time + delivery time combined
 * - Staff-blocked slots from database
 */
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
    // Check if blocked by staff first
    const isBlocked = isSlotBlockedByStaff(slot.value, selectedDate, blockedSlots);
    if (isBlocked) {
      return {
        ...slot,
        isPast: true,
        unavailableReason: 'blocked' as const
      };
    }
    
    const isPast = isTimeSlotPast(slot.value, selectedDate);
    const unavailableDueToPrep = !isPast && isSlotUnavailableDueToPreparation(
      slot.value, 
      selectedDate, 
      preparationMinutes,
      deliveryMinutes
    );
    
    return {
      ...slot,
      isPast: isPast || unavailableDueToPrep,
      unavailableReason: isPast ? 'past' : unavailableDueToPrep ? 'preparation' : undefined
    };
  });
};

/**
 * Check if a date has any available time slots
 * Returns true if ALL slots are unavailable
 */
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
  // Return commonly selected time slots for highlighting
  return ['10:00', '14:00', '16:00', '18:00', '20:00'];
};
