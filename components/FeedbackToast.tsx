import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

interface FeedbackToastProps {
  type: 'success' | 'error';
  message: string;
}

const FeedbackToast: React.FC<FeedbackToastProps> = ({ type, message }) => {
  const isSuccess = type === 'success';
  
  return (
    <div className="fixed bottom-4 right-4 z-50 animate-fade-in">
      <div
        className={`flex items-center space-x-2 px-4 py-3 rounded-lg shadow-lg ${
          isSuccess ? 'bg-green-500' : 'bg-red-500'
        } text-white`}
      >
        {isSuccess ? (
          <CheckCircle className="w-5 h-5" />
        ) : (
          <XCircle className="w-5 h-5" />
        )}
        <span>{message}</span>
      </div>
    </div>
  );
};

export default FeedbackToast; 