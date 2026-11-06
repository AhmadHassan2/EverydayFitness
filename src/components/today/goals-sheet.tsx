"use client";

import { toast } from "sonner";
import type { Goals, ISODate } from "@/lib/domain/types";
import { useSetGoals } from "@/lib/data/hooks";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerBody, DrawerContent, DrawerFooter } from "@/components/ui/drawer";
import { GoalsForm } from "@/components/settings/goals-form";

export function GoalsSheet({ open, onOpenChange, goals, effectiveDate }: { open: boolean; onOpenChange: (open: boolean) => void; goals: Goals; effectiveDate: ISODate }) {
  const setGoals = useSetGoals();

  return (
    <Drawer open={open} onOpenChange={onOpenChange} repositionInputs={false}>
      <DrawerContent title="Edit daily goals" description="Changes apply from today. Past days keep their original goals.">
        <DrawerBody>
          <GoalsForm
            initial={goals}
            submitLabel={setGoals.isPending ? "Saving…" : "Save goals"}
            pending={setGoals.isPending}
            onSubmit={(next) =>
              setGoals.mutate(
                { goals: next, effectiveDate },
                {
                  onSuccess: () => {
                    toast.success("Goals saved");
                    onOpenChange(false);
                  },
                  onError: (error) => toast.error("Couldn't save goals", { description: error.message }),
                },
              )
            }
          />
        </DrawerBody>
        <DrawerFooter>
          <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)} disabled={setGoals.isPending}>
            Cancel
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
