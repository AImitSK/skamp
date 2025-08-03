import { render, screen, fireEvent } from '../test-utils'
import { Button } from '@/components/ui/button'

describe('Button Component', () => {
  it('renders button with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('handles click events', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    
    fireEvent.click(screen.getByText('Click me'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('can be disabled', () => {
    const handleClick = jest.fn()
    render(<Button disabled onClick={handleClick}>Disabled</Button>)
    
    const button = screen.getByText('Disabled')
    expect(button).toBeDisabled()
    
    fireEvent.click(button)
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('applies color variants correctly', () => {
    const { rerender } = render(<Button color="indigo">Primary</Button>)
    expect(screen.getByText('Primary')).toHaveClass('bg-indigo-600')
    
    rerender(<Button plain>Plain</Button>)
    expect(screen.getByText('Plain')).toHaveClass('bg-transparent')
  })

  it('renders as a link when href is provided', () => {
    render(<Button href="/test">Link Button</Button>)
    const link = screen.getByText('Link Button').closest('a')
    expect(link).toHaveAttribute('href', '/test')
  })
})