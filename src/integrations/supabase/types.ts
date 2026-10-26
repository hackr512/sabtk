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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          address_line: string
          created_at: string
          full_name: string
          id: string
          instructions: string | null
          is_default: boolean
          label: string
          phone: string
          user_id: string
          zone_id: string
        }
        Insert: {
          address_line: string
          created_at?: string
          full_name: string
          id?: string
          instructions?: string | null
          is_default?: boolean
          label?: string
          phone: string
          user_id: string
          zone_id: string
        }
        Update: {
          address_line?: string
          created_at?: string
          full_name?: string
          id?: string
          instructions?: string | null
          is_default?: boolean
          label?: string
          phone?: string
          user_id?: string
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "delivery_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor: string | null
          created_at: string
          id: number
          new_data: Json | null
          old_data: Json | null
          row_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          actor?: string | null
          created_at?: string
          id?: number
          new_data?: Json | null
          old_data?: Json | null
          row_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          actor?: string | null
          created_at?: string
          id?: number
          new_data?: Json | null
          old_data?: Json | null
          row_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      budget_plan_items: {
        Row: {
          plan_id: string
          product_id: string
          quantity: number
        }
        Insert: {
          plan_id: string
          product_id: string
          quantity: number
        }
        Update: {
          plan_id?: string
          product_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "budget_plan_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "budget_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_plan_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_plans: {
        Row: {
          budget_amount: number
          created_at: string
          household_size: number
          id: string
          month: string
          preferred_brands: string[]
          reminders_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          budget_amount: number
          created_at?: string
          household_size?: number
          id?: string
          month: string
          preferred_brands?: string[]
          reminders_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          budget_amount?: number
          created_at?: string
          household_size?: number
          id?: string
          month?: string
          preferred_brands?: string[]
          reminders_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      campaign_participants: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          quantity: number
          status: string
          updated_at: string
          user_id: string
          zone_id: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          quantity: number
          status?: string
          updated_at?: string
          user_id: string
          zone_id?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          quantity?: number
          status?: string
          updated_at?: string
          user_id?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_participants_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_participants_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "delivery_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          created_at: string
          deadline: string
          delivery_window_text: string
          description: string | null
          failure_policy: string
          id: string
          max_per_user: number
          min_quantity: number
          payment_rule: string
          price: number
          price_is_confirmed: boolean
          product_id: string
          slug: string
          status: Database["public"]["Enums"]["campaign_status"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deadline: string
          delivery_window_text: string
          description?: string | null
          failure_policy?: string
          id?: string
          max_per_user?: number
          min_quantity: number
          payment_rule?: string
          price: number
          price_is_confirmed?: boolean
          product_id: string
          slug: string
          status?: Database["public"]["Enums"]["campaign_status"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deadline?: string
          delivery_window_text?: string
          description?: string | null
          failure_policy?: string
          id?: string
          max_per_user?: number
          min_quantity?: number
          payment_rule?: string
          price?: number
          price_is_confirmed?: boolean
          product_id?: string
          slug?: string
          status?: Database["public"]["Enums"]["campaign_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      delivery_windows: {
        Row: {
          end_time: string
          id: string
          is_active: boolean
          label: string
          sort_order: number
          start_time: string
        }
        Insert: {
          end_time: string
          id?: string
          is_active?: boolean
          label: string
          sort_order?: number
          start_time: string
        }
        Update: {
          end_time?: string
          id?: string
          is_active?: boolean
          label?: string
          sort_order?: number
          start_time?: string
        }
        Relationships: []
      }
      delivery_zones: {
        Row: {
          area: string
          city: string
          id: string
          is_active: boolean
          sort_order: number
        }
        Insert: {
          area: string
          city: string
          id?: string
          is_active?: boolean
          sort_order?: number
        }
        Update: {
          area?: string
          city?: string
          id?: string
          is_active?: boolean
          sort_order?: number
        }
        Relationships: []
      }
      loyalty_ledger: {
        Row: {
          created_at: string
          description: string
          id: string
          kind: string
          order_id: string | null
          points: number
          referral_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          kind: string
          order_id?: string | null
          points: number
          referral_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          kind?: string
          order_id?: string | null
          points?: number
          referral_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_ledger_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_ledger_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_credit_ledger: {
        Row: {
          actor: string | null
          created_at: string
          cycle_id: string
          delta: number
          id: number
          kind: string
          membership_id: string
          note: string | null
          order_id: string | null
          user_id: string
        }
        Insert: {
          actor?: string | null
          created_at?: string
          cycle_id: string
          delta: number
          id?: never
          kind: string
          membership_id: string
          note?: string | null
          order_id?: string | null
          user_id: string
        }
        Update: {
          actor?: string | null
          created_at?: string
          cycle_id?: string
          delta?: number
          id?: never
          kind?: string
          membership_id?: string
          note?: string | null
          order_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_credit_ledger_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "membership_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_credit_ledger_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_credit_ledger_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_cycles: {
        Row: {
          closed_at: string | null
          created_at: string
          credits_carried: number
          credits_granted: number
          cycle_number: number
          id: string
          max_carry_forward: number
          membership_id: string
          min_basket: number
          payment_id: string | null
          period_end: string
          period_start: string
          plan_id: string
          plan_name: string
          price: number
          status: string
          user_id: string
          zone_ids: string[]
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          credits_carried?: number
          credits_granted: number
          cycle_number: number
          id?: string
          max_carry_forward?: number
          membership_id: string
          min_basket?: number
          payment_id?: string | null
          period_end: string
          period_start: string
          plan_id: string
          plan_name: string
          price: number
          status?: string
          user_id: string
          zone_ids?: string[]
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          credits_carried?: number
          credits_granted?: number
          cycle_number?: number
          id?: string
          max_carry_forward?: number
          membership_id?: string
          min_basket?: number
          payment_id?: string | null
          period_end?: string
          period_start?: string
          plan_id?: string
          plan_name?: string
          price?: number
          status?: string
          user_id?: string
          zone_ids?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "membership_cycles_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_cycles_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "membership_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_cycles_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_payments: {
        Row: {
          amount: number
          created_at: string
          cycle_id: string | null
          id: string
          kind: string
          membership_id: string
          method: string | null
          note: string | null
          paid_at: string | null
          plan_id: string
          provider: string
          provider_reference: string | null
          recorded_by: string | null
          refund_amount: number | null
          refunded_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          cycle_id?: string | null
          id?: string
          kind: string
          membership_id: string
          method?: string | null
          note?: string | null
          paid_at?: string | null
          plan_id: string
          provider?: string
          provider_reference?: string | null
          recorded_by?: string | null
          refund_amount?: number | null
          refunded_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          cycle_id?: string | null
          id?: string
          kind?: string
          membership_id?: string
          method?: string | null
          note?: string | null
          paid_at?: string | null
          plan_id?: string
          provider?: string
          provider_reference?: string | null
          recorded_by?: string | null
          refund_amount?: number | null
          refunded_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_payments_cycle_fk"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "membership_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_payments_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_payments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_plans: {
        Row: {
          created_at: string
          description: string | null
          id: string
          included_credits: number
          is_active: boolean
          is_recommended: boolean
          max_carry_forward: number
          min_basket: number
          monthly_price: number
          name: string
          slug: string
          sort_order: number
          updated_at: string
          validity_days: number
          zone_ids: string[]
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          included_credits: number
          is_active?: boolean
          is_recommended?: boolean
          max_carry_forward?: number
          min_basket?: number
          monthly_price: number
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
          validity_days?: number
          zone_ids?: string[]
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          included_credits?: number
          is_active?: boolean
          is_recommended?: boolean
          max_carry_forward?: number
          min_basket?: number
          monthly_price?: number
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
          validity_days?: number
          zone_ids?: string[]
        }
        Relationships: []
      }
      memberships: {
        Row: {
          cancel_at_period_end: boolean
          cancelled_at: string | null
          created_at: string
          current_cycle_id: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          cancelled_at?: string | null
          created_at?: string
          current_cycle_id?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          cancelled_at?: string | null
          created_at?: string
          current_cycle_id?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_current_cycle_fk"
            columns: ["current_cycle_id"]
            isOneToOne: false
            referencedRelation: "membership_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          brand: string | null
          id: string
          image: string | null
          is_reward: boolean
          line_total: number
          name: string
          order_id: string
          pack_size: string
          product_id: string
          quantity: number
          unit_price: number
        }
        Insert: {
          brand?: string | null
          id?: string
          image?: string | null
          is_reward?: boolean
          line_total: number
          name: string
          order_id: string
          pack_size: string
          product_id: string
          quantity: number
          unit_price: number
        }
        Update: {
          brand?: string | null
          id?: string
          image?: string | null
          is_reward?: boolean
          line_total?: number
          name?: string
          order_id?: string
          pack_size?: string
          product_id?: string
          quantity?: number
          unit_price?: number
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
      order_status_events: {
        Row: {
          actor: string | null
          created_at: string
          id: string
          note: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          actor?: string | null
          created_at?: string
          id?: string
          note?: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          actor?: string | null
          created_at?: string
          id?: string
          note?: string | null
          order_id?: string
          status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_status_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address_line: string
          area: string
          city: string
          created_at: string
          customer_name: string
          delivery_date: string
          delivery_fee: number
          delivery_fee_waived: number
          delivery_window: string
          discount_total: number
          eligible_points_subtotal: number
          id: string
          instructions: string | null
          membership_credit_status: string
          membership_cycle_id: string | null
          notes: string | null
          order_number: string
          payment_method: string
          payment_status: string
          phone: string
          points_redeemed: number
          points_to_earn: number
          promo_code: string | null
          reward_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          updated_at: string
          user_id: string
          zone_id: string
        }
        Insert: {
          address_line: string
          area: string
          city: string
          created_at?: string
          customer_name: string
          delivery_date: string
          delivery_fee: number
          delivery_fee_waived?: number
          delivery_window: string
          discount_total?: number
          eligible_points_subtotal?: number
          id?: string
          instructions?: string | null
          membership_credit_status?: string
          membership_cycle_id?: string | null
          notes?: string | null
          order_number: string
          payment_method: string
          payment_status?: string
          phone: string
          points_redeemed?: number
          points_to_earn?: number
          promo_code?: string | null
          reward_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          updated_at?: string
          user_id: string
          zone_id: string
        }
        Update: {
          address_line?: string
          area?: string
          city?: string
          created_at?: string
          customer_name?: string
          delivery_date?: string
          delivery_fee?: number
          delivery_fee_waived?: number
          delivery_window?: string
          discount_total?: number
          eligible_points_subtotal?: number
          id?: string
          instructions?: string | null
          membership_credit_status?: string
          membership_cycle_id?: string | null
          notes?: string | null
          order_number?: string
          payment_method?: string
          payment_status?: string
          phone?: string
          points_redeemed?: number
          points_to_earn?: number
          promo_code?: string | null
          reward_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_membership_cycle_id_fkey"
            columns: ["membership_cycle_id"]
            isOneToOne: false
            referencedRelation: "membership_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "delivery_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand: string | null
          category_id: string
          compare_at_price: number | null
          created_at: string
          description: string | null
          expiry_info: string | null
          id: string
          images: string[]
          ingredients: string | null
          is_active: boolean
          is_featured: boolean
          max_per_order: number
          name: string
          nutrition: string | null
          pack_size: string
          points_eligible: boolean
          price: number
          sku: string | null
          slug: string
          stock_quantity: number
          storage_instructions: string | null
          unit: string | null
          unit_quantity: number | null
          updated_at: string
        }
        Insert: {
          brand?: string | null
          category_id: string
          compare_at_price?: number | null
          created_at?: string
          description?: string | null
          expiry_info?: string | null
          id?: string
          images?: string[]
          ingredients?: string | null
          is_active?: boolean
          is_featured?: boolean
          max_per_order?: number
          name: string
          nutrition?: string | null
          pack_size: string
          points_eligible?: boolean
          price: number
          sku?: string | null
          slug: string
          stock_quantity?: number
          storage_instructions?: string | null
          unit?: string | null
          unit_quantity?: number | null
          updated_at?: string
        }
        Update: {
          brand?: string | null
          category_id?: string
          compare_at_price?: number | null
          created_at?: string
          description?: string | null
          expiry_info?: string | null
          id?: string
          images?: string[]
          ingredients?: string | null
          is_active?: boolean
          is_featured?: boolean
          max_per_order?: number
          name?: string
          nutrition?: string | null
          pack_size?: string
          points_eligible?: boolean
          price?: number
          sku?: string | null
          slug?: string
          stock_quantity?: number
          storage_instructions?: string | null
          unit?: string | null
          unit_quantity?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          notify_email: boolean
          notify_sms: boolean
          notify_whatsapp: boolean
          phone: string | null
          referral_code: string
          reorder_reminders: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          notify_email?: boolean
          notify_sms?: boolean
          notify_whatsapp?: boolean
          phone?: string | null
          referral_code: string
          reorder_reminders?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          notify_email?: boolean
          notify_sms?: boolean
          notify_whatsapp?: boolean
          phone?: string | null
          referral_code?: string
          reorder_reminders?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          code: string
          description: string | null
          discount_type: string
          ends_at: string | null
          is_active: boolean
          max_discount: number | null
          min_subtotal: number
          starts_at: string | null
          usage_limit: number | null
          used_count: number
          value: number
        }
        Insert: {
          code: string
          description?: string | null
          discount_type: string
          ends_at?: string | null
          is_active?: boolean
          max_discount?: number | null
          min_subtotal?: number
          starts_at?: string | null
          usage_limit?: number | null
          used_count?: number
          value: number
        }
        Update: {
          code?: string
          description?: string | null
          discount_type?: string
          ends_at?: string | null
          is_active?: boolean
          max_discount?: number | null
          min_subtotal?: number
          starts_at?: string | null
          usage_limit?: number | null
          used_count?: number
          value?: number
        }
        Relationships: []
      }
      ration_bundle_items: {
        Row: {
          bundle_id: string
          product_id: string
          quantity: number
        }
        Insert: {
          bundle_id: string
          product_id: string
          quantity: number
        }
        Update: {
          bundle_id?: string
          product_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "ration_bundle_items_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "ration_bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ration_bundle_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      ration_bundles: {
        Row: {
          description: string | null
          household_label: string
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          description?: string | null
          household_label: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          description?: string | null
          household_label?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          qualifying_order_id: string | null
          referred_id: string
          referrer_id: string
          rewarded_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          qualifying_order_id?: string | null
          referred_id: string
          referrer_id: string
          rewarded_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          qualifying_order_id?: string | null
          referred_id?: string
          referrer_id?: string
          rewarded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_qualifying_order_id_fkey"
            columns: ["qualifying_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          description: string | null
          id: string
          is_active: boolean
          name: string
          points_required: number
          product_id: string | null
          sort_order: number
        }
        Insert: {
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          points_required: number
          product_id?: string | null
          sort_order?: number
        }
        Update: {
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          points_required?: number
          product_id?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "rewards_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      store_settings: {
        Row: {
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      support_requests: {
        Row: {
          created_at: string
          id: string
          kind: string
          message: string
          order_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          message: string
          order_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          message?: string
          order_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wishlists: {
        Row: {
          created_at: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      campaign_progress: {
        Args: never
        Returns: {
          campaign_id: string
          committed_quantity: number
          participant_count: number
        }[]
      }
      create_order: { Args: { p: Json }; Returns: Json }
      frequently_bought_with: {
        Args: { p_limit?: number; p_product: string }
        Returns: {
          product_id: string
          together_count: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      membership_adjust_credits: {
        Args: {
          p_actor: string
          p_cycle: string
          p_delta: number
          p_note: string
        }
        Returns: undefined
      }
      membership_available_credits: {
        Args: { p_cycle: string }
        Returns: number
      }
      membership_record_payment: {
        Args: {
          p_actor: string
          p_method: string
          p_payment: string
          p_reference: string
        }
        Returns: Json
      }
      membership_refresh: { Args: { p_user?: string }; Returns: undefined }
      membership_refund_payment: {
        Args: {
          p_actor: string
          p_amount: number
          p_note: string
          p_payment: string
        }
        Returns: undefined
      }
      membership_report: { Args: never; Returns: Json }
      my_points_balance: { Args: never; Returns: number }
      search_products: {
        Args: {
          p_brands?: string[]
          p_category?: string
          p_in_stock?: boolean
          p_limit?: number
          p_max?: number
          p_min?: number
          p_offset?: number
          p_q?: string
          p_sort?: string
        }
        Returns: {
          brand: string
          category_id: string
          category_name: string
          category_slug: string
          compare_at_price: number
          created_at: string
          id: string
          images: string[]
          max_per_order: number
          name: string
          pack_size: string
          points_eligible: boolean
          price: number
          slug: string
          stock_quantity: number
          total_count: number
          unit: string
          unit_quantity: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
      campaign_status:
        | "collecting"
        | "goal_reached"
        | "confirming_supplier"
        | "confirmed"
        | "failed"
        | "cancelled"
        | "completed"
      order_status:
        | "pending_confirmation"
        | "confirmed"
        | "preparing"
        | "out_for_delivery"
        | "delivered"
        | "cancelled"
        | "refunded"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "user"],
      campaign_status: [
        "collecting",
        "goal_reached",
        "confirming_supplier",
        "confirmed",
        "failed",
        "cancelled",
        "completed",
      ],
      order_status: [
        "pending_confirmation",
        "confirmed",
        "preparing",
        "out_for_delivery",
        "delivered",
        "cancelled",
        "refunded",
      ],
    },
  },
} as const
