'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { enUS, ja } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  selected?: Date;
  onSelect: (date: Date | undefined) => void;
  disabled?: (date: Date) => boolean;
  placeholder?: string;
  className?: string;
  locale?: 'ja' | 'en';
}

export function DatePicker({
  selected,
  onSelect,
  disabled,
  placeholder,
  className,
  locale = 'ja',
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const localeValue = locale === 'en' ? enUS : ja;
  const resolvedPlaceholder = placeholder ?? (locale === 'en' ? 'Select date' : '日付を選択');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full sm:w-44 justify-start text-left font-normal',
            !selected && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="h-4 w-4" />
          {selected
            ? format(selected, locale === 'en' ? 'yyyy/MM/dd (EEE)' : 'yyyy/MM/dd (E)', { locale: localeValue })
            : resolvedPlaceholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            onSelect(date);
            setOpen(false);
          }}
          disabled={disabled}
          locale={localeValue}
        />
      </PopoverContent>
    </Popover>
  );
}
