import { render, screen } from '@testing-library/react';
import App from './App';

test('renders main header and CTA', () => {
  render(<App />);
  // Check that the main app title is present
  const title = screen.getByText(/CodeEditor/i);
  expect(title).toBeInTheDocument();

  // Check for hero CTA text
  const cta = screen.getByText(/Try the editor/i);
  expect(cta).toBeInTheDocument();
});
