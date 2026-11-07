import { fireEvent, render, screen } from '@testing-library/react-native';

import { EmptyState } from '@/components/ui/states';

describe('EmptyState', () => {
  it('renders the empty message and action', async () => {
    const onAction = jest.fn();
    await render(
      <EmptyState
        title="No cattle match these filters"
        message="Try a different search term."
        actionLabel="Clear filters"
        onAction={onAction}
      />
    );

    expect(screen.getByText('No cattle match these filters')).toBeTruthy();
    expect(screen.getByText('Try a different search term.')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Clear filters' }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
