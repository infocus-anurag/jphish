import { RouteGuard } from '@/components/shell/RouteGuard';
import { UsersAdminScreen } from '@/components/screens/UsersAdminScreen';

export default function Page(): JSX.Element {
  return (
    <RouteGuard route="users">
      <UsersAdminScreen />
    </RouteGuard>
  );
}
