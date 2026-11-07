import { render, screen } from '@testing-library/react-native';

import { StatusBadge } from '@/components/ui/status-badge';

describe('StatusBadge', () => {
  it('shows the risk category label', async () => {
    await render(<StatusBadge status="high" />);
    expect(screen.getByText('High risk')).toBeTruthy();
  });

  it('shows a custom label when provided', async () => {
    await render(<StatusBadge status="unknown" label="Awaiting assessment" />);
    expect(screen.getByText('Awaiting assessment')).toBeTruthy();
  });
});
