import * as React from "react"
import { cn } from "@/lib/utils"

interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("overflow-auto", className)}
      style={{ 
        scrollbarWidth: 'thin',
        scrollbarColor: '#cbd5e1 transparent'
      }}
      {...props}
    >
      {children}
    </div>
  )
)
ScrollArea.displayName = "ScrollArea"

const ScrollBar = () => null

export { ScrollArea, ScrollBar }