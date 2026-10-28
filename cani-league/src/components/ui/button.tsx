import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-full border border-transparent bg-clip-padding text-[length:min(0.8824rem,22.5px)] font-semibold whitespace-nowrap transition-[opacity,background-color,color] outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/60 active:opacity-70 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // Estilo iOS: relleno sólido, sin bordes ni sombras.
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        outline: "bg-secondary text-secondary-foreground hover:bg-[#3a3a3c] aria-expanded:bg-[#3a3a3c]",
        secondary: "bg-secondary text-secondary-foreground hover:bg-[#3a3a3c] aria-expanded:bg-[#3a3a3c]",
        ghost: "hover:bg-secondary aria-expanded:bg-secondary",
        destructive: "bg-secondary text-destructive hover:bg-[#3a3a3c] focus-visible:ring-destructive/40",
        link: "text-[#0a84ff] hover:underline underline-offset-4",
      },
      size: {
        default:
          "h-9 max-md:h-11 gap-1.5 px-4 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 max-md:h-9 gap-1 px-3 text-[length:min(0.7647rem,19.5px)] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-11 max-md:h-[50px] gap-2 px-5 text-[length:min(1rem,25.5px)] has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8 max-md:size-10",
        "icon-xs":
          "size-6 max-md:size-8 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 max-md:size-9 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
