"use client";

import { createContext, useContext, type ComponentProps, type ReactNode } from "react";
import { Drawer as Vaul } from "vaul";
import { cn } from "@/lib/utils";
import { DESKTOP_QUERY, useMediaQuery } from "@/lib/use-media-query";

/*
 * Sheet. Phones get a bottom sheet with drag-to-dismiss; wider screens get a
 * panel that slides in from the right, the usual web pattern.
 */

const SideContext = createContext(false);

export function Drawer({ children, ...props }: ComponentProps<typeof Vaul.Root>) {
  const side = useMediaQuery(DESKTOP_QUERY);
  return (
    <SideContext.Provider value={side}>
      <Vaul.Root direction={side ? "right" : "bottom"} {...props}>
        {children}
      </Vaul.Root>
    </SideContext.Provider>
  );
}

export const DrawerTrigger = Vaul.Trigger;
export const DrawerClose = Vaul.Close;

export function DrawerContent({
  className,
  children,
  title,
  description,
  headerAction,
  ...props
}: ComponentProps<typeof Vaul.Content> & { title: string; description?: string; headerAction?: ReactNode }) {
  const side = useContext(SideContext);
  return (
    <Vaul.Portal>
      <Vaul.Overlay className="fixed inset-0 z-50 bg-black/40" />
      <Vaul.Content
        className={cn(
          "fixed z-50 flex flex-col border-border bg-surface shadow-[var(--shadow-sheet)] outline-none",
          side
            ? "inset-y-0 right-0 h-dvh w-[440px] max-w-[92vw] border-l"
            : "inset-x-0 bottom-0 mx-auto max-h-[92dvh] w-full max-w-lg rounded-t-[20px] border border-b-0",
          // Height hints from callers only apply to the bottom sheet.
          side ? className?.replace(/\bh-\[[^\]]+\]/g, "") : className,
        )}
        {...props}
      >
        {side ? null : <div aria-hidden className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-border-strong" />}
        <div className={cn("flex items-start justify-between gap-3 px-5 pb-2", side ? "pt-6" : "pt-3")}>
          <div className="min-w-0">
            <Vaul.Title className="text-[17px] font-semibold tracking-[-0.01em]">{title}</Vaul.Title>
            {description ? (
              <Vaul.Description className="mt-0.5 text-[13px] text-muted-foreground">{description}</Vaul.Description>
            ) : (
              <Vaul.Description className="sr-only">{title}</Vaul.Description>
            )}
          </div>
          {headerAction}
        </div>
        {children}
      </Vaul.Content>
    </Vaul.Portal>
  );
}

/** Scrollable body. */
export function DrawerBody({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5", className)} {...props} />;
}

/** Sticky footer for the primary action; clears the home indicator. */
export function DrawerFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("border-t border-border bg-surface px-5 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]", className)}
      {...props}
    />
  );
}
