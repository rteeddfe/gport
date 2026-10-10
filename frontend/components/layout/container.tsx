import { cn } from "@/lib/utils";

export function Container({ className, ...props }: React.ComponentProps<"div">) {
    // Full-HD adaptivity: the storefront keeps the compact 1232px shell on
    // laptops and widens to 1600px from 2xl (≥1536px) up, so 1920px screens
    // don't read as a narrow strip.
    return <div className={cn("mx-auto w-full max-w-[1232px] px-4 2xl:max-w-[1600px]", className)} {...props} />;
}
