'use client';

import { useUI } from '@/store/ui.store';
import { WizardScreen } from '@/components/screens/WizardScreen';

export function WizardHost(): JSX.Element | null {
  const showWizard = useUI((s) => s.showWizard);
  const closeWizard = useUI((s) => s.closeWizard);

  if (!showWizard) return null;
  return <WizardScreen onClose={closeWizard} onLaunch={closeWizard} />;
}
