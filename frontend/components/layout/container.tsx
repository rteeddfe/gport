import { cn } from "@/lib/utils";

export function Container({ className, ...props }: React.ComponentProps<"div">) {
    return <div className={cn("mx-auto w-full max-w-[1232px] px-4", className)} {...props} />;
}
