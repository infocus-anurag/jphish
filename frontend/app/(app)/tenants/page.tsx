import { TenantsScreen } from '@/components/screens/TenantsScreen';
import { RouteGuard } from '@/components/shell/RouteGuard';

export default function Page(): JSX.Element {
  return (
    <RouteGuard route="tenants">
      <TenantsScreen />
    </RouteGuard>
  );
}
