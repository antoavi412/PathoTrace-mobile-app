import { fireEvent, render, screen } from '@testing-library/react-native';

import { CowListItem } from '@/components/cow-list-item';

const cow = {
  id: 'cow-001',
  tagId: 'PT-001',
  name: 'Daisy',
  breed: 'Holstein Friesian',
  ageMonths: 62,
  farmId: 'farm-1',
  riskStatus: 'high' as const,
};

describe('CowListItem', () => {
  it('shows identification and risk status', async () => {
    await render(<CowListItem cow={cow} />);
    expect(screen.getByText('PT-001 · Daisy')).toBeTruthy();
    expect(screen.getByText('High risk')).toBeTruthy();
    expect(screen.getByText('Holstein Friesian · 5y 2m')).toBeTruthy();
  });

  it('calls onPress when the item is pressed', async () => {
    const onPress = jest.fn();
    await render(<CowListItem cow={cow} onPress={onPress} />);

    fireEvent.press(
      screen.getByLabelText('PT-001, Daisy, Holstein Friesian')
    );
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
