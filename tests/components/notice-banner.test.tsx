import { fireEvent, render, screen } from '@testing-library/react-native';

import { NoticeBanner, StaleDataNotice } from '@/components/ui/notice-banner';

describe('NoticeBanner', () => {
  it('renders a title, message, and optional action', async () => {
    const onAction = jest.fn();
    await render(
      <NoticeBanner
        title="Connection lost"
        message="Showing saved data until the device reconnects."
        tone="warning"
        actionLabel="Retry now"
        onAction={onAction}
      />
    );

    expect(screen.getByText('Connection lost')).toBeTruthy();
    expect(screen.getByText('Showing saved data until the device reconnects.')).toBeTruthy();

    fireEvent.press(screen.getByText('Retry now'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('marks cached data with the fetch time', async () => {
    await render(<StaleDataNotice fetchedAt="2026-03-05T10:30:00.000Z" />);
    expect(screen.getByText(/Showing saved data from/)).toBeTruthy();
    expect(screen.getByText(/Reconnect to refresh\./)).toBeTruthy();
  });
});
