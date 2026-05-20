import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ClosetCheck from './ClosetCheck';

const originalCreateElement = document.createElement.bind(document);

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      found: ['dark suit jacket', 'white dress shirt'],
      missing: ['dress trousers', 'Oxford shoes'],
      suggestions: ['Buy charcoal dress trousers', 'Buy black Oxford shoes'],
      suitableFor: [{ id: 'smart-casual', name: 'Smart Casual' }],
    }),
  }) as jest.Mock;

  global.URL.createObjectURL = jest.fn(() => 'blob:fake-url');
  global.URL.revokeObjectURL = jest.fn();

  jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
    if (tagName === 'canvas') {
      return {
        width: 0,
        height: 0,
        getContext: () => ({ drawImage: jest.fn() }),
        toDataURL: () => 'data:image/jpeg;base64,fake',
      } as unknown as HTMLCanvasElement;
    }

    return originalCreateElement(tagName);
  });

  Object.defineProperty(global, 'Image', {
    writable: true,
    value: class {
      width = 800;
      height = 600;
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;

      set src(_value: string) {
        this.onload?.();
      }
    },
  });
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

test('shows results after successful analysis with shopping and dress code links', async () => {
  render(<MemoryRouter><ClosetCheck initialDressCodeId="lounge-suit" /></MemoryRouter>);

  const file = new File(['fake'], 'closet.jpg', { type: 'image/jpeg' });
  const input = screen.getByTestId('photo-input');
  fireEvent.change(input, { target: { files: [file] } });

  fireEvent.click(screen.getByRole('button', { name: /analyse my closet/i }));

  await waitFor(() => {
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/analyze-closet',
      expect.objectContaining({ method: 'POST' })
    );
  });

  expect(await screen.findByText(/dark suit jacket/i)).toBeInTheDocument();
  expect(screen.getAllByText(/dress trousers/i).length).toBeGreaterThan(0);
  expect(screen.getAllByRole('link', { name: /buy on amazon/i })[0]).toHaveAttribute(
    'href',
    'https://www.amazon.com/s?k=Buy%20charcoal%20dress%20trousers',
  );
  expect(screen.getByRole('heading', { name: /your outfit suits/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /view guide/i })).toHaveAttribute(
    'href',
    '/dress-codes/smart-casual',
  );
});
