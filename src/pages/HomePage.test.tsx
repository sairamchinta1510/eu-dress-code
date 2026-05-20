import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HomePage from './HomePage';

const renderHomePage = () => render(<MemoryRouter><HomePage /></MemoryRouter>);

test('renders hero copy', () => {
  renderHomePage();
  expect(screen.getByText('European Dress Code Guide')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /Dress perfectly, every time\./i })).toBeInTheDocument();
});

test('renders featured and grouped dress code sections', () => {
  renderHomePage();

  const featuredSection = screen.getByLabelText(/featured dress codes/i);
  expect(within(featuredSection).getByText('White Tie')).toBeInTheDocument();
  expect(within(featuredSection).getByText('Smart Elegant')).toBeInTheDocument();

  const allDressCodesSection = screen.getByLabelText(/all dress codes/i);
  expect(within(allDressCodesSection).getByText('Festive Attire')).toBeInTheDocument();
  expect(within(allDressCodesSection).getByText('Ultra Formal & White Tie')).toBeInTheDocument();
  expect(within(allDressCodesSection).getAllByText(/^Casual$/).length).toBeGreaterThan(0);
});

test('search bar is present', () => {
  renderHomePage();
  const input = screen.getByRole('combobox');
  fireEvent.change(input, { target: { value: 'white tie' } });
  expect(input).toHaveValue('white tie');
});
