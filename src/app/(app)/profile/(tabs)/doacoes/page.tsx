import { MyDonations } from "@/components/donation/MyDonations";
import { ReceivedDonations } from "@/components/donation/ReceivedDonations";
import { Section } from "@/components/ui/Section";

export default function ProfileDonationsPage() {
  return (
    <div className="mb-4">
      <Section title="Minhas doações" className="mt-6">
        <MyDonations />
      </Section>

      <Section title="Recebidos">
        <ReceivedDonations />
      </Section>
    </div>
  );
}
