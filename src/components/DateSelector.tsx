import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { generateDateOptions } from '@/utils/dateHelpers';
import { BlockedSlot } from '@/utils/timeSlots';
import { isSameDay, addDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useTranslation } from '@/hooks/useTranslation';

interface DateSelectorProps {
  selectedDate: Date | undefined;
  onSelectDate: (date: Date) => void;
  className?: string;
  preparationMinutes?: number;
  deliveryMinutes?: number;
  blockedSlots?: BlockedSlot[];
}

const KUWAIT_TIMEZONE = 'Asia/Kuwait';

export const DateSelector: React.FC<DateSelectorProps> = ({
  selectedDate,
  onSelectDate,
  className,
  preparationMinutes = 0,
  deliveryMinutes = 0,
  blockedSlots = []
}) => {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const { t, translateDay, translateMonth } = useTranslation();
  const dateOptions = generateDateOptions(preparationMinutes, deliveryMinutes, blockedSlots);

  // Check if selected date is beyond the 5 quick-select options (calendar selection)
  const isCalendarDateSelected = selectedDate && !dateOptions.some(opt => isSameDay(opt.date, selectedDate));

  // Get today in local timezone for calendar min date
  const localToday = toZonedTime(new Date(), KUWAIT_TIMEZONE);
  localToday.setHours(0, 0, 0, 0);

  return (
    <div className={cn("w-full overflow-hidden", className)}>
      <div className="overflow-x-auto pb-2 scrollbar-hide scroll-smooth touch-pan-x">
        <div className="flex gap-1 sm:gap-2">
          {dateOptions.map((option, index) => {
            const isSelected = selectedDate && isSameDay(option.date, selectedDate);
            const isDisabled = option.isUnavailable;
            
            return (
              <button
                key={index}
                type="button"
                onClick={() => !isDisabled && onSelectDate(option.date)}
                disabled={isDisabled}
                className={cn(
                  "flex flex-col items-center justify-center shrink-0",
                  "min-w-[56px] w-[56px] sm:min-w-[80px] sm:w-auto px-1.5 sm:px-3 py-2 sm:py-3",
                  "rounded-lg border-2 transition-all duration-200",
                  "focus:outline-none focus:ring-2 focus:ring-[hsl(var(--tiffany-blue))]/50",
                  isDisabled
                    ? "border-muted bg-muted/50 cursor-not-allowed opacity-50"
                    : isSelected
                      ? "border-[hsl(var(--tiffany-blue))] shadow-[0_0_15px_hsl(var(--tiffany-blue)/0.4)] bg-[hsl(var(--tiffany-blue))]/10 backdrop-blur-sm"
                      : "border-border bg-background hover:border-[hsl(var(--tiffany-blue))] hover:bg-[hsl(var(--tiffany-light))]/30 hover:shadow-sm"
                )}
              >
                {/* Day label on top */}
                <span
                  className={cn(
                    "text-[10px] sm:text-xs font-medium mb-0.5 sm:mb-1",
                    isDisabled
                      ? "text-muted-foreground"
                      : isSelected 
                        ? "text-[hsl(var(--tiffany-blue))]" 
                        : "text-muted-foreground"
                  )}
                >
                  {option.isToday ? t('date_today') : option.isTomorrow ? t('date_tomorrow') : translateDay(option.label)}
                </span>
                
                {/* Date below */}
                <span
                  className={cn(
                    "text-xs sm:text-sm font-semibold",
                    isDisabled
                      ? "text-muted-foreground line-through"
                      : "text-foreground"
                  )}
                >
                  {translateMonth(option.dateDisplay)}
                </span>
                
                {/* Unavailable indicator */}
                {isDisabled && (
                  <span className="text-[8px] sm:text-[10px] text-destructive mt-0.5">
                    {t('date_unavailable')}
                  </span>
                )}
              </button>
            );
          })}

          {/* Calendar option - 6th block */}
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex flex-col items-center justify-center shrink-0",
                  "min-w-[56px] w-[56px] sm:min-w-[80px] sm:w-auto px-1.5 sm:px-3 py-2 sm:py-3",
                  "rounded-lg border-2 transition-all duration-200",
                  "focus:outline-none focus:ring-2 focus:ring-[hsl(var(--tiffany-blue))]/50",
                  isCalendarDateSelected
                    ? "border-[hsl(var(--tiffany-blue))] shadow-[0_0_15px_hsl(var(--tiffany-blue)/0.4)] bg-[hsl(var(--tiffany-blue))]/10 backdrop-blur-sm"
                    : "border-border bg-background hover:border-[hsl(var(--tiffany-blue))] hover:shadow-sm"
                )}
              >
                <CalendarIcon className={cn(
                  "h-4 w-4 mb-0.5",
                  isCalendarDateSelected ? "text-[hsl(var(--tiffany-blue))]" : "text-muted-foreground"
                )} />
                <span className={cn(
                  "text-[10px] sm:text-xs font-medium",
                  isCalendarDateSelected ? "text-[hsl(var(--tiffany-blue))]" : "text-muted-foreground"
                )}>
                  {t('date_more')}
                </span>
                <span className="text-xs sm:text-sm font-semibold text-foreground">
                  {t('date_dates')}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    onSelectDate(date);
                    setCalendarOpen(false);
                  }
                }}
                disabled={(date) => {
                  // Disable past dates
                  return date < localToday;
                }}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
};
