import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ClosetCheck from './ClosetCheck';

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      found: ['dark suit jacket', 'white dress shirt'],
      missing: ['dress trousers', 'Oxford shoes'],
      suggestions: ['Buy charcoal dress trousers', 'Buy black Oxford shoes'],
    }),
  }) as jest.Mock;
  global.URL.createObjectURL = jest.fn(() => 'blob:fake-url');
  global.FileReader = jest.fn().mockImplementation(() => ({
    readAsDataURL: jest.fn(function(this: any) {
      this.onload({ target: { result: 'data:image/jpeg;base64,fake' } });
    }),
    result: 'data:image/jpeg;base64,fake',
  })) as any;
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('renders dress code selector', () => {
  render(<MemoryRouter><ClosetCheck /></MemoryRouter>);
  expect(screen.getByLabelText(/target dress code/i)).toBeInTheDocument();
});

test('renders upload button', () => {
  render(<MemoryRouter><ClosetCheck /></MemoryRouter>);
  expect(screen.getByText(/upload closet photo/i)).toBeInTheDocument();
});

test('analyse button is disabled when no photo uploaded', () => {
  render(<MemoryRouter><ClosetCheck /></MemoryRouter>);
  expect(screen.getByRole('button', { name: /analyse my closet/i })).toBeDisabled();
});

test('shows results after successful analysis', async () => {
  render(<MemoryRouter><ClosetCheck initialDressCodeId="lounge-suit" /></MemoryRouter>);

  const file = new File(['fake'], 'closet.jpg', { type: 'image/jpeg' });
  const input = screen.getByTestId('photo-input');
  fireEvent.change(input, { target: { files: [file] } });

  fireEvent.click(screen.getByRole('button', { name: /analyse my closet/i }));

  await waitFor(() => {
    expect(screen.getByText(/dark suit jacket/i)).toBeInTheDocument();
    expect(screen.getAllByText(/dress trousers/i).length).toBeGreaterThan(0);
  });
});
