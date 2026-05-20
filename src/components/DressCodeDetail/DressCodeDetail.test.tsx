import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DressCodeDetail from './DressCodeDetail';
import { dressCodes } from '../../data/dressCodes';

const blackTie = dressCodes.find((d) => d.id === 'black-tie')!;
const whiteTie = dressCodes.find((d) => d.id === 'white-tie')!;

test('renders dress code name', () => {
  render(<MemoryRouter><DressCodeDetail dressCode={blackTie} /></MemoryRouter>);
  expect(screen.getByText('Black Tie')).toBeInTheDocument();
});

test('renders Men tab by default', () => {
  render(<MemoryRouter><DressCodeDetail dressCode={blackTie} /></MemoryRouter>);
  expect(screen.getByRole('tab', { name: /👔 men/i })).toHaveAttribute('aria-selected', 'true');
});

test('switches to Women tab on click', () => {
  render(<MemoryRouter><DressCodeDetail dressCode={blackTie} /></MemoryRouter>);
  fireEvent.click(screen.getByRole('tab', { name: /👗 women/i }));
  expect(screen.getByRole('tab', { name: /👗 women/i })).toHaveAttribute('aria-selected', 'true');
});

test('shows carousel navigation counter', () => {
  render(<MemoryRouter><DressCodeDetail dressCode={blackTie} /></MemoryRouter>);
  expect(screen.getByText('2 / 17')).toBeInTheDocument();
});

test('disables previous navigation on the first dress code', () => {
  render(<MemoryRouter><DressCodeDetail dressCode={whiteTie} /></MemoryRouter>);
  expect(screen.getByRole('button', { name: /previous dress code/i })).toBeDisabled();
  expect(screen.getByRole('button', { name: /next dress code/i })).toBeEnabled();
});

test('shows shoe colour', () => {
  render(<MemoryRouter><DressCodeDetail dressCode={blackTie} /></MemoryRouter>);
  expect(screen.getByText(/Black patent leather/i)).toBeInTheDocument();
});

test('shows dos and donts', () => {
  render(<MemoryRouter><DressCodeDetail dressCode={blackTie} /></MemoryRouter>);
  expect(screen.getByText(/Wear a proper bow tie/i)).toBeInTheDocument();
  expect(screen.getByText(/Never wear a long necktie/i)).toBeInTheDocument();
});
