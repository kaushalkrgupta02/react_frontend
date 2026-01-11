export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_learning_insights: {
        Row: {
          confidence: number | null
          created_at: string
          data_points: Json | null
          description: string
          id: string
          insight_type: string
          is_actioned: boolean | null
          title: string
          venue_id: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          data_points?: Json | null
          description: string
          id?: string
          insight_type: string
          is_actioned?: boolean | null
          title: string
          venue_id?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string
          data_points?: Json | null
          description?: string
          id?: string
          insight_type?: string
          is_actioned?: boolean | null
          title?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_learning_insights_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_prediction_logs: {
        Row: {
          accuracy_score: number | null
          actual_value: Json | null
          confidence_score: number | null
          created_at: string
          evaluated_at: string | null
          id: string
          model_version: string | null
          predicted_value: Json
          prediction_date: string
          prediction_type: string
          venue_id: string
        }
        Insert: {
          accuracy_score?: number | null
          actual_value?: Json | null
          confidence_score?: number | null
          created_at?: string
          evaluated_at?: string | null
          id?: string
          model_version?: string | null
          predicted_value: Json
          prediction_date: string
          prediction_type: string
          venue_id: string
        }
        Update: {
          accuracy_score?: number | null
          actual_value?: Json | null
          confidence_score?: number | null
          created_at?: string
          evaluated_at?: string | null
          id?: string
          model_version?: string | null
          predicted_value?: Json
          prediction_date?: string
          prediction_type?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_prediction_logs_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_recommendations: {
        Row: {
          action_result: Json | null
          actioned_at: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          match_factors: Json | null
          match_reasoning: string | null
          match_score: number | null
          recommendation_type: string
          source_id: string | null
          source_type: string | null
          target_segment: string | null
          target_user_id: string | null
          timing_recommendation: Json | null
          was_actioned: boolean | null
        }
        Insert: {
          action_result?: Json | null
          actioned_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          match_factors?: Json | null
          match_reasoning?: string | null
          match_score?: number | null
          recommendation_type: string
          source_id?: string | null
          source_type?: string | null
          target_segment?: string | null
          target_user_id?: string | null
          timing_recommendation?: Json | null
          was_actioned?: boolean | null
        }
        Update: {
          action_result?: Json | null
          actioned_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          match_factors?: Json | null
          match_reasoning?: string | null
          match_score?: number | null
          recommendation_type?: string
          source_id?: string | null
          source_type?: string | null
          target_segment?: string | null
          target_user_id?: string | null
          timing_recommendation?: Json | null
          was_actioned?: boolean | null
        }
        Relationships: []
      }
      availability_slots: {
        Row: {
          area_zone: string | null
          cached_at: string | null
          deposit_amount: number | null
          duration_minutes: number | null
          end_time: string | null
          expires_at: string | null
          id: string
          is_available: boolean | null
          min_spend: number | null
          party_max: number | null
          party_min: number | null
          provider: string
          provider_slot_id: string | null
          requires_deposit: boolean | null
          slot_date: string
          slots_remaining: number | null
          start_time: string
          table_type: string | null
          venue_id: string
        }
        Insert: {
          area_zone?: string | null
          cached_at?: string | null
          deposit_amount?: number | null
          duration_minutes?: number | null
          end_time?: string | null
          expires_at?: string | null
          id?: string
          is_available?: boolean | null
          min_spend?: number | null
          party_max?: number | null
          party_min?: number | null
          provider: string
          provider_slot_id?: string | null
          requires_deposit?: boolean | null
          slot_date: string
          slots_remaining?: number | null
          start_time: string
          table_type?: string | null
          venue_id: string
        }
        Update: {
          area_zone?: string | null
          cached_at?: string | null
          deposit_amount?: number | null
          duration_minutes?: number | null
          end_time?: string | null
          expires_at?: string | null
          id?: string
          is_available?: boolean | null
          min_spend?: number | null
          party_max?: number | null
          party_min?: number | null
          provider?: string
          provider_slot_id?: string | null
          requires_deposit?: boolean | null
          slot_date?: string
          slots_remaining?: number | null
          start_time?: string
          table_type?: string | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_slots_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_deposits: {
        Row: {
          amount: number
          booking_id: string | null
          charged_no_show_at: string | null
          created_at: string
          currency: string | null
          external_payment_id: string | null
          id: string
          notes: string | null
          package_purchase_id: string | null
          payment_method: string | null
          payment_provider: string | null
          purchase_type: string
          refund_amount: number | null
          refunded_at: string | null
          status: string
          updated_at: string
          user_id: string | null
          venue_id: string
        }
        Insert: {
          amount: number
          booking_id?: string | null
          charged_no_show_at?: string | null
          created_at?: string
          currency?: string | null
          external_payment_id?: string | null
          id?: string
          notes?: string | null
          package_purchase_id?: string | null
          payment_method?: string | null
          payment_provider?: string | null
          purchase_type?: string
          refund_amount?: number | null
          refunded_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          venue_id: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          charged_no_show_at?: string | null
          created_at?: string
          currency?: string | null
          external_payment_id?: string | null
          id?: string
          notes?: string | null
          package_purchase_id?: string | null
          payment_method?: string | null
          payment_provider?: string | null
          purchase_type?: string
          refund_amount?: number | null
          refunded_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_deposits_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_deposits_package_purchase_id_fkey"
            columns: ["package_purchase_id"]
            isOneToOne: false
            referencedRelation: "package_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_deposits_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_guests: {
        Row: {
          booking_id: string
          check_in_status: string | null
          checked_in_at: string | null
          created_at: string | null
          guest_email: string | null
          guest_name: string | null
          guest_number: number
          guest_phone: string | null
          id: string
          is_primary: boolean | null
          notes: string | null
          qr_code: string
          spend_amount: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          booking_id: string
          check_in_status?: string | null
          checked_in_at?: string | null
          created_at?: string | null
          guest_email?: string | null
          guest_name?: string | null
          guest_number: number
          guest_phone?: string | null
          id?: string
          is_primary?: boolean | null
          notes?: string | null
          qr_code: string
          spend_amount?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          booking_id?: string
          check_in_status?: string | null
          checked_in_at?: string | null
          created_at?: string | null
          guest_email?: string | null
          guest_name?: string | null
          guest_number?: number
          guest_phone?: string | null
          id?: string
          is_primary?: boolean | null
          notes?: string | null
          qr_code?: string
          spend_amount?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_guests_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_guests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      booking_outcomes: {
        Row: {
          actual_party_size: number | null
          arrived_at: string | null
          booking_id: string
          created_at: string
          feedback_rating: number | null
          feedback_text: string | null
          id: string
          outcome: string
          spend_amount: number | null
          venue_id: string
        }
        Insert: {
          actual_party_size?: number | null
          arrived_at?: string | null
          booking_id: string
          created_at?: string
          feedback_rating?: number | null
          feedback_text?: string | null
          id?: string
          outcome: string
          spend_amount?: number | null
          venue_id: string
        }
        Update: {
          actual_party_size?: number | null
          arrived_at?: string | null
          booking_id?: string
          created_at?: string
          feedback_rating?: number | null
          feedback_text?: string | null
          id?: string
          outcome?: string
          spend_amount?: number | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_outcomes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_outcomes_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_reminders: {
        Row: {
          booking_id: string
          channel: string
          created_at: string
          error_message: string | null
          id: string
          reminder_type: string
          scheduled_for: string
          sent_at: string | null
          status: string | null
        }
        Insert: {
          booking_id: string
          channel?: string
          created_at?: string
          error_message?: string | null
          id?: string
          reminder_type: string
          scheduled_for: string
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          booking_id?: string
          channel?: string
          created_at?: string
          error_message?: string | null
          id?: string
          reminder_type?: string
          scheduled_for?: string
          sent_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_reminders_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          arrival_window: string | null
          booking_date: string
          booking_reference: string
          booking_type: string | null
          can_cancel: boolean | null
          cancel_cutoff_at: string | null
          created_at: string
          end_time: string | null
          id: string
          party_size: number
          pass_status: string | null
          resource_name: string | null
          special_requests: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
          user_id: string
          venue_id: string
        }
        Insert: {
          arrival_window?: string | null
          booking_date: string
          booking_reference?: string
          booking_type?: string | null
          can_cancel?: boolean | null
          cancel_cutoff_at?: string | null
          created_at?: string
          end_time?: string | null
          id?: string
          party_size?: number
          pass_status?: string | null
          resource_name?: string | null
          special_requests?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          user_id: string
          venue_id: string
        }
        Update: {
          arrival_window?: string | null
          booking_date?: string
          booking_reference?: string
          booking_type?: string | null
          can_cancel?: boolean | null
          cancel_cutoff_at?: string | null
          created_at?: string
          end_time?: string | null
          id?: string
          party_size?: number
          pass_status?: string | null
          resource_name?: string | null
          special_requests?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          user_id?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          cart_id: string
          created_at: string
          id: string
          product_id: string
          quantity: number
          unit_price_idr: number
          updated_at: string
        }
        Insert: {
          cart_id: string
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          unit_price_idr: number
          updated_at?: string
        }
        Update: {
          cart_id?: string
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          unit_price_idr?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          created_at: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customer_segments: {
        Row: {
          avg_party_size: number | null
          calculation_version: string | null
          clv_score: number | null
          created_at: string | null
          id: string
          last_calculated_at: string | null
          no_show_risk: number | null
          preferred_arrival_hour: number | null
          preferred_day_of_week: number | null
          preferred_venue_types: string[] | null
          promo_responsiveness: number | null
          raw_metrics: Json | null
          rfm_frequency: number | null
          rfm_monetary: number | null
          rfm_recency_days: number | null
          rfm_tier: string | null
          segment_name: string
          segment_score: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avg_party_size?: number | null
          calculation_version?: string | null
          clv_score?: number | null
          created_at?: string | null
          id?: string
          last_calculated_at?: string | null
          no_show_risk?: number | null
          preferred_arrival_hour?: number | null
          preferred_day_of_week?: number | null
          preferred_venue_types?: string[] | null
          promo_responsiveness?: number | null
          raw_metrics?: Json | null
          rfm_frequency?: number | null
          rfm_monetary?: number | null
          rfm_recency_days?: number | null
          rfm_tier?: string | null
          segment_name: string
          segment_score?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avg_party_size?: number | null
          calculation_version?: string | null
          clv_score?: number | null
          created_at?: string | null
          id?: string
          last_calculated_at?: string | null
          no_show_risk?: number | null
          preferred_arrival_hour?: number | null
          preferred_day_of_week?: number | null
          preferred_venue_types?: string[] | null
          promo_responsiveness?: number | null
          raw_metrics?: Json | null
          rfm_frequency?: number | null
          rfm_monetary?: number | null
          rfm_recency_days?: number | null
          rfm_tier?: string | null
          segment_name?: string
          segment_score?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      external_reservations: {
        Row: {
          booking_id: string | null
          created_at: string | null
          error_message: string | null
          id: string
          idempotency_key: string
          last_synced_at: string | null
          next_retry_at: string | null
          provider: string
          provider_confirmation_number: string | null
          provider_reservation_id: string | null
          provider_response: Json | null
          provider_status: string | null
          retry_count: number | null
          sync_status: string | null
          updated_at: string | null
          venue_id: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          idempotency_key: string
          last_synced_at?: string | null
          next_retry_at?: string | null
          provider: string
          provider_confirmation_number?: string | null
          provider_reservation_id?: string | null
          provider_response?: Json | null
          provider_status?: string | null
          retry_count?: number | null
          sync_status?: string | null
          updated_at?: string | null
          venue_id: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          idempotency_key?: string
          last_synced_at?: string | null
          next_retry_at?: string | null
          provider?: string
          provider_confirmation_number?: string | null
          provider_reservation_id?: string | null
          provider_response?: Json | null
          provider_status?: string | null
          retry_count?: number | null
          sync_status?: string | null
          updated_at?: string | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_reservations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_reservations_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_notes: {
        Row: {
          created_at: string
          guest_profile_id: string
          id: string
          is_pinned: boolean | null
          note_text: string
          note_type: string | null
          staff_user_id: string | null
          venue_id: string
        }
        Insert: {
          created_at?: string
          guest_profile_id: string
          id?: string
          is_pinned?: boolean | null
          note_text: string
          note_type?: string | null
          staff_user_id?: string | null
          venue_id: string
        }
        Update: {
          created_at?: string
          guest_profile_id?: string
          id?: string
          is_pinned?: boolean | null
          note_text?: string
          note_type?: string | null
          staff_user_id?: string | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_notes_guest_profile_id_fkey"
            columns: ["guest_profile_id"]
            isOneToOne: false
            referencedRelation: "venue_guest_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_notes_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      line_skip_passes: {
        Row: {
          created_at: string
          free_item_claimed: boolean
          id: string
          pass_type: string
          price: number
          purchase_date: string
          status: string
          user_id: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          free_item_claimed?: boolean
          id?: string
          pass_type?: string
          price: number
          purchase_date?: string
          status?: string
          user_id: string
          venue_id: string
        }
        Update: {
          created_at?: string
          free_item_claimed?: boolean
          id?: string
          pass_type?: string
          price?: number
          purchase_date?: string
          status?: string
          user_id?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "line_skip_passes_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      location_promos: {
        Row: {
          created_at: string
          days_of_week: number[] | null
          id: string
          is_active: boolean
          location_type: Database["public"]["Enums"]["location_target_type"]
          promo_id: string
          radius_km: number
          time_window_end: string | null
          time_window_start: string | null
          updated_at: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          days_of_week?: number[] | null
          id?: string
          is_active?: boolean
          location_type?: Database["public"]["Enums"]["location_target_type"]
          promo_id: string
          radius_km?: number
          time_window_end?: string | null
          time_window_start?: string | null
          updated_at?: string
          venue_id: string
        }
        Update: {
          created_at?: string
          days_of_week?: number[] | null
          id?: string
          is_active?: boolean
          location_type?: Database["public"]["Enums"]["location_target_type"]
          promo_id?: string
          radius_km?: number
          time_window_end?: string | null
          time_window_start?: string | null
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_promos_promo_id_fkey"
            columns: ["promo_id"]
            isOneToOne: false
            referencedRelation: "promos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_promos_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_plans: {
        Row: {
          created_at: string
          currency: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          price_monthly: number
        }
        Insert: {
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          price_monthly: number
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price_monthly?: number
        }
        Relationships: []
      }
      membership_subscriptions: {
        Row: {
          canceled_at: string | null
          created_at: string
          id: string
          plan_id: string
          renews_at: string | null
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          canceled_at?: string | null
          created_at?: string
          id?: string
          plan_id: string
          renews_at?: string | null
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          canceled_at?: string | null
          created_at?: string
          id?: string
          plan_id?: string
          renews_at?: string | null
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          dietary_tags: string[] | null
          id: string
          image_url: string | null
          is_available: boolean
          menu_id: string
          name: string
          price: number | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          dietary_tags?: string[] | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          menu_id: string
          name: string
          price?: number | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          dietary_tags?: string[] | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          menu_id?: string
          name?: string
          price?: number | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
        ]
      }
      menus: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
          venue_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "menus_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          deep_link: string | null
          id: string
          read_at: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          deep_link?: string | null
          id?: string
          read_at?: string | null
          title: string
          type?: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          deep_link?: string | null
          id?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string
          quantity: number
          subtotal_idr: number
          unit_price_idr: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id: string
          quantity?: number
          subtotal_idr: number
          unit_price_idr: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          subtotal_idr?: number
          unit_price_idr?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cart_id: string | null
          created_at: string
          id: string
          status: string
          total_idr: number
          updated_at: string
          user_id: string
        }
        Insert: {
          cart_id?: string | null
          created_at?: string
          id?: string
          status?: string
          total_idr?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          cart_id?: string | null
          created_at?: string
          id?: string
          status?: string
          total_idr?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
        ]
      }
      package_guests: {
        Row: {
          created_at: string | null
          guest_email: string | null
          guest_name: string | null
          guest_number: number
          guest_phone: string | null
          id: string
          is_primary: boolean | null
          purchase_id: string
          qr_code: string
          redemption_status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          guest_email?: string | null
          guest_name?: string | null
          guest_number: number
          guest_phone?: string | null
          id?: string
          is_primary?: boolean | null
          purchase_id: string
          qr_code: string
          redemption_status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          guest_email?: string | null
          guest_name?: string | null
          guest_number?: number
          guest_phone?: string | null
          id?: string
          is_primary?: boolean | null
          purchase_id?: string
          qr_code?: string
          redemption_status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "package_guests_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "package_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_guests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      package_items: {
        Row: {
          created_at: string
          id: string
          item_name: string
          item_type: string
          notes: string | null
          package_id: string
          quantity: number
          redemption_rule: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          item_name: string
          item_type?: string
          notes?: string | null
          package_id: string
          quantity?: number
          redemption_rule?: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          item_name?: string
          item_type?: string
          notes?: string | null
          package_id?: string
          quantity?: number
          redemption_rule?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "package_items_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "venue_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      package_purchases: {
        Row: {
          created_at: string
          expires_at: string | null
          guest_count: number | null
          guest_name: string | null
          guest_phone: string | null
          id: string
          package_id: string
          purchased_at: string
          qr_code: string
          status: string
          total_paid: number | null
          updated_at: string
          user_id: string | null
          venue_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          guest_count?: number | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          package_id: string
          purchased_at?: string
          qr_code: string
          status?: string
          total_paid?: number | null
          updated_at?: string
          user_id?: string | null
          venue_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          guest_count?: number | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          package_id?: string
          purchased_at?: string
          qr_code?: string
          status?: string
          total_paid?: number | null
          updated_at?: string
          user_id?: string | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_purchases_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "venue_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      package_redemptions: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          package_item_id: string
          purchase_id: string
          quantity_redeemed: number
          redeemed_at: string
          redeemed_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          package_item_id: string
          purchase_id: string
          quantity_redeemed?: number
          redeemed_at?: string
          redeemed_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          package_item_id?: string
          purchase_id?: string
          quantity_redeemed?: number
          redeemed_at?: string
          redeemed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "package_redemptions_package_item_id_fkey"
            columns: ["package_item_id"]
            isOneToOne: false
            referencedRelation: "package_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_redemptions_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "package_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_intents: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          metadata: Json | null
          method: string
          notes: string | null
          reference_id: string | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          method: string
          notes?: string | null
          reference_id?: string | null
          status: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          method?: string
          notes?: string | null
          reference_id?: string | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          card_brand: string | null
          card_exp_month: number | null
          card_exp_year: number | null
          card_last4: string | null
          created_at: string
          id: string
          is_default: boolean
          label: string
          metadata: Json | null
          type: string
          user_id: string
        }
        Insert: {
          card_brand?: string | null
          card_exp_month?: number | null
          card_exp_year?: number | null
          card_last4?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          label: string
          metadata?: Json | null
          type: string
          user_id: string
        }
        Update: {
          card_brand?: string | null
          card_exp_month?: number | null
          card_exp_year?: number | null
          card_last4?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string
          metadata?: Json | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payout_batches: {
        Row: {
          commission_count: number
          created_at: string
          created_by: string | null
          error_message: string | null
          id: string
          processed_at: string | null
          status: string
          stripe_batch_id: string | null
          total_amount: number
        }
        Insert: {
          commission_count: number
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          processed_at?: string | null
          status?: string
          stripe_batch_id?: string | null
          total_amount: number
        }
        Update: {
          commission_count?: number
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          processed_at?: string | null
          status?: string
          stripe_batch_id?: string | null
          total_amount?: number
        }
        Relationships: []
      }
      points_ledger: {
        Row: {
          created_at: string
          description: string | null
          id: string
          points_delta: number
          source_id: string | null
          source_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          points_delta: number
          source_id?: string | null
          source_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          points_delta?: number
          source_id?: string | null
          source_type?: string
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          metadata: Json | null
          name: string
          price_idr: number
          type: string
          updated_at: string
          venue_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json | null
          name: string
          price_idr?: number
          type: string
          updated_at?: string
          venue_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json | null
          name?: string
          price_idr?: number
          type?: string
          updated_at?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          is_member: boolean
          language: string | null
          membership_renews_at: string | null
          membership_tier: string
          phone: string | null
          points_balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_member?: boolean
          language?: string | null
          membership_renews_at?: string | null
          membership_tier?: string
          phone?: string | null
          points_balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_member?: boolean
          language?: string | null
          membership_renews_at?: string | null
          membership_tier?: string
          phone?: string | null
          points_balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      promo_analytics: {
        Row: {
          clicks: number | null
          conversion_rate: number | null
          created_at: string
          id: string
          impressions: number | null
          promo_id: string
          recorded_date: string
          redemptions: number | null
          revenue_generated: number | null
          updated_at: string
          venue_id: string | null
        }
        Insert: {
          clicks?: number | null
          conversion_rate?: number | null
          created_at?: string
          id?: string
          impressions?: number | null
          promo_id: string
          recorded_date?: string
          redemptions?: number | null
          revenue_generated?: number | null
          updated_at?: string
          venue_id?: string | null
        }
        Update: {
          clicks?: number | null
          conversion_rate?: number | null
          created_at?: string
          id?: string
          impressions?: number | null
          promo_id?: string
          recorded_date?: string
          redemptions?: number | null
          revenue_generated?: number | null
          updated_at?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promo_analytics_promo_id_fkey"
            columns: ["promo_id"]
            isOneToOne: false
            referencedRelation: "promos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_analytics_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_commissions: {
        Row: {
          amount: number
          commission_amount: number
          commission_rate: number
          created_at: string
          error_message: string | null
          id: string
          paid_at: string | null
          payout_batch_id: string | null
          promo_id: string
          redemption_id: string | null
          status: string
          stripe_transfer_id: string | null
          venue_id: string
        }
        Insert: {
          amount: number
          commission_amount: number
          commission_rate: number
          created_at?: string
          error_message?: string | null
          id?: string
          paid_at?: string | null
          payout_batch_id?: string | null
          promo_id: string
          redemption_id?: string | null
          status?: string
          stripe_transfer_id?: string | null
          venue_id: string
        }
        Update: {
          amount?: number
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          error_message?: string | null
          id?: string
          paid_at?: string | null
          payout_batch_id?: string | null
          promo_id?: string
          redemption_id?: string | null
          status?: string
          stripe_transfer_id?: string | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_commissions_promo_id_fkey"
            columns: ["promo_id"]
            isOneToOne: false
            referencedRelation: "promos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_commissions_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      promos: {
        Row: {
          ai_generated: boolean | null
          boost_spend: number | null
          commission_rate: number | null
          created_at: string
          created_by_role: string | null
          current_redemptions: number | null
          deep_link: string | null
          discount_type: string | null
          discount_value: number | null
          ends_at: string
          id: string
          image_url: string
          is_active: boolean
          max_redemptions: number | null
          min_party_size: number | null
          predicted_impact: Json | null
          promo_category: string | null
          promo_code: string | null
          promo_tier: string | null
          published_platforms: string[] | null
          starts_at: string
          subtitle: string | null
          target_audience: string | null
          target_segments: string[] | null
          terms_conditions: string | null
          title: string
          venue_id: string | null
        }
        Insert: {
          ai_generated?: boolean | null
          boost_spend?: number | null
          commission_rate?: number | null
          created_at?: string
          created_by_role?: string | null
          current_redemptions?: number | null
          deep_link?: string | null
          discount_type?: string | null
          discount_value?: number | null
          ends_at: string
          id?: string
          image_url: string
          is_active?: boolean
          max_redemptions?: number | null
          min_party_size?: number | null
          predicted_impact?: Json | null
          promo_category?: string | null
          promo_code?: string | null
          promo_tier?: string | null
          published_platforms?: string[] | null
          starts_at?: string
          subtitle?: string | null
          target_audience?: string | null
          target_segments?: string[] | null
          terms_conditions?: string | null
          title: string
          venue_id?: string | null
        }
        Update: {
          ai_generated?: boolean | null
          boost_spend?: number | null
          commission_rate?: number | null
          created_at?: string
          created_by_role?: string | null
          current_redemptions?: number | null
          deep_link?: string | null
          discount_type?: string | null
          discount_value?: number | null
          ends_at?: string
          id?: string
          image_url?: string
          is_active?: boolean
          max_redemptions?: number | null
          min_party_size?: number | null
          predicted_impact?: Json | null
          promo_category?: string | null
          promo_code?: string | null
          promo_tier?: string | null
          published_platforms?: string[] | null
          starts_at?: string
          subtitle?: string | null
          target_audience?: string | null
          target_segments?: string[] | null
          terms_conditions?: string | null
          title?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promos_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_webhook_logs: {
        Row: {
          booking_id: string | null
          created_at: string | null
          error_message: string | null
          event_id: string | null
          event_type: string
          headers: Json | null
          id: string
          payload: Json
          processed_at: string | null
          processing_attempts: number | null
          processing_status: string | null
          provider: string
          signature: string | null
          signature_verified: boolean | null
          venue_id: string | null
        }
        Insert: {
          booking_id?: string | null
          created_at?: string | null
          error_message?: string | null
          event_id?: string | null
          event_type: string
          headers?: Json | null
          id?: string
          payload: Json
          processed_at?: string | null
          processing_attempts?: number | null
          processing_status?: string | null
          provider: string
          signature?: string | null
          signature_verified?: boolean | null
          venue_id?: string | null
        }
        Update: {
          booking_id?: string | null
          created_at?: string | null
          error_message?: string | null
          event_id?: string | null
          event_type?: string
          headers?: Json | null
          id?: string
          payload?: Json
          processed_at?: string | null
          processing_attempts?: number | null
          processing_status?: string | null
          provider?: string
          signature?: string | null
          signature_verified?: boolean | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_webhook_logs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_webhook_logs_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      session_invoices: {
        Row: {
          amount_paid: number
          created_at: string
          deposit_credit: number
          discount_amount: number
          discount_reason: string | null
          generated_at: string
          guest_email: string | null
          guest_name: string | null
          guest_phone: string | null
          guest_user_id: string | null
          id: string
          invoice_number: string
          paid_at: string | null
          service_charge: number
          session_id: string
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          tax_amount: number
          total_amount: number
          updated_at: string
          void_reason: string | null
          voided_at: string | null
        }
        Insert: {
          amount_paid?: number
          created_at?: string
          deposit_credit?: number
          discount_amount?: number
          discount_reason?: string | null
          generated_at?: string
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          guest_user_id?: string | null
          id?: string
          invoice_number: string
          paid_at?: string | null
          service_charge?: number
          session_id: string
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
        }
        Update: {
          amount_paid?: number
          created_at?: string
          deposit_credit?: number
          discount_amount?: number
          discount_reason?: string | null
          generated_at?: string
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          guest_user_id?: string | null
          id?: string
          invoice_number?: string
          paid_at?: string | null
          service_charge?: number
          session_id?: string
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_invoices_guest_user_id_fkey"
            columns: ["guest_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "session_invoices_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "table_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_order_items: {
        Row: {
          created_at: string
          destination: string | null
          estimated_ready_at: string | null
          id: string
          item_name: string
          menu_item_id: string | null
          modifiers: Json | null
          notes: string | null
          quantity: number
          served_at: string | null
          session_order_id: string
          status: Database["public"]["Enums"]["order_item_status"]
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          destination?: string | null
          estimated_ready_at?: string | null
          id?: string
          item_name: string
          menu_item_id?: string | null
          modifiers?: Json | null
          notes?: string | null
          quantity?: number
          served_at?: string | null
          session_order_id: string
          status?: Database["public"]["Enums"]["order_item_status"]
          unit_price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          destination?: string | null
          estimated_ready_at?: string | null
          id?: string
          item_name?: string
          menu_item_id?: string | null
          modifiers?: Json | null
          notes?: string | null
          quantity?: number
          served_at?: string | null
          session_order_id?: string
          status?: Database["public"]["Enums"]["order_item_status"]
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_order_items_session_order_id_fkey"
            columns: ["session_order_id"]
            isOneToOne: false
            referencedRelation: "session_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      session_orders: {
        Row: {
          confirmed_at: string | null
          created_at: string
          id: string
          notes: string | null
          order_number: number
          ordered_by: string | null
          session_id: string
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          order_number?: number
          ordered_by?: string | null
          session_id: string
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          order_number?: number
          ordered_by?: string | null
          session_id?: string
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_orders_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "table_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          notes: string | null
          payment_method: string
          processed_by: string | null
          reference_number: string | null
          status: Database["public"]["Enums"]["payment_status"]
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id: string
          notes?: string | null
          payment_method: string
          processed_by?: string | null
          reference_number?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          notes?: string | null
          payment_method?: string
          processed_by?: string | null
          reference_number?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "session_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "session_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          is_active: boolean
          phone: string | null
          updated_at: string
          user_id: string
          venue_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
          user_id: string
          venue_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
          user_id?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_profiles_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      table_sessions: {
        Row: {
          booking_id: string | null
          closed_at: string | null
          closed_by: string | null
          created_at: string
          guest_count: number
          guest_name: string | null
          id: string
          notes: string | null
          opened_at: string
          opened_by: string | null
          package_purchase_id: string | null
          status: Database["public"]["Enums"]["session_status"]
          table_id: string | null
          updated_at: string
          venue_id: string
        }
        Insert: {
          booking_id?: string | null
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          guest_count?: number
          guest_name?: string | null
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by?: string | null
          package_purchase_id?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          table_id?: string | null
          updated_at?: string
          venue_id: string
        }
        Update: {
          booking_id?: string | null
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          guest_count?: number
          guest_name?: string | null
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by?: string | null
          package_purchase_id?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          table_id?: string | null
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "table_sessions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_sessions_package_purchase_id_fkey"
            columns: ["package_purchase_id"]
            isOneToOne: false
            referencedRelation: "package_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_sessions_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "venue_tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_sessions_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      user_favorites: {
        Row: {
          created_at: string
          id: string
          user_id: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          venue_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_favorites_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      user_locations: {
        Row: {
          consent_granted: boolean
          created_at: string
          home_address: string | null
          home_latitude: number | null
          home_longitude: number | null
          id: string
          last_sync_at: string | null
          office_address: string | null
          office_latitude: number | null
          office_longitude: number | null
          phone_number: string | null
          telkomsel_linked_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          consent_granted?: boolean
          created_at?: string
          home_address?: string | null
          home_latitude?: number | null
          home_longitude?: number | null
          id?: string
          last_sync_at?: string | null
          office_address?: string | null
          office_latitude?: number | null
          office_longitude?: number | null
          phone_number?: string | null
          telkomsel_linked_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          consent_granted?: boolean
          created_at?: string
          home_address?: string | null
          home_latitude?: number | null
          home_longitude?: number | null
          id?: string
          last_sync_at?: string | null
          office_address?: string | null
          office_latitude?: number | null
          office_longitude?: number | null
          phone_number?: string | null
          telkomsel_linked_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_locations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      venue_analytics: {
        Row: {
          capacity_percentage: number | null
          created_at: string
          day_of_week: number | null
          footfall_count: number | null
          hour_of_day: number | null
          id: string
          peak_hour_flag: boolean | null
          recorded_at: string
          revenue_estimate: number | null
          venue_id: string
          weather_condition: string | null
        }
        Insert: {
          capacity_percentage?: number | null
          created_at?: string
          day_of_week?: number | null
          footfall_count?: number | null
          hour_of_day?: number | null
          id?: string
          peak_hour_flag?: boolean | null
          recorded_at?: string
          revenue_estimate?: number | null
          venue_id: string
          weather_condition?: string | null
        }
        Update: {
          capacity_percentage?: number | null
          created_at?: string
          day_of_week?: number | null
          footfall_count?: number | null
          hour_of_day?: number | null
          id?: string
          peak_hour_flag?: boolean | null
          recorded_at?: string
          revenue_estimate?: number | null
          venue_id?: string
          weather_condition?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "venue_analytics_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_audience_insights: {
        Row: {
          avg_daily_footfall: number | null
          created_at: string
          home_zone_count: number
          id: string
          last_calculated_at: string
          office_zone_count: number
          peak_hour_end: number | null
          peak_hour_start: number | null
          total_potential_reach: number
          updated_at: string
          venue_id: string
        }
        Insert: {
          avg_daily_footfall?: number | null
          created_at?: string
          home_zone_count?: number
          id?: string
          last_calculated_at?: string
          office_zone_count?: number
          peak_hour_end?: number | null
          peak_hour_start?: number | null
          total_potential_reach?: number
          updated_at?: string
          venue_id: string
        }
        Update: {
          avg_daily_footfall?: number | null
          created_at?: string
          home_zone_count?: number
          id?: string
          last_calculated_at?: string
          office_zone_count?: number
          peak_hour_end?: number | null
          peak_hour_start?: number | null
          total_potential_reach?: number
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_audience_insights_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: true
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_crowd_snapshots: {
        Row: {
          confidence: number | null
          created_at: string
          crowd_level: Database["public"]["Enums"]["crowd_level"]
          id: string
          population_density: number | null
          snapshot_at: string
          source: string
          venue_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          crowd_level?: Database["public"]["Enums"]["crowd_level"]
          id?: string
          population_density?: number | null
          snapshot_at?: string
          source?: string
          venue_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          crowd_level?: Database["public"]["Enums"]["crowd_level"]
          id?: string
          population_density?: number | null
          snapshot_at?: string
          source?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_crowd_snapshots_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_guest_profiles: {
        Row: {
          created_at: string
          dietary_restrictions: string[] | null
          guest_email: string | null
          guest_name: string | null
          guest_phone: string | null
          id: string
          last_visit_at: string | null
          preferences: Json | null
          tags: string[] | null
          total_spend: number | null
          total_visits: number | null
          updated_at: string
          user_id: string | null
          venue_id: string
          vip_status: string | null
        }
        Insert: {
          created_at?: string
          dietary_restrictions?: string[] | null
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          last_visit_at?: string | null
          preferences?: Json | null
          tags?: string[] | null
          total_spend?: number | null
          total_visits?: number | null
          updated_at?: string
          user_id?: string | null
          venue_id: string
          vip_status?: string | null
        }
        Update: {
          created_at?: string
          dietary_restrictions?: string[] | null
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          last_visit_at?: string | null
          preferences?: Json | null
          tags?: string[] | null
          total_spend?: number | null
          total_visits?: number | null
          updated_at?: string
          user_id?: string | null
          venue_id?: string
          vip_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "venue_guest_profiles_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_packages: {
        Row: {
          availability_end: string | null
          availability_start: string | null
          created_at: string
          description: string | null
          guest_count: number | null
          id: string
          image_url: string | null
          is_active: boolean
          max_quantity: number | null
          name: string
          package_type: string | null
          price: number | null
          sold_count: number | null
          sort_order: number
          updated_at: string
          valid_from: string | null
          valid_until: string | null
          venue_id: string
        }
        Insert: {
          availability_end?: string | null
          availability_start?: string | null
          created_at?: string
          description?: string | null
          guest_count?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          max_quantity?: number | null
          name: string
          package_type?: string | null
          price?: number | null
          sold_count?: number | null
          sort_order?: number
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
          venue_id: string
        }
        Update: {
          availability_end?: string | null
          availability_start?: string | null
          created_at?: string
          description?: string | null
          guest_count?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          max_quantity?: number | null
          name?: string
          package_type?: string | null
          price?: number | null
          sold_count?: number | null
          sort_order?: number
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_packages_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_pos_settings: {
        Row: {
          auto_print_bar: boolean | null
          auto_print_kitchen: boolean | null
          created_at: string
          currency: string
          id: string
          require_table_for_orders: boolean | null
          service_charge_rate: number
          tax_rate: number
          updated_at: string
          venue_id: string
        }
        Insert: {
          auto_print_bar?: boolean | null
          auto_print_kitchen?: boolean | null
          created_at?: string
          currency?: string
          id?: string
          require_table_for_orders?: boolean | null
          service_charge_rate?: number
          tax_rate?: number
          updated_at?: string
          venue_id: string
        }
        Update: {
          auto_print_bar?: boolean | null
          auto_print_kitchen?: boolean | null
          created_at?: string
          currency?: string
          id?: string
          require_table_for_orders?: boolean | null
          service_charge_rate?: number
          tax_rate?: number
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_pos_settings_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: true
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_profiles: {
        Row: {
          ai_recommendations: Json | null
          avg_capacity_utilization: number | null
          avg_customer_spend: number | null
          avg_party_size: number | null
          avg_promo_redemption_rate: number | null
          avg_show_up_rate: number | null
          best_performing_promo_types: string[] | null
          created_at: string | null
          growth_opportunities: Json | null
          id: string
          last_calculated_at: string | null
          peak_days: Json | null
          peak_hours: Json | null
          promo_effectiveness_score: number | null
          repeat_customer_rate: number | null
          risk_factors: Json | null
          slow_days: Json | null
          top_customer_segments: Json | null
          total_bookings_30d: number | null
          total_revenue_30d: number | null
          updated_at: string | null
          venue_id: string
        }
        Insert: {
          ai_recommendations?: Json | null
          avg_capacity_utilization?: number | null
          avg_customer_spend?: number | null
          avg_party_size?: number | null
          avg_promo_redemption_rate?: number | null
          avg_show_up_rate?: number | null
          best_performing_promo_types?: string[] | null
          created_at?: string | null
          growth_opportunities?: Json | null
          id?: string
          last_calculated_at?: string | null
          peak_days?: Json | null
          peak_hours?: Json | null
          promo_effectiveness_score?: number | null
          repeat_customer_rate?: number | null
          risk_factors?: Json | null
          slow_days?: Json | null
          top_customer_segments?: Json | null
          total_bookings_30d?: number | null
          total_revenue_30d?: number | null
          updated_at?: string | null
          venue_id: string
        }
        Update: {
          ai_recommendations?: Json | null
          avg_capacity_utilization?: number | null
          avg_customer_spend?: number | null
          avg_party_size?: number | null
          avg_promo_redemption_rate?: number | null
          avg_show_up_rate?: number | null
          best_performing_promo_types?: string[] | null
          created_at?: string | null
          growth_opportunities?: Json | null
          id?: string
          last_calculated_at?: string | null
          peak_days?: Json | null
          peak_hours?: Json | null
          promo_effectiveness_score?: number | null
          repeat_customer_rate?: number | null
          risk_factors?: Json | null
          slow_days?: Json | null
          top_customer_segments?: Json | null
          total_bookings_30d?: number | null
          total_revenue_30d?: number | null
          updated_at?: string | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_profiles_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: true
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_provider_mappings: {
        Row: {
          api_credentials_encrypted: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          policies: Json | null
          provider: string
          provider_venue_id: string
          seating_types: string[] | null
          sync_enabled: boolean | null
          timezone: string | null
          updated_at: string | null
          venue_id: string
        }
        Insert: {
          api_credentials_encrypted?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          policies?: Json | null
          provider: string
          provider_venue_id: string
          seating_types?: string[] | null
          sync_enabled?: boolean | null
          timezone?: string | null
          updated_at?: string | null
          venue_id: string
        }
        Update: {
          api_credentials_encrypted?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          policies?: Json | null
          provider?: string
          provider_venue_id?: string
          seating_types?: string[] | null
          sync_enabled?: boolean | null
          timezone?: string | null
          updated_at?: string | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_provider_mappings_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_social_credentials: {
        Row: {
          access_token: string | null
          account_id: string | null
          account_name: string | null
          created_at: string
          id: string
          is_active: boolean | null
          metadata: Json | null
          platform: string
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string
          venue_id: string
        }
        Insert: {
          access_token?: string | null
          account_id?: string | null
          account_name?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          platform: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          venue_id: string
        }
        Update: {
          access_token?: string | null
          account_id?: string | null
          account_name?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          platform?: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_social_credentials_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_tables: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          location_zone: string | null
          minimum_spend: number | null
          notes: string | null
          seats: number
          sort_order: number
          special_features: string[] | null
          status: string
          table_number: string
          updated_at: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          location_zone?: string | null
          minimum_spend?: number | null
          notes?: string | null
          seats?: number
          sort_order?: number
          special_features?: string[] | null
          status?: string
          table_number: string
          updated_at?: string
          venue_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          location_zone?: string | null
          minimum_spend?: number | null
          notes?: string | null
          seats?: number
          sort_order?: number
          special_features?: string[] | null
          status?: string
          table_number?: string
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_tables_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_types: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      venues: {
        Row: {
          address: string | null
          allow_special_requests: boolean
          amenities: string[] | null
          booking_mode: Database["public"]["Enums"]["booking_mode"]
          cover_image_url: string | null
          created_at: string
          crowd_trend: string | null
          deposit_amount: number | null
          deposit_enabled: boolean | null
          deposit_percentage: number | null
          description: string | null
          entry_pass_daily_limit: number | null
          entry_pass_enabled: boolean
          entry_pass_price: number | null
          entry_pass_sold_count: number
          external_id: string | null
          external_source: string | null
          has_cover: boolean
          has_promo: boolean
          id: string
          latitude: number | null
          line_skip_daily_limit: number | null
          line_skip_enabled: boolean
          line_skip_price: number | null
          line_skip_sold_count: number
          line_skip_valid_until: string | null
          logo_url: string | null
          longitude: number | null
          max_bookings_per_night: number | null
          max_party_size: number | null
          min_party_size: number | null
          min_spend: string | null
          name: string
          no_show_charge_enabled: boolean | null
          opening_hours: Json | null
          payout_enabled: boolean | null
          phone: string | null
          promo_description: string | null
          promo_type: string | null
          promo_valid_until: string | null
          reminder_24h_enabled: boolean | null
          reminder_2h_enabled: boolean | null
          reminder_enabled: boolean | null
          seats_per_table: number | null
          show_arrival_window: boolean
          status: Database["public"]["Enums"]["venue_status"]
          stripe_account_id: string | null
          supports_booking: boolean
          total_capacity: number | null
          total_tables: number | null
          updated_at: string
          venue_notes: string | null
          venue_type_id: string | null
          vip_pass_daily_limit: number | null
          vip_pass_enabled: boolean
          vip_pass_free_item: string | null
          vip_pass_price: number | null
          vip_pass_sold_count: number
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          allow_special_requests?: boolean
          amenities?: string[] | null
          booking_mode?: Database["public"]["Enums"]["booking_mode"]
          cover_image_url?: string | null
          created_at?: string
          crowd_trend?: string | null
          deposit_amount?: number | null
          deposit_enabled?: boolean | null
          deposit_percentage?: number | null
          description?: string | null
          entry_pass_daily_limit?: number | null
          entry_pass_enabled?: boolean
          entry_pass_price?: number | null
          entry_pass_sold_count?: number
          external_id?: string | null
          external_source?: string | null
          has_cover?: boolean
          has_promo?: boolean
          id?: string
          latitude?: number | null
          line_skip_daily_limit?: number | null
          line_skip_enabled?: boolean
          line_skip_price?: number | null
          line_skip_sold_count?: number
          line_skip_valid_until?: string | null
          logo_url?: string | null
          longitude?: number | null
          max_bookings_per_night?: number | null
          max_party_size?: number | null
          min_party_size?: number | null
          min_spend?: string | null
          name: string
          no_show_charge_enabled?: boolean | null
          opening_hours?: Json | null
          payout_enabled?: boolean | null
          phone?: string | null
          promo_description?: string | null
          promo_type?: string | null
          promo_valid_until?: string | null
          reminder_24h_enabled?: boolean | null
          reminder_2h_enabled?: boolean | null
          reminder_enabled?: boolean | null
          seats_per_table?: number | null
          show_arrival_window?: boolean
          status?: Database["public"]["Enums"]["venue_status"]
          stripe_account_id?: string | null
          supports_booking?: boolean
          total_capacity?: number | null
          total_tables?: number | null
          updated_at?: string
          venue_notes?: string | null
          venue_type_id?: string | null
          vip_pass_daily_limit?: number | null
          vip_pass_enabled?: boolean
          vip_pass_free_item?: string | null
          vip_pass_price?: number | null
          vip_pass_sold_count?: number
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          allow_special_requests?: boolean
          amenities?: string[] | null
          booking_mode?: Database["public"]["Enums"]["booking_mode"]
          cover_image_url?: string | null
          created_at?: string
          crowd_trend?: string | null
          deposit_amount?: number | null
          deposit_enabled?: boolean | null
          deposit_percentage?: number | null
          description?: string | null
          entry_pass_daily_limit?: number | null
          entry_pass_enabled?: boolean
          entry_pass_price?: number | null
          entry_pass_sold_count?: number
          external_id?: string | null
          external_source?: string | null
          has_cover?: boolean
          has_promo?: boolean
          id?: string
          latitude?: number | null
          line_skip_daily_limit?: number | null
          line_skip_enabled?: boolean
          line_skip_price?: number | null
          line_skip_sold_count?: number
          line_skip_valid_until?: string | null
          logo_url?: string | null
          longitude?: number | null
          max_bookings_per_night?: number | null
          max_party_size?: number | null
          min_party_size?: number | null
          min_spend?: string | null
          name?: string
          no_show_charge_enabled?: boolean | null
          opening_hours?: Json | null
          payout_enabled?: boolean | null
          phone?: string | null
          promo_description?: string | null
          promo_type?: string | null
          promo_valid_until?: string | null
          reminder_24h_enabled?: boolean | null
          reminder_2h_enabled?: boolean | null
          reminder_enabled?: boolean | null
          seats_per_table?: number | null
          show_arrival_window?: boolean
          status?: Database["public"]["Enums"]["venue_status"]
          stripe_account_id?: string | null
          supports_booking?: boolean
          total_capacity?: number | null
          total_tables?: number | null
          updated_at?: string
          venue_notes?: string | null
          venue_type_id?: string | null
          vip_pass_daily_limit?: number | null
          vip_pass_enabled?: boolean
          vip_pass_free_item?: string | null
          vip_pass_price?: number | null
          vip_pass_sold_count?: number
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "venues_venue_type_id_fkey"
            columns: ["venue_type_id"]
            isOneToOne: false
            referencedRelation: "venue_types"
            referencedColumns: ["id"]
          },
        ]
      }
      visit_feedback: {
        Row: {
          atmosphere_rating: number | null
          booking_id: string | null
          created_at: string
          feedback_text: string | null
          id: string
          overall_rating: number
          service_rating: number | null
          user_id: string
          value_rating: number | null
          venue_id: string
          visited_at: string
          wait_time_minutes: number | null
          would_recommend: boolean | null
        }
        Insert: {
          atmosphere_rating?: number | null
          booking_id?: string | null
          created_at?: string
          feedback_text?: string | null
          id?: string
          overall_rating: number
          service_rating?: number | null
          user_id: string
          value_rating?: number | null
          venue_id: string
          visited_at?: string
          wait_time_minutes?: number | null
          would_recommend?: boolean | null
        }
        Update: {
          atmosphere_rating?: number | null
          booking_id?: string | null
          created_at?: string
          feedback_text?: string | null
          id?: string
          overall_rating?: number
          service_rating?: number | null
          user_id?: string
          value_rating?: number | null
          venue_id?: string
          visited_at?: string
          wait_time_minutes?: number | null
          would_recommend?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "visit_feedback_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_feedback_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          notes: string | null
          notified_at: string | null
          party_size: number
          phone: string | null
          position: number | null
          status: string
          user_id: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          notified_at?: string | null
          party_size?: number
          phone?: string | null
          position?: number | null
          status?: string
          user_id: string
          venue_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          notified_at?: string | null
          party_size?: number
          phone?: string | null
          position?: number | null
          status?: string
          user_id?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_test_booking: {
        Args: {
          p_arrival_window?: string
          p_booking_date: string
          p_party_size?: number
          p_special_requests?: string
          p_venue_id: string
        }
        Returns: Json
      }
      generate_booking_reference: { Args: never; Returns: string }
      generate_invoice_number: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_venue_manager: {
        Args: { _user_id: string; _venue_id: string }
        Returns: boolean
      }
      purchase_line_skip_pass: {
        Args: { p_user_id: string; p_venue_id: string }
        Returns: Json
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "user"
        | "venue_manager"
        | "manager"
        | "reception"
        | "waitress"
        | "kitchen"
        | "bar"
      booking_mode: "none" | "night_reservation" | "resource_time_slots"
      booking_status: "pending" | "confirmed" | "declined" | "cancelled"
      crowd_level: "quiet" | "moderate" | "busy" | "very_busy" | "packed"
      invoice_status: "draft" | "pending" | "paid" | "partially_paid" | "void"
      location_target_type: "home" | "office" | "current" | "anywhere"
      order_item_status:
        | "pending"
        | "preparing"
        | "ready"
        | "served"
        | "cancelled"
      order_status:
        | "pending"
        | "confirmed"
        | "preparing"
        | "ready"
        | "served"
        | "cancelled"
      payment_status: "pending" | "completed" | "failed" | "refunded"
      session_status: "open" | "billing" | "paid" | "closed" | "cancelled"
      venue_status: "quiet" | "perfect" | "ideal" | "busy" | "too_busy"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "user",
        "venue_manager",
        "manager",
        "reception",
        "waitress",
        "kitchen",
        "bar",
      ],
      booking_mode: ["none", "night_reservation", "resource_time_slots"],
      booking_status: ["pending", "confirmed", "declined", "cancelled"],
      crowd_level: ["quiet", "moderate", "busy", "very_busy", "packed"],
      invoice_status: ["draft", "pending", "paid", "partially_paid", "void"],
      location_target_type: ["home", "office", "current", "anywhere"],
      order_item_status: [
        "pending",
        "preparing",
        "ready",
        "served",
        "cancelled",
      ],
      order_status: [
        "pending",
        "confirmed",
        "preparing",
        "ready",
        "served",
        "cancelled",
      ],
      payment_status: ["pending", "completed", "failed", "refunded"],
      session_status: ["open", "billing", "paid", "closed", "cancelled"],
      venue_status: ["quiet", "perfect", "ideal", "busy", "too_busy"],
    },
  },
} as const
