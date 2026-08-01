import { DonationDetailClient } from "./DonationDetailClient";

export default function DonationDetailPage({ params }: { params: { id: string } }) {
  return <DonationDetailClient donationId={params.id} />;
}
