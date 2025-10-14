import { toastService } from '../toast';
import toast from 'react-hot-toast';

jest.mock('react-hot-toast');

describe('toastService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show success toast', () => {
    toastService.success('Success message');
    expect(toast.success).toHaveBeenCalledWith(
      'Success message',
      expect.objectContaining({
        duration: 3000,
        position: 'top-right',
      })
    );
  });

  it('should show error toast with longer duration', () => {
    toastService.error('Error message');
    expect(toast.error).toHaveBeenCalledWith(
      'Error message',
      expect.objectContaining({
        duration: 5000,
      })
    );
  });

  it('should show info toast', () => {
    toastService.info('Info message');
    expect(toast).toHaveBeenCalledWith(
      'Info message',
      expect.objectContaining({
        duration: 4000,
        icon: 'ℹ️',
      })
    );
  });

  it('should show warning toast', () => {
    toastService.warning('Warning message');
    expect(toast).toHaveBeenCalledWith(
      'Warning message',
      expect.objectContaining({
        duration: 4000,
        icon: '⚠️',
      })
    );
  });

  it('should show loading toast', () => {
    toastService.loading('Loading message');
    expect(toast.loading).toHaveBeenCalledWith(
      'Loading message',
      expect.objectContaining({
        position: 'top-right',
      })
    );
  });

  it('should dismiss specific toast', () => {
    toastService.dismiss('toast-id-123');
    expect(toast.dismiss).toHaveBeenCalledWith('toast-id-123');
  });

  it('should dismiss all toasts', () => {
    toastService.dismissAll();
    expect(toast.dismiss).toHaveBeenCalled();
  });

  it('should handle promise-based toasts', () => {
    const mockPromise = Promise.resolve('success');
    const messages = {
      loading: 'Loading...',
      success: 'Success!',
      error: 'Error!',
    };

    toastService.promise(mockPromise, messages);
    expect(toast.promise).toHaveBeenCalledWith(
      mockPromise,
      messages,
      expect.objectContaining({
        position: 'top-right',
      })
    );
  });
});
