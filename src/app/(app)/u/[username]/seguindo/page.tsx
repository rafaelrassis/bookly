import { BackHeader } from "@/components/BackHeader";
import { UserListView } from "@/components/UserListView";
import { withoutAt } from "@/lib/handle";

export default function FollowingPage({ params }: { params: { username: string } }) {
  const username = withoutAt(decodeURIComponent(params.username));
  return (
    <div className="pt-4">
      <BackHeader>
        <h1 className="text-lg font-extrabold">Seguindo</h1>
      </BackHeader>
      <UserListView username={username} kind="seguindo" />
    </div>
  );
}
