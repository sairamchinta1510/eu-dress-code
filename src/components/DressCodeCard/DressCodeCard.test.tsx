import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DressCodeCard from './DressCodeCard';
import { dressCodes } from '../../data/dressCodes';

const loungeSuit = dressCodes.find((d) => d.id === 'lounge-suit')!;

test('renders dress code name and icon', () => {
  render(
    <MemoryRouter>
      <DressCodeCard dressCode={loungeSuit} />
    </MemoryRouter>
  );
  expect(screen.getByText('Lounge Suit')).toBeInTheDocument();
  expect(screen.getByText('💼')).toBeInTheDocument();
});

test('renders formality label', () => {
  render(
    <MemoryRouter>
      <DressCodeCard dressCode={loungeSuit} />
    </MemoryRouter>
  );
  expect(screen.getByText('Semi-Formal')).toBeInTheDocument();
});

test('links to the dress code detail page', () => {
  render(
    <MemoryRouter>
      <DressCodeCard dressCode={loungeSuit} />
    </MemoryRouter>
  );
  const link = screen.getByRole('link');
  expect(link).toHaveAttribute('href', '/dress-codes/lounge-suit');
});

test('shows "Formal" badge for formality 5', () => {
  const whiteTie = dressCodes.find((d) => d.id === 'white-tie')!;
  render(
    <MemoryRouter>
      <DressCodeCard dressCode={whiteTie} />
    </MemoryRouter>
  );
  expect(screen.getByText('Formal')).toBeInTheDocument();
});

test('shows "Semi" badge for formality 3', () => {
  render(
    <MemoryRouter>
      <DressCodeCard dressCode={loungeSuit} />
    </MemoryRouter>
  );
  expect(screen.getByText('Semi')).toBeInTheDocument();
});

test('shows "Casual" badge for formality ≤ 2', () => {
  const casual = dressCodes.find((d) => d.formality <= 2)!;
  render(
    <MemoryRouter>
      <DressCodeCard dressCode={casual} />
    </MemoryRouter>
  );
  expect(screen.getByText('Casual')).toBeInTheDocument();
});
