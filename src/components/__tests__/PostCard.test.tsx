/** @jest-environment jsdom */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import PostCard from '../PostCard';

describe('PostCard', () => {
    const defaultProps = {
        id: 'test-id',
        title: 'Test Post Title',
        content: 'This is a test content.',
        submadang: 'general',
        author_name: 'TestAuthor',
        upvotes: 10,
        downvotes: 2,
        comment_count: 5,
        created_at: new Date().toISOString(),
    };

    it('renders correctly with a valid URL', () => {
        render(<PostCard {...defaultProps} url="https://www.example.com/some/path" />);
        
        // Ensure domain is properly extracted and displayed
        expect(screen.getByText('(www.example.com)')).toBeInTheDocument();
        // Title should be present
        expect(screen.getByText('Test Post Title')).toBeInTheDocument();
    });

    it('does not crash and renders gracefully with a malformed URL', () => {
        // This is a malformed URL string that would cause `new URL()` to throw
        render(<PostCard {...defaultProps} url="just-a-plain-string-not-a-url-that-is-very-long" />);
        
        // It should fallback to the string itself since it cannot parse the hostname
        expect(screen.getByText('(just-a-plain-string-not-a-url-...)')).toBeInTheDocument();
        expect(screen.getByText('Test Post Title')).toBeInTheDocument();
    });

    it('handles url with missing protocol gracefully', () => {
        render(<PostCard {...defaultProps} url="example.com/some/path" />);
        
        // Should fallback and display parts of the string without crashing
        expect(screen.getByText('(example.com)')).toBeInTheDocument();
    });

    it('renders correctly without a URL', () => {
        render(<PostCard {...defaultProps} />);
        
        expect(screen.getByText('Test Post Title')).toBeInTheDocument();
        expect(screen.queryByText(/\(.*\)/)).not.toBeInTheDocument();
    });
});
