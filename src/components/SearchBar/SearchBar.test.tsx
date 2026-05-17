import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SearchBar from './SearchBar';
import * as useLLMSearchModule from '../../hooks/useLLMSearch';
import { dressCodes } from '../../data/dressCodes';

const mockSearch = jest.fn();

const mockHookIdle = {
  results: dressCodes.map((d) => ({ dressCode: d, relevance: 0, reason: '' })),
  loading: false,
  error: null,
  search: mockSearch,
};

const mockHookLoading = { ...mockHookIdle, loading: true, results: [] };

const mockHookResults = {
  ...mockHookIdle,
  results: [
    { dressCode: dressCodes[0], relevance: 5, reason: 'Perfect for formal evening galas.' },
  ],
};

const mockHookError = { ...mockHookIdle, error: 'Search unavailable — try again', results: [] };

describe('SearchBar', () => {
  beforeEach(() => {
    jest.spyOn(useLLMSearchModule, 'useLLMSearch').mockReturnValue(mockHookIdle);
  });

  it('renders search input', () => {
    render(<MemoryRouter><SearchBar /></MemoryRouter>);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('shows loading spinner when loading', () => {
    jest.spyOn(useLLMSearchModule, 'useLLMSearch').mockReturnValue(mockHookLoading);
    render(<MemoryRouter><SearchBar /></MemoryRouter>);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('calls search on Enter key', () => {
    render(<MemoryRouter><SearchBar /></MemoryRouter>);
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'gala dinner' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(mockSearch).toHaveBeenCalledWith('gala dinner');
  });

  it('shows reason text in dropdown results', async () => {
    jest.spyOn(useLLMSearchModule, 'useLLMSearch').mockReturnValue(mockHookResults);
    render(<MemoryRouter><SearchBar /></MemoryRouter>);
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'gala' } });
    await waitFor(() => {
      expect(screen.getByText('Perfect for formal evening galas.')).toBeInTheDocument();
    });
  });

  it('shows error message in dropdown when search fails', async () => {
    jest.spyOn(useLLMSearchModule, 'useLLMSearch').mockReturnValue(mockHookError);
    render(<MemoryRouter><SearchBar /></MemoryRouter>);
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'anything' } });
    await waitFor(() => {
      expect(screen.getByText('Search unavailable — try again')).toBeInTheDocument();
    });
  });
});
