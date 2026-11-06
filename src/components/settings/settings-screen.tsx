"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Ellipsis, Layers, LogOut, Pencil, Plus, RotateCcw, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { SavedFood, SavedMeal } from "@/lib/domain/types";
import { deviceTimeZone } from "@/lib/domain/dates";
import { formatNumber, pluralize } from "@/lib/domain/format";
import { sumNutrition } from "@/lib/domain/totals";
import {
  useCurrentGoals,
  useDeleteSavedFood,
  useDeleteSavedMeal,
  useProfile,
  useSavedFoods,
  useSavedMeals,
  useSetGoals,
  useToday,
  useUpdateProfile,
} from "@/lib/data/hooks";
import { useRepository } from "@/lib/data/provider";
import { DemoRepository } from "@/lib/data/demo/demo-repository";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { leaveDemo, signOut } from "@/lib/session";
import { useTheme, type ThemePreference } from "@/components/providers/theme";
import { useAppUI } from "@/components/shell/app-ui";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { GoalsForm } from "./goals-form";
import { SavedFoodSheet } from "./saved-food-sheet";

function Section({ id, title, description, children }: { id?: string; title: string; description?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="grid scroll-mt-6 gap-2">
      <div className="px-1">
        <h2 className="text-[13px] font-medium text-muted-foreground">{title}</h2>
        {description ? <p className="mt-0.5 text-[13px] text-subtle-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0">
      <div className="min-w-0">
        <p className="text-[15px] font-medium">{label}</p>
        {hint ? <p className="text-[13px] text-muted-foreground">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}

export function SettingsScreen() {
  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start lg:gap-8">
        <div className="grid gap-6">
          <GoalsSection />
          <PreferencesSection />
        </div>
        <div className="grid gap-6">
          <SavedFoodsSection />
          <SavedMealsSection />
          <AccountSection />
        </div>
      </div>
    </>
  );
}

function GoalsSection() {
  const today = useToday();
  const goals = useCurrentGoals(today);
  const setGoals = useSetGoals();
  return (
    <Section title="Daily goals" description="Changes apply from today. Past days keep the goals they had.">
      <Card className="p-4">
        {goals && today ? (
          <GoalsForm
            key={JSON.stringify(goals)}
            initial={goals}
            submitLabel="Save goals"
            requireChange
            pending={setGoals.isPending}
            onSubmit={(g) =>
              setGoals.mutate(
                { goals: g, effectiveDate: today },
                {
                  onSuccess: () => toast.success("Goals saved"),
                  onError: (e) => toast.error("Couldn't save goals", { description: e.message }),
                },
              )
            }
          />
        ) : (
          <Skeleton className="h-64" />
        )}
      </Card>
    </Section>
  );
}

function PreferencesSection() {
  const { preference, setPreference } = useTheme();
  const profile = useProfile();
  const update = useUpdateProfile();
  const device = deviceTimeZone();
  const tz = profile.data?.timezone;

  const patch = (p: Parameters<typeof update.mutate>[0], ok: string) =>
    update.mutate(p, {
      onSuccess: () => toast.success(ok),
      onError: (e) => toast.error("Couldn't save preference", { description: e.message }),
    });

  return (
    <Section title="Preferences">
      <Card>
        <Row label="Appearance">
          <Segmented<ThemePreference>
            label="Appearance"
            size="sm"
            className="w-56"
            value={preference}
            onValueChange={setPreference}
            options={[
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
              { value: "system", label: "System" },
            ]}
          />
        </Row>
        <Row label="Energy unit" hint="Food is always entered in kcal.">
          <Segmented<"kcal" | "kj">
            label="Energy unit"
            size="sm"
            className="w-36"
            value={profile.data?.energyUnit ?? ""}
            onValueChange={(v) => patch({ energyUnit: v }, v === "kj" ? "Showing kilojoules" : "Showing kilocalories")}
            options={[
              { value: "kcal", label: "kcal" },
              { value: "kj", label: "kJ" },
            ]}
          />
        </Row>
        <Row
          label="Time zone"
          hint={tz ? (tz === device ? `${tz} · decides when your day starts` : `${tz} · this device is on ${device}`) : " "}
        >
          {tz && tz !== device ? (
            <Button variant="outline" size="sm" onClick={() => patch({ timezone: device }, `Time zone set to ${device}`)}>
              Use {device}
            </Button>
          ) : null}
        </Row>
      </Card>
    </Section>
  );
}

function SavedFoodsSection() {
  const foods = useSavedFoods();
  const del = useDeleteSavedFood();
  const [editing, setEditing] = useState<SavedFood | null>(null);
  const [deleting, setDeleting] = useState<SavedFood | null>(null);

  return (
    <Section title="Favourites" description="Foods you can log in one tap. Turn on “Save to favourites” when adding food.">
      <Card>
        {foods.isPending ? (
          <Skeleton className="m-4 h-24" />
        ) : !foods.data?.length ? (
          <p className="flex items-center gap-2 px-4 py-4 text-sm text-muted-foreground">
            <Star className="size-4" aria-hidden /> No favourites yet.
          </p>
        ) : (
          <ul>
            {foods.data.map((f) => (
              <li key={f.id} className="flex items-center gap-2 border-b border-border py-2 pl-4 pr-1 last:border-b-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium">{f.name}</p>
                  <p className="truncate text-[13px] text-muted-foreground tnum">
                    {formatNumber(f.calories)} kcal · P {formatNumber(f.protein)} · C {formatNumber(f.carbs)} · F {formatNumber(f.fat)}
                    {f.useCount ? ` · logged ${pluralize(f.useCount, "time")}` : ""}
                  </p>
                </div>
                <RowMenu label={f.name} onEdit={() => setEditing(f)} onDelete={() => setDeleting(f)} />
              </li>
            ))}
          </ul>
        )}
      </Card>
      <SavedFoodSheet food={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Remove ${deleting?.name ?? "favourite"}?`}
        description="Entries you already logged stay as they are."
        confirmLabel="Remove"
        onConfirm={() =>
          deleting &&
          del.mutate(deleting, {
            onSuccess: () => toast("Favourite removed"),
            onError: (e) => toast.error("Couldn't remove favourite", { description: e.message }),
          })
        }
      />
    </Section>
  );
}

function SavedMealsSection() {
  const meals = useSavedMeals();
  const del = useDeleteSavedMeal();
  const { openMealBuilder } = useAppUI();
  const [deleting, setDeleting] = useState<SavedMeal | null>(null);

  return (
    <Section title="Saved meals" description="Groups of foods you log together.">
      <Card>
        {meals.isPending ? (
          <Skeleton className="m-4 h-24" />
        ) : meals.data?.length ? (
          <ul>
            {meals.data.map((m) => (
              <li key={m.id} className="flex items-center gap-2 border-b border-border py-2 pl-4 pr-1">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium">{m.name}</p>
                  <p className="truncate text-[13px] text-muted-foreground tnum">
                    {pluralize(m.items.length, "item")} · {formatNumber(sumNutrition(m.items).calories)} kcal
                  </p>
                </div>
                <RowMenu label={m.name} onEdit={() => openMealBuilder({ meal: m })} onDelete={() => setDeleting(m)} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="flex items-center gap-2 px-4 pt-4 text-sm text-muted-foreground">
            <Layers className="size-4" aria-hidden /> No saved meals yet.
          </p>
        )}
        <div className="p-2">
          <Button variant="ghost" size="sm" onClick={() => openMealBuilder()}>
            <Plus aria-hidden /> New saved meal
          </Button>
        </div>
      </Card>
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.name ?? "meal"}?`}
        description="Entries you already logged stay as they are."
        confirmLabel="Delete"
        onConfirm={() =>
          deleting &&
          del.mutate(deleting, {
            onSuccess: () => toast("Saved meal deleted"),
            onError: (e) => toast.error("Couldn't delete meal", { description: e.message }),
          })
        }
      />
    </Section>
  );
}

function RowMenu({ label, onEdit, onDelete }: { label: string; onEdit: () => void; onDelete: () => void }) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        aria-label={`Options for ${label}`}
        className="flex size-10 shrink-0 items-center justify-center rounded-lg text-subtle-foreground hover:bg-surface-2 hover:text-foreground"
      >
        <Ellipsis className="size-[18px]" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onSelect={onEdit}>
          <Pencil /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem destructive onSelect={onDelete}>
          <Trash2 /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AccountSection() {
  const repo = useRepository();
  const profile = useProfile();
  const qc = useQueryClient();
  const [confirmReset, setConfirmReset] = useState(false);

  if (repo?.mode === "demo") {
    return (
      <Section id="demo" title="Demo mode">
        <Card className="p-4">
          <p className="text-[15px]">You&apos;re exploring with sample data.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Everything you log is saved on this device only and is kept separate from any account.
            {isSupabaseConfigured ? "" : " To sync across devices, connect Supabase (see README) and sign in."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmReset(true)}>
              <RotateCcw aria-hidden /> Reset demo data
            </Button>
            {isSupabaseConfigured ? (
              <Button size="sm" onClick={leaveDemo}>
                Sign in or create account
              </Button>
            ) : null}
          </div>
        </Card>
        <ConfirmDialog
          open={confirmReset}
          onOpenChange={setConfirmReset}
          title="Reset demo data?"
          description="Your changes are replaced with fresh sample data."
          confirmLabel="Reset"
          onConfirm={() => {
            if (repo instanceof DemoRepository) repo.reset();
            qc.invalidateQueries();
            toast.success("Demo data reset");
          }}
        />
      </Section>
    );
  }

  return (
    <Section title="Account">
      <Card>
        <Row label="Signed in as" hint={profile.data?.email ?? " "}>
          <Button variant="outline" size="sm" onClick={() => signOut()}>
            <LogOut aria-hidden /> Sign out
          </Button>
        </Row>
      </Card>
    </Section>
  );
}
