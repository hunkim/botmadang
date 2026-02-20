/** @jest-environment jsdom */
import '@testing-library/jest-dom';
import { render, screen, act, cleanup, fireEvent } from '@testing-library/react';
import LiveFeed from '../LiveFeed';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('LiveFeed Component', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        mockFetch.mockClear();
        // Setup default mock response
        mockFetch.mockResolvedValue({
            json: jest.fn().mockResolvedValue({ success: true, posts: [] }),
        });
    });

    afterEach(() => {
        act(() => {
            jest.runOnlyPendingTimers();
        });
        jest.useRealTimers();
        cleanup();
    });

    const initialPosts = [
        {
            id: '1',
            type: 'post' as const,
            title: 'Test Post 1',
            author_name: 'Author 1',
            created_at: new Date().toISOString(),
        }
    ];

    it('renders initial posts', () => {
        render(<LiveFeed initialPosts={initialPosts} />);
        expect(screen.getByText('Test Post 1')).toBeInTheDocument();
        expect(screen.getByText('Author 1')).toBeInTheDocument();
    });

    it('polls for new posts every 5 seconds', async () => {
        render(<LiveFeed initialPosts={initialPosts} />);
        
        // Initial render does NOT fetch immediately (it's inside setInterval)
        expect(mockFetch).not.toHaveBeenCalled();

        // Advance timer by 5 seconds
        await act(async () => {
            jest.advanceTimersByTime(5000);
        });

        // Now it should have fetched
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(mockFetch).toHaveBeenCalledWith('/api/v1/posts?sort=new&limit=20', expect.any(Object));
    });

    it('cleans up interval and aborts fetch on unmount to prevent memory leaks', async () => {
        const { unmount } = render(<LiveFeed initialPosts={initialPosts} />);
        
        // Advance time to trigger a fetch
        await act(async () => {
            jest.advanceTimersByTime(5000);
        });

        expect(mockFetch).toHaveBeenCalledTimes(1);

        // Get the AbortSignal passed to fetch
        const fetchOptions = mockFetch.mock.calls[0][1];
        const signal = fetchOptions.signal;
        
        expect(signal.aborted).toBe(false);

        // Unmount the component
        unmount();

        // The AbortController should have been aborted
        expect(signal.aborted).toBe(true);

        // Advance time again to ensure setInterval was cleared
        await act(async () => {
            jest.advanceTimersByTime(10000);
        });

        // fetch should still only be called 1 time (the interval was cleared)
        expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('pauses and resumes polling correctly', async () => {
        render(<LiveFeed initialPosts={initialPosts} />);
        
        // Click pause
        const pauseBtn = screen.getByRole('button', { name: /일시정지/ });
        fireEvent.click(pauseBtn);
        
        // Advance time 10 seconds
        await act(async () => {
            jest.advanceTimersByTime(10000);
        });
        
        // Should not fetch because it's paused
        expect(mockFetch).not.toHaveBeenCalled();
        
        // Click resume
        const resumeBtn = screen.getByRole('button', { name: /재개/ });
        fireEvent.click(resumeBtn);
        
        // Advance time 5 seconds
        await act(async () => {
            jest.advanceTimersByTime(5000);
        });
        
        // Now it should fetch
        expect(mockFetch).toHaveBeenCalledTimes(1);
    });
});
