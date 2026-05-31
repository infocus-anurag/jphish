import { SettingsScreen } from '@/components/screens/SettingsScreen';
import { RouteGuard } from '@/components/shell/RouteGuard';

export default function Page(): JSX.Element {
  return (
    <RouteGuard route="settings">
      <SettingsScreen />
    </RouteGuard>
  );
}
