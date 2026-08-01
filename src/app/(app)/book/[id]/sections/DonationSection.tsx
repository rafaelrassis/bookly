"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { CreateDonationForm } from "@/components/donation/CreateDonationForm";
import { DonationList } from "@/components/donation/DonationList";
import { Section } from "@/components/ui/Section";

type Props = {
  bookId: string;
  myState: string | null | undefined;
  myCity: string | null | undefined;
  showToast: (message: string) => void;
};

export function DonationSection({ bookId, myState, myCity, showToast }: Props) {
  const [donating, setDonating] = useState(false);
  const [reloadSignal, setReloadSignal] = useState(0);

  return (
    <Section
      title="Doação de livros"
      action={
        <button
          type="button"
          onClick={() => setDonating(true)}
          className="min-h-tap text-xs font-bold text-foil hover:opacity-80"
        >
          + Doar este livro
        </button>
      }
    >
      <DonationList bookId={bookId} myUf={myState} myCity={myCity} reloadSignal={reloadSignal} onToast={showToast} />

      {donating && (
        <Sheet onClose={() => setDonating(false)} title="Doar este livro">
          <CreateDonationForm
            bookId={bookId}
            defaultState={myState}
            defaultCity={myCity}
            onCancel={() => setDonating(false)}
            onToast={showToast}
            onCreated={() => {
              setDonating(false);
              setReloadSignal((n) => n + 1);
            }}
          />
        </Sheet>
      )}
    </Section>
  );
}
