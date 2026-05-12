import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BottomNav from './BottomNav';

test('renders all three navigation tabs', () => {
  render(
    <MemoryRouter>
      <BottomNav />
    </MemoryRouter>
  );
  expect(screen.getByText(/Dress Codes/i)).toBeInTheDocument();
  expect(screen.getByText(/Calendar/i)).toBeInTheDocument();
  expect(screen.getByText(/Closet/i)).toBeInTheDocument();
});

test('highlights the active tab', () => {
  render(
    <MemoryRouter initialEntries={['/calendar']}>
      <BottomNav />
    </MemoryRouter>
  );
  const calendarLink = screen.getByText(/Calendar/i).closest('a');
  expect(calendarLink).toHaveClass('active');
});
