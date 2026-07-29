import type { Donation, DonationRequest } from "@/generated/prisma/client";

type DonationWithRequests = Donation & { requests: DonationRequest[] };

/** Esconde o contato do doador de todo mundo, exceto o próprio doador e o
 * interessado ESCOLHIDO — é só nesse momento do fluxo que o contato libera. */
export function serializeDonation(d: DonationWithRequests, viewerId: string | null) {
  const isDonor = viewerId === d.donorId;
  const chosen = d.requests.find((r) => r.status === "ESCOLHIDO");
  const isChosen = !!viewerId && chosen?.requesterId === viewerId;
  const canSeeContact = isDonor || isChosen;

  const myRequest = viewerId ? d.requests.find((r) => r.requesterId === viewerId) ?? null : null;

  return {
    id: d.id,
    bookId: d.bookId,
    donorId: d.donorId,
    photoUrl: d.photoUrl,
    city: d.city,
    state: d.state,
    status: d.status,
    createdAt: d.createdAt,
    isDonor,
    requestCount: d.requests.filter((r) => r.status === "PENDENTE").length,
    myRequest: myRequest && { id: myRequest.id, status: myRequest.status },
    contact: canSeeContact ? { whatsapp: d.whatsapp, instagram: d.instagram } : null,
  };
}
