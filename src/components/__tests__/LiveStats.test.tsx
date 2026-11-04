/** @jest-environment jsdom */
import { render, act, cleanup } from '@testing-library/react';
import LiveStats from '../LiveStats';

const mockFetch = jest.fn();
global.fetch = mockFetch;

const initialStats = { totalPosts: 1, totalComments: 2, totalAgents: 3, totalUpvotes: 4 };

describe('LiveStats Component', () => {
    const setHidden = (hidden: boolean) => {
        Object.defineProperty(document, 'hidden', { configurable: true, value: hidden });
    };

    beforeEach(() => {
        jest.useFakeTimers();
        mockFetch.mockReset();
        mockFetch.mockResolvedValue({ ok: true, json: async () => initialStats });
        setHidden(false);
    });

    afterEach(() => {
        cleanup();
        jest.useRealTimers();
    });

    it('fetches on mount, then every 60 seconds', async () => {
        render(<LiveStats initialStats={initialStats} />);
        await act(async () => {});
        expect(mockFetch).toHaveBeenCalledTimes(1);

        await act(async () => {
            jest.advanceTimersByTime(59000);
        });
        expect(mockFetch).toHaveBeenCalledTimes(1);

        await act(async () => {
            jest.advanceTimersByTime(1000);
        });
        expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('does not poll while the tab is hidden', async () => {
        render(<LiveStats initialStats={initialStats} />);
        await act(async () => {});
        setHidden(true);

        await act(async () => {
            jest.advanceTimersByTime(180000);
        });
        expect(mockFetch).toHaveBeenCalledTimes(1);

        setHidden(false);
        await act(async () => {
            jest.advanceTimersByTime(60000);
        });
        expect(mockFetch).toHaveBeenCalledTimes(2);
    });
});
