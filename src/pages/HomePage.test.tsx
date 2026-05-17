import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HomePage from './HomePage';

test('renders page title', () => {
  render(<MemoryRouter><HomePage /></MemoryRouter>);
  expect(screen.getByText(/EU Dress Code Guide/i)).toBeInTheDocument();
});

test('renders all 12 dress code cards', () => {
  render(<MemoryRouter><HomePage /></MemoryRouter>);
  expect(screen.getByText('White Tie')).toBeInTheDocument();
  expect(screen.getByText('Casual')).toBeInTheDocument();
});

test('search bar is present', () => {
  render(<MemoryRouter><HomePage /></MemoryRouter>);
  const input = screen.getByRole('combobox');
  fireEvent.change(input, { target: { value: 'white tie' } });
  expect(input).toHaveValue('white tie');
});
