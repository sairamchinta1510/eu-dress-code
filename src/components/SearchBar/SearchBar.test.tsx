import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SearchBar from './SearchBar';
import * as useLLMSearchModule from '../../hooks/useLLMSearch';
import { dressCodes } from '../../data/dressCodes';

const mockSearch = jest.fn();
const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

jest.mock('../../hooks/useGeolocation', () => ({
  useGeolocation: () => null,
}));

const mockHookIdle = {
  results: dressCodes.map((d) => ({ dressCode: d, relevance: 0, reason: '' })),
  recommendation: null,
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

const renderSearchBar = () => render(<MemoryRouter><SearchBar /></MemoryRouter>);

describe('SearchBar', () => {
  beforeEach(() => {
    mockSearch.mockReset();
    mockNavigate.mockReset();
    jest.spyOn(useLLMSearchModule, 'useLLMSearch').mockReturnValue(mockHookIdle);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders search input', () => {
    renderSearchBar();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('shows loading spinner when loading', () => {
    jest.spyOn(useLLMSearchModule, 'useLLMSearch').mockReturnValue(mockHookLoading);
    renderSearchBar();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('navigates to the search page on Enter when no result is selected', () => {
    renderSearchBar();
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'gala dinner' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(mockNavigate).toHaveBeenCalledWith('/search?q=gala%20dinner');
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it('shows reason text in dropdown results', async () => {
    jest.spyOn(useLLMSearchModule, 'useLLMSearch').mockReturnValue(mockHookResults);
    renderSearchBar();
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'gala' } });
    await waitFor(() => {
      expect(screen.getByText('Perfect for formal evening galas.')).toBeInTheDocument();
    });
  });

  it('navigates to the search page when the search button is clicked', () => {
    renderSearchBar();
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'gala dinner' } });
    fireEvent.click(screen.getByRole('button', { name: /^search$/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/search?q=gala%20dinner');
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it('shows error message in dropdown when search fails', async () => {
    jest.spyOn(useLLMSearchModule, 'useLLMSearch').mockReturnValue(mockHookError);
    renderSearchBar();
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'anything' } });
    await waitFor(() => {
      expect(screen.getByText('Search unavailable — try again')).toBeInTheDocument();
    });
  });
});
