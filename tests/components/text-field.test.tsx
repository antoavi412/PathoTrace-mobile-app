import { fireEvent, render, screen } from '@testing-library/react-native';

import { TextField } from '@/components/ui/text-field';

describe('TextField', () => {
  it('renders a label, accepts input, and shows validation feedback', async () => {
    const onChangeText = jest.fn();
    await render(
      <TextField
        label="Email"
        value=""
        onChangeText={onChangeText}
        error="Enter a valid email address."
        hint="This hint is hidden while an error is shown."
        required
      />
    );

    expect(screen.getByText('Enter a valid email address.')).toBeTruthy();
    expect(screen.queryByText('This hint is hidden while an error is shown.')).toBeNull();

    fireEvent.changeText(screen.getByLabelText('Email'), 'farmer@example.com');
    expect(onChangeText).toHaveBeenCalledWith('farmer@example.com');
  });

  it('shows the hint when there is no error', async () => {
    await render(
      <TextField
        label="Phone"
        value=""
        onChangeText={() => undefined}
        hint="Optional contact number"
      />
    );

    expect(screen.getByText('Optional contact number')).toBeTruthy();
  });

  it('can reveal and hide a password', async () => {
    await render(
      <TextField label="Password" value="secret" onChangeText={() => undefined} secure />
    );

    expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(true);
    fireEvent.press(screen.getByRole('button', { name: 'Show password' }));
    expect(await screen.findByRole('button', { name: 'Hide password' })).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Hide password' }));
    expect(await screen.findByRole('button', { name: 'Show password' })).toBeTruthy();
  });
});
