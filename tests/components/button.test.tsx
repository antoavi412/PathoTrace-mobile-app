import { fireEvent, render, screen } from '@testing-library/react-native';

import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('renders its label and handles presses', async () => {
    const onPress = jest.fn();
    await render(<Button label="Save profile" onPress={onPress} />);

    fireEvent.press(screen.getByRole('button', { name: 'Save profile' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', async () => {
    const onPress = jest.fn();
    await render(<Button label="Submit" onPress={onPress} disabled />);

    fireEvent.press(screen.getByRole('button', { name: 'Submit' }));
    expect(onPress).not.toHaveBeenCalled();
  });
});
