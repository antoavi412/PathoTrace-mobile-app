import { fireEvent, render, screen } from '@testing-library/react-native';

import { ErrorState, LoadingState } from '@/components/ui/states';
import { ApiError } from '@/types';

describe('LoadingState', () => {
  it('shows the loading message', async () => {
    await render(<LoadingState message="Loading herd records" />);
    expect(screen.getByText('Loading herd records')).toBeTruthy();
  });
});

describe('ErrorState', () => {
  it('shows an API error message and retries', async () => {
    const onRetry = jest.fn();
    await render(
      <ErrorState
        error={new ApiError('SERVER_ERROR', 'The herd service is unavailable.')}
        onRetry={onRetry}
      />
    );

    expect(screen.getByText('Unable to load this information')).toBeTruthy();
    expect(screen.getByText('The herd service is unavailable.')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('hides the retry action when no handler is provided', async () => {
    await render(<ErrorState error={new Error('Failed to load')} title="Cannot load cow" />);

    expect(screen.getByText('Cannot load cow')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
  });
});
