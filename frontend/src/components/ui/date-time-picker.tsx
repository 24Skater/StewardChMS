import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "./button"
import { Calendar } from "./calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import { Input } from "./input"
import { Label } from "./label"

interface DateTimePickerProps {
  value?: string // ISO string or empty
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  id?: string
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Pick a date and time",
  disabled,
  id,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false)
  
  // Parse the ISO string to Date, or use undefined
  const dateValue = React.useMemo(() => {
    if (!value) return undefined
    try {
      const date = new Date(value)
      return isNaN(date.getTime()) ? undefined : date
    } catch {
      return undefined
    }
  }, [value])

  // Extract time from the date
  const timeValue = React.useMemo(() => {
    if (!dateValue) return "09:00"
    const hours = dateValue.getHours().toString().padStart(2, "0")
    const minutes = dateValue.getMinutes().toString().padStart(2, "0")
    return `${hours}:${minutes}`
  }, [dateValue])

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (!selectedDate) {
      onChange("")
      return
    }
    
    // Preserve the time from the current value or use default
    const [hours, minutes] = timeValue.split(":").map(Number)
    selectedDate.setHours(hours, minutes, 0, 0)
    onChange(selectedDate.toISOString())
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value
    if (!newTime) return

    const [hours, minutes] = newTime.split(":").map(Number)
    
    // If we have a date, update its time
    if (dateValue) {
      const newDate = new Date(dateValue)
      newDate.setHours(hours, minutes, 0, 0)
      onChange(newDate.toISOString())
    } else {
      // If no date selected, create today with this time
      const today = new Date()
      today.setHours(hours, minutes, 0, 0)
      onChange(today.toISOString())
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !dateValue && "text-muted"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {dateValue ? (
            format(dateValue, "PPP 'at' p")
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={dateValue}
          onSelect={handleDateSelect}
          initialFocus
        />
        <div className="border-t p-3">
          <Label htmlFor="time-input" className="text-sm font-medium">
            Time
          </Label>
          <Input
            id="time-input"
            type="time"
            value={timeValue}
            onChange={handleTimeChange}
            className="mt-1"
          />
        </div>
        <div className="border-t p-3 flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onChange("")
              setOpen(false)
            }}
          >
            Clear
          </Button>
          <Button
            size="sm"
            onClick={() => setOpen(false)}
          >
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
