"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface CalendarProps {
  mode?: "single" | "multiple" | "range"
  selected?: Date | Date[] | undefined
  onSelect?: (date: Date | undefined) => void
  initialFocus?: boolean
  className?: string
}

function Calendar({
  mode = "single",
  selected,
  onSelect,
  initialFocus,
  className,
  ...props
}: CalendarProps) {
  const [currentDate, setCurrentDate] = React.useState(new Date())
  
  const today = new Date()
  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()
  
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1)
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0)
  const firstDayOfWeek = firstDayOfMonth.getDay()
  const daysInMonth = lastDayOfMonth.getDate()
  
  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ]
  
  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
  
  const previousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1))
  }
  
  const nextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1))
  }
  
  const handleDateClick = (day: number) => {
    const clickedDate = new Date(currentYear, currentMonth, day)
    onSelect?.(clickedDate)
  }
  
  const isSelected = (day: number) => {
    if (!selected) return false
    const dayDate = new Date(currentYear, currentMonth, day)
    if (selected instanceof Date) {
      return selected.toDateString() === dayDate.toDateString()
    }
    return false
  }
  
  const isToday = (day: number) => {
    const dayDate = new Date(currentYear, currentMonth, day)
    return today.toDateString() === dayDate.toDateString()
  }
  
  const renderCalendarDays = () => {
    const days = []
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="h-9 w-9" />)
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(
        <Button
          key={day}
          variant={isSelected(day) ? "default" : "ghost"}
          size="sm"
          className={cn(
            "h-9 w-9 p-0 font-normal",
            isToday(day) && !isSelected(day) && "bg-accent text-accent-foreground",
            isSelected(day) && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
          )}
          onClick={() => handleDateClick(day)}
        >
          {day}
        </Button>
      )
    }
    
    return days
  }
  
  return (
    <div className={cn("p-3", className)} {...props}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex justify-center pt-1 relative items-center">
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute left-1"
            onClick={previousMonth}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-medium">
            {monthNames[currentMonth]} {currentYear}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute right-1"
            onClick={nextMonth}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Calendar */}
        <div className="w-full border-collapse space-y-1">
          {/* Day headers */}
          <div className="flex">
            {dayNames.map(day => (
              <div key={day} className="text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] text-center">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1 mt-2">
            {renderCalendarDays()}
          </div>
        </div>
      </div>
    </div>
  )
}

Calendar.displayName = "Calendar"

export { Calendar }