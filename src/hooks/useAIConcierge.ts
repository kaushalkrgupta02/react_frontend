import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  action?: {
    action: 'confirm_booking' | 'confirm_line_skip';
    details: any;
    message: string;
  };
  timestamp: Date;
}

export function useAIConcierge() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const sendMessage = useCallback(async (content: string) => {
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Build messages array for API
      const apiMessages = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content
      }));

      const { data, error } = await supabase.functions.invoke('ai-concierge', {
        body: { 
          messages: apiMessages,
          userId: user?.id 
        }
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        if (data.type === 'rate_limit') {
          toast.error('Too many requests. Please wait a moment.');
        } else {
          toast.error(data.error);
        }
        return;
      }

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.message || 'I apologize, I could not process that request.',
        action: data.action,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI Concierge error:', error);
      toast.error('Failed to get response. Please try again.');
      
      // Add error message to chat
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'I apologize, something went wrong. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, user]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const confirmAction = useCallback(async (action: ChatMessage['action']) => {
    if (!action || !user) {
      toast.error('Please sign in to complete this action');
      return false;
    }

    try {
      if (action.action === 'confirm_booking') {
        const { error } = await supabase.from('bookings').insert({
          user_id: user.id,
          venue_id: action.details.venue_id,
          booking_date: action.details.booking_date,
          party_size: action.details.party_size,
          special_requests: action.details.special_requests,
          status: 'pending'
        });

        if (error) throw error;
        
        toast.success(`Booking confirmed at ${action.details.venue_name}!`);
        
        // Add confirmation to chat
        const confirmMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `✅ Your booking at ${action.details.venue_name} for ${action.details.party_size} guests on ${action.details.booking_date} has been submitted! You'll receive a confirmation soon.`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, confirmMessage]);
        
        return true;
      }

      if (action.action === 'confirm_line_skip') {
        const { data, error } = await supabase.rpc('purchase_line_skip_pass', {
          p_user_id: user.id,
          p_venue_id: action.details.venue_id
        });

        if (error) throw error;
        
        const result = data as { success: boolean; error?: string };
        if (!result.success) {
          toast.error(result.error || 'Failed to purchase line skip');
          return false;
        }
        
        toast.success(`Line skip pass purchased for ${action.details.venue_name}!`);
        
        // Add confirmation to chat
        const confirmMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `✅ Your line skip pass for ${action.details.venue_name} has been purchased! Show it at the door tonight.`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, confirmMessage]);
        
        return true;
      }
    } catch (error) {
      console.error('Action confirmation error:', error);
      toast.error('Failed to complete action. Please try again.');
      return false;
    }

    return false;
  }, [user]);

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
    confirmAction
  };
}
