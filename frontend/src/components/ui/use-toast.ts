import { toast } from 'react-hot-toast';

export interface ToastProps {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
  duration?: number;
}

export const useToast = () => {
  const showToast = (props: ToastProps) => {
    const { title, description, variant = 'default', duration = 4000 } = props;
    
    const message = title && description ? `${title}: ${description}` : title || description || '';
    
    if (variant === 'destructive') {
      toast.error(message, { duration });
    } else {
      toast.success(message, { duration });
    }
  };

  return {
    toast: showToast,
  };
};