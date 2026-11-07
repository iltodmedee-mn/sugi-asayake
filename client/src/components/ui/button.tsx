import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Storefront-ийн товч (2026-10-18). shadcn-ий Button-ий API (`variant`, `size`, `asChild`),
 * харин класс нь сайтын ОДООГИЙН `.button` гэр бүл — server/_core/heroShell.ts ижил
 * `button button-primary`-аар зурдаг тул нэг эх сурвалж хэвээр. Шинэ хувилбарууд
 * (outline/ghost/sm/icon) `client/src/styles/primitives.css`-д.
 */
const buttonVariants = cva("button", {
  variants: {
    variant: {
      primary: "button-primary",
      light: "button-light",
      outline: "button-outline",
      ghost: "button-ghost",
    },
    size: {
      default: "",
      sm: "button-sm",
      icon: "button-icon",
    },
  },
  defaultVariants: { variant: "primary", size: "default" },
});

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants> & {
  /** wouter `<Link>`-ийг товчны загвартай болгоно (`<Button asChild><Link …/></Button>`). */
  asChild?: boolean;
  /** Илгээж байх үед: spinner, `aria-busy`, давхар дарахаас хамгаална. */
  loading?: boolean;
};

export function Button({ className, variant, size, asChild = false, loading = false, disabled, children, type, ...props }: ButtonProps) {
  if (asChild) {
    return <Slot data-slot="button" className={cn(buttonVariants({ variant, size }), className)} {...props}>{children}</Slot>;
  }
  return (
    <button data-slot="button" type={type ?? "button"} className={cn(buttonVariants({ variant, size }), className)} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading ? <LoaderCircle className="sf-spinner" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
