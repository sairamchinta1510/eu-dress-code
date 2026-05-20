import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DressCodeCard from './DressCodeCard';
import { dressCodes } from '../../data/dressCodes';

const loungeSuit = dressCodes.find((d) => d.id === 'lounge-suit')!;

const renderCard = (dressCode = loungeSuit) => {
  render(
    <MemoryRouter>
      <DressCodeCard dressCode={dressCode} />
    </MemoryRouter>
  );
};

test('renders dress code name and icon', () => {
  renderCard();
  expect(screen.getByText('Lounge Suit')).toBeInTheDocument();
  expect(screen.getByText('💼')).toBeInTheDocument();
});

test('renders formality scale accessibility label', () => {
  renderCard();
  expect(screen.getByLabelText('Formality: 3 out of 5')).toBeInTheDocument();
});

test('links to the dress code detail page', () => {
  renderCard();
  const link = screen.getByRole('link');
  expect(link).toHaveAttribute('href', '/dress-codes/lounge-suit');
});

test('shows "Formal" badge for formality 5', () => {
  const whiteTie = dressCodes.find((d) => d.id === 'white-tie')!;
  renderCard(whiteTie);
  expect(screen.getByText('Formal')).toBeInTheDocument();
});

test('shows "Semi" badge for formality 3', () => {
  renderCard();
  expect(screen.getByText('Semi')).toBeInTheDocument();
});

test('shows "Casual" badge for formality ≤ 2', () => {
  const casual = dressCodes.find((d) => d.formality <= 2)!;
  renderCard(casual);
  expect(screen.getByText('Casual')).toBeInTheDocument();
});
