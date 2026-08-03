import { BackHeader } from "@/components/BackHeader";
import { UserListView } from "@/components/UserListView";
import { withoutAt } from "@/lib/handle";

export default function FollowersPage({ params }: { params: { username: string } }) {
  const username = withoutAt(decodeURIComponent(params.username));
  return (
    <div className="pt-4">
      <BackHeader>
        <h1 className="text-lg font-extrabold">Seguidores</h1>
      </BackHeader>
      <UserListView username={username} kind="seguidores" />
    </div>
  );
}
