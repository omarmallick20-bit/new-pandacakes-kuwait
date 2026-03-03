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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          city: string
          country: string
          country_id: string
          created_at: string
          customer_id: string
          delivery_fee: number | null
          delivery_zone_id: string | null
          id: string
          is_primary: boolean | null
          is_serviceable: boolean | null
          label: string
          landmarks: string | null
          latitude: number | null
          longitude: number | null
          street_address: string
          updated_at: string
        }
        Insert: {
          city: string
          country?: string
          country_id?: string
          created_at?: string
          customer_id: string
          delivery_fee?: number | null
          delivery_zone_id?: string | null
          id?: string
          is_primary?: boolean | null
          is_serviceable?: boolean | null
          label: string
          landmarks?: string | null
          latitude?: number | null
          longitude?: number | null
          street_address: string
          updated_at?: string
        }
        Update: {
          city?: string
          country?: string
          country_id?: string
          created_at?: string
          customer_id?: string
          delivery_fee?: number | null
          delivery_zone_id?: string | null
          id?: string
          is_primary?: boolean | null
          is_serviceable?: boolean | null
          label?: string
          landmarks?: string | null
          latitude?: number | null
          longitude?: number | null
          street_address?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "Customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "addresses_delivery_zone_id_fkey"
            columns: ["delivery_zone_id"]
            isOneToOne: false
            referencedRelation: "delivery_zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_addresses_customer_id"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "Customers"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          created_at: string
          customer_id: string
          customizations: Json | null
          id: string
          product_id: string
          product_name: string
          quantity: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          customizations?: Json | null
          id?: string
          product_id: string
          product_name: string
          quantity: number
          unit_price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          customizations?: Json | null
          id?: string
          product_id?: string
          product_name?: string
          quantity?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          image_migrated: boolean | null
          image_url: string | null
          is_active: boolean
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_migrated?: boolean | null
          image_url?: string | null
          is_active?: boolean
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_migrated?: boolean | null
          image_url?: string | null
          is_active?: boolean
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      category_layout_config: {
        Row: {
          card_aspect_ratio: string | null
          country_id: string | null
          created_at: string | null
          desktop_columns: number | null
          desktop_gap: number | null
          id: string
          mobile_columns: number | null
          mobile_gap: number | null
          show_category_names: boolean | null
          updated_at: string | null
        }
        Insert: {
          card_aspect_ratio?: string | null
          country_id?: string | null
          created_at?: string | null
          desktop_columns?: number | null
          desktop_gap?: number | null
          id?: string
          mobile_columns?: number | null
          mobile_gap?: number | null
          show_category_names?: boolean | null
          updated_at?: string | null
        }
        Update: {
          card_aspect_ratio?: string | null
          country_id?: string | null
          created_at?: string | null
          desktop_columns?: number | null
          desktop_gap?: number | null
          id?: string
          mobile_columns?: number | null
          mobile_gap?: number | null
          show_category_names?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      countries: {
        Row: {
          created_at: string | null
          currency_code: string
          currency_symbol: string
          id: string
          is_active: boolean | null
          name: string
          phone_code: string
        }
        Insert: {
          created_at?: string | null
          currency_code: string
          currency_symbol: string
          id: string
          is_active?: boolean | null
          name: string
          phone_code: string
        }
        Update: {
          created_at?: string | null
          currency_code?: string
          currency_symbol?: string
          id?: string
          is_active?: boolean | null
          name?: string
          phone_code?: string
        }
        Relationships: []
      }
      customer_countries: {
        Row: {
          country_code: string
          created_at: string
          customer_id: string
          id: string
          is_origin: boolean
        }
        Insert: {
          country_code: string
          created_at?: string
          customer_id: string
          id?: string
          is_origin?: boolean
        }
        Update: {
          country_code?: string
          created_at?: string
          customer_id?: string
          id?: string
          is_origin?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "customer_countries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "Customers"
            referencedColumns: ["id"]
          },
        ]
      }
      Customers: {
        Row: {
          birthdate: string | null
          country_id: string | null
          created_at: string
          created_via_dashboard: boolean | null
          email: string | null
          first_name: string | null
          has_completed_initial_setup: boolean | null
          id: string
          last_name: string | null
          loyalty_code: string | null
          loyalty_points: number
          phone_country_code: string | null
          phone_verified: boolean | null
          preferred_country: string | null
          primary_address: string | null
          updated_at: string | null
          whatsapp_number: string | null
        }
        Insert: {
          birthdate?: string | null
          country_id?: string | null
          created_at?: string
          created_via_dashboard?: boolean | null
          email?: string | null
          first_name?: string | null
          has_completed_initial_setup?: boolean | null
          id?: string
          last_name?: string | null
          loyalty_code?: string | null
          loyalty_points?: number
          phone_country_code?: string | null
          phone_verified?: boolean | null
          preferred_country?: string | null
          primary_address?: string | null
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          birthdate?: string | null
          country_id?: string | null
          created_at?: string
          created_via_dashboard?: boolean | null
          email?: string | null
          first_name?: string | null
          has_completed_initial_setup?: boolean | null
          id?: string
          last_name?: string | null
          loyalty_code?: string | null
          loyalty_points?: number
          phone_country_code?: string | null
          phone_verified?: boolean | null
          preferred_country?: string | null
          primary_address?: string | null
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Customers_preferred_country_fkey"
            columns: ["preferred_country"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_drivers: {
        Row: {
          country_id: string
          created_at: string | null
          id: string
          is_active: boolean
          license_plate: string | null
          name: string
          notes: string | null
          phone: string
          updated_at: string | null
          vehicle_type: string | null
        }
        Insert: {
          country_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          license_plate?: string | null
          name: string
          notes?: string | null
          phone: string
          updated_at?: string | null
          vehicle_type?: string | null
        }
        Update: {
          country_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          license_plate?: string | null
          name?: string
          notes?: string | null
          phone?: string
          updated_at?: string | null
          vehicle_type?: string | null
        }
        Relationships: []
      }
      delivery_zones: {
        Row: {
          country_id: string | null
          created_at: string | null
          delivery_fee: number
          delivery_time_minutes: number
          geometry: Json
          id: string
          is_active: boolean
          min_order_value: number | null
          updated_at: string | null
          zone_name: string
        }
        Insert: {
          country_id?: string | null
          created_at?: string | null
          delivery_fee?: number
          delivery_time_minutes?: number
          geometry: Json
          id?: string
          is_active?: boolean
          min_order_value?: number | null
          updated_at?: string | null
          zone_name: string
        }
        Update: {
          country_id?: string | null
          created_at?: string | null
          delivery_fee?: number
          delivery_time_minutes?: number
          geometry?: Json
          id?: string
          is_active?: boolean
          min_order_value?: number | null
          updated_at?: string | null
          zone_name?: string
        }
        Relationships: []
      }
      google_reviews_cache: {
        Row: {
          cached_at: string | null
          expires_at: string | null
          id: string
          page_token: string | null
          place_id: string
          place_info: Json | null
          review_data: Json
          stats_data: Json | null
        }
        Insert: {
          cached_at?: string | null
          expires_at?: string | null
          id?: string
          page_token?: string | null
          place_id: string
          place_info?: Json | null
          review_data?: Json
          stats_data?: Json | null
        }
        Update: {
          cached_at?: string | null
          expires_at?: string | null
          id?: string
          page_token?: string | null
          place_id?: string
          place_info?: Json | null
          review_data?: Json
          stats_data?: Json | null
        }
        Relationships: []
      }
      item_discounts: {
        Row: {
          applicable_products: string[]
          badge_text: string | null
          country_id: string
          created_at: string | null
          discount_percentage: number
          id: string
          is_active: boolean | null
          name: string
          show_badge: boolean | null
          updated_at: string | null
          valid_from: string
          valid_until: string
        }
        Insert: {
          applicable_products: string[]
          badge_text?: string | null
          country_id?: string
          created_at?: string | null
          discount_percentage: number
          id?: string
          is_active?: boolean | null
          name: string
          show_badge?: boolean | null
          updated_at?: string | null
          valid_from: string
          valid_until: string
        }
        Update: {
          applicable_products?: string[]
          badge_text?: string | null
          country_id?: string
          created_at?: string | null
          discount_percentage?: number
          id?: string
          is_active?: boolean | null
          name?: string
          show_badge?: boolean | null
          updated_at?: string | null
          valid_from?: string
          valid_until?: string
        }
        Relationships: []
      }
      loyalty_transactions: {
        Row: {
          country_id: string
          created_at: string
          customer_id: string
          description: string | null
          expires_at: string | null
          id: string
          is_expired: boolean | null
          is_redeemed: boolean | null
          order_id: string | null
          points: number
          transaction_type: string
        }
        Insert: {
          country_id?: string
          created_at?: string
          customer_id: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_expired?: boolean | null
          is_redeemed?: boolean | null
          order_id?: string | null
          points: number
          transaction_type: string
        }
        Update: {
          country_id?: string
          created_at?: string
          customer_id?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_expired?: boolean | null
          is_redeemed?: boolean | null
          order_id?: string | null
          points?: number
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "Customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_with_customer_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "recent_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          additional_images: Json | null
          addons: Json | null
          allergens: Json | null
          availability_schedule: Json | null
          category: string
          category_id: string | null
          category_ids: Json | null
          country_id: string | null
          created_at: string
          custom_sections: Json | null
          custom_variants: Json | null
          description: string | null
          description_ar: string | null
          dietary_info: Json | null
          discount_amount: number | null
          discount_percentage: number | null
          discount_valid_from: string | null
          discount_valid_until: string | null
          flavors: Json | null
          id: string
          image_url: string | null
          is_active: boolean
          local_price: number | null
          max_order_quantity: number | null
          min_order_quantity: number | null
          name: string
          name_ar: string | null
          nutritional_info: Json | null
          popularity_score: number | null
          preparation_time: number | null
          price: number
          show_discount_badge: boolean | null
          sizes: Json | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          additional_images?: Json | null
          addons?: Json | null
          allergens?: Json | null
          availability_schedule?: Json | null
          category: string
          category_id?: string | null
          category_ids?: Json | null
          country_id?: string | null
          created_at?: string
          custom_sections?: Json | null
          custom_variants?: Json | null
          description?: string | null
          description_ar?: string | null
          dietary_info?: Json | null
          discount_amount?: number | null
          discount_percentage?: number | null
          discount_valid_from?: string | null
          discount_valid_until?: string | null
          flavors?: Json | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          local_price?: number | null
          max_order_quantity?: number | null
          min_order_quantity?: number | null
          name: string
          name_ar?: string | null
          nutritional_info?: Json | null
          popularity_score?: number | null
          preparation_time?: number | null
          price: number
          show_discount_badge?: boolean | null
          sizes?: Json | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          additional_images?: Json | null
          addons?: Json | null
          allergens?: Json | null
          availability_schedule?: Json | null
          category?: string
          category_id?: string | null
          category_ids?: Json | null
          country_id?: string | null
          created_at?: string
          custom_sections?: Json | null
          custom_variants?: Json | null
          description?: string | null
          description_ar?: string | null
          dietary_info?: Json | null
          discount_amount?: number | null
          discount_percentage?: number | null
          discount_valid_from?: string | null
          discount_valid_until?: string | null
          flavors?: Json | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          local_price?: number | null
          max_order_quantity?: number | null
          min_order_quantity?: number | null
          name?: string
          name_ar?: string | null
          nutritional_info?: Json | null
          popularity_score?: number | null
          preparation_time?: number | null
          price?: number
          show_discount_badge?: boolean | null
          sizes?: Json | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_menu_items_category_id"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          customizations: Json | null
          id: string
          item_discount_amount: number | null
          item_discount_percentage: number | null
          order_id: string
          original_unit_price: number | null
          product_id: string | null
          product_name: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          customizations?: Json | null
          id?: string
          item_discount_amount?: number | null
          item_discount_percentage?: number | null
          order_id: string
          original_unit_price?: number | null
          product_id?: string | null
          product_name: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          customizations?: Json | null
          id?: string
          item_discount_amount?: number | null
          item_discount_percentage?: number | null
          order_id?: string
          original_unit_price?: number | null
          product_id?: string | null
          product_name?: string
          quantity?: number
          total_price?: number
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
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_with_customer_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "recent_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          changed_by_name: string | null
          changed_by_role: string | null
          id: string
          new_status: Database["public"]["Enums"]["order_status"]
          notes: string | null
          old_status: Database["public"]["Enums"]["order_status"] | null
          order_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          changed_by_name?: string | null
          changed_by_role?: string | null
          id?: string
          new_status: Database["public"]["Enums"]["order_status"]
          notes?: string | null
          old_status?: Database["public"]["Enums"]["order_status"] | null
          order_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          changed_by_name?: string | null
          changed_by_role?: string | null
          id?: string
          new_status?: Database["public"]["Enums"]["order_status"]
          notes?: string | null
          old_status?: Database["public"]["Enums"]["order_status"] | null
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_with_customer_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "recent_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          assigned_driver_id: string | null
          assigned_driver_name: string | null
          bakepoints_discount_amount: number | null
          cake_details: Json | null
          country_id: string | null
          created_at: string
          customer_id: string | null
          customer_notes: string | null
          customer_snapshot: Json | null
          delivery_address_id: string | null
          delivery_address_snapshot: Json | null
          delivery_fee: number | null
          delivery_zone_id: string | null
          driver_notes: string | null
          estimated_delivery_time: string | null
          fulfillment_type: string | null
          id: string
          loyalty_discount_amount: number | null
          order_number: string
          order_placed_at: string | null
          original_amount: number | null
          payment_amount: number | null
          payment_currency: string | null
          payment_method: string | null
          payment_retry_count: number | null
          payment_status: string | null
          pickup_contact_name: string | null
          pickup_contact_phone: string | null
          pickup_location: string | null
          pickup_time: string | null
          platform_order_id: string | null
          platform_source: string
          staff_notes: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          tap_charge_id: string | null
          tap_idempotency_key: string | null
          tap_payment_reference: string | null
          total_amount: number
          updated_at: string
          vat_amount: number | null
          vat_percentage: number | null
          voucher_discount_amount: number | null
          voucher_id: string | null
        }
        Insert: {
          assigned_driver_id?: string | null
          assigned_driver_name?: string | null
          bakepoints_discount_amount?: number | null
          cake_details?: Json | null
          country_id?: string | null
          created_at?: string
          customer_id?: string | null
          customer_notes?: string | null
          customer_snapshot?: Json | null
          delivery_address_id?: string | null
          delivery_address_snapshot?: Json | null
          delivery_fee?: number | null
          delivery_zone_id?: string | null
          driver_notes?: string | null
          estimated_delivery_time?: string | null
          fulfillment_type?: string | null
          id?: string
          loyalty_discount_amount?: number | null
          order_number: string
          order_placed_at?: string | null
          original_amount?: number | null
          payment_amount?: number | null
          payment_currency?: string | null
          payment_method?: string | null
          payment_retry_count?: number | null
          payment_status?: string | null
          pickup_contact_name?: string | null
          pickup_contact_phone?: string | null
          pickup_location?: string | null
          pickup_time?: string | null
          platform_order_id?: string | null
          platform_source?: string
          staff_notes?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          tap_charge_id?: string | null
          tap_idempotency_key?: string | null
          tap_payment_reference?: string | null
          total_amount: number
          updated_at?: string
          vat_amount?: number | null
          vat_percentage?: number | null
          voucher_discount_amount?: number | null
          voucher_id?: string | null
        }
        Update: {
          assigned_driver_id?: string | null
          assigned_driver_name?: string | null
          bakepoints_discount_amount?: number | null
          cake_details?: Json | null
          country_id?: string | null
          created_at?: string
          customer_id?: string | null
          customer_notes?: string | null
          customer_snapshot?: Json | null
          delivery_address_id?: string | null
          delivery_address_snapshot?: Json | null
          delivery_fee?: number | null
          delivery_zone_id?: string | null
          driver_notes?: string | null
          estimated_delivery_time?: string | null
          fulfillment_type?: string | null
          id?: string
          loyalty_discount_amount?: number | null
          order_number?: string
          order_placed_at?: string | null
          original_amount?: number | null
          payment_amount?: number | null
          payment_currency?: string | null
          payment_method?: string | null
          payment_retry_count?: number | null
          payment_status?: string | null
          pickup_contact_name?: string | null
          pickup_contact_phone?: string | null
          pickup_location?: string | null
          pickup_time?: string | null
          platform_order_id?: string | null
          platform_source?: string
          staff_notes?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          tap_charge_id?: string | null
          tap_idempotency_key?: string | null
          tap_payment_reference?: string | null
          total_amount?: number
          updated_at?: string
          vat_amount?: number | null
          vat_percentage?: number | null
          voucher_discount_amount?: number | null
          voucher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "Customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_delivery_address_id_fkey"
            columns: ["delivery_address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_delivery_zone_id_fkey"
            columns: ["delivery_zone_id"]
            isOneToOne: false
            referencedRelation: "delivery_zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_checkouts: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          order_data: Json
          session_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          order_data: Json
          session_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          order_data?: Json
          session_id?: string
        }
        Relationships: []
      }
      phone_verifications: {
        Row: {
          attempts: number | null
          created_at: string | null
          expires_at: string
          id: string
          otp_code: string
          phone_number: string
          user_id: string | null
          verified: boolean | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          expires_at: string
          id?: string
          otp_code: string
          phone_number: string
          user_id?: string | null
          verified?: boolean | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          expires_at?: string
          id?: string
          otp_code?: string
          phone_number?: string
          user_id?: string | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "phone_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "Customers"
            referencedColumns: ["id"]
          },
        ]
      }
      popup_signups: {
        Row: {
          country_id: string
          created_at: string | null
          customer_type: string | null
          id: string
          phone_number: string
          popup_id: string | null
        }
        Insert: {
          country_id?: string
          created_at?: string | null
          customer_type?: string | null
          id?: string
          phone_number: string
          popup_id?: string | null
        }
        Update: {
          country_id?: string
          created_at?: string | null
          customer_type?: string | null
          id?: string
          phone_number?: string
          popup_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "popup_signups_popup_id_fkey"
            columns: ["popup_id"]
            isOneToOne: false
            referencedRelation: "website_popups"
            referencedColumns: ["id"]
          },
        ]
      }
      qatar_reviews: {
        Row: {
          author_image: string | null
          author_name: string
          country_id: string | null
          created_at: string
          helpful_votes: number | null
          id: string
          is_active: boolean | null
          rating: number
          review_date: string | null
          review_date_ar: string | null
          review_images: Json | null
          review_text_ar: string | null
          review_text_en: string | null
          sort_order: number | null
        }
        Insert: {
          author_image?: string | null
          author_name: string
          country_id?: string | null
          created_at?: string
          helpful_votes?: number | null
          id?: string
          is_active?: boolean | null
          rating?: number
          review_date?: string | null
          review_date_ar?: string | null
          review_images?: Json | null
          review_text_ar?: string | null
          review_text_en?: string | null
          sort_order?: number | null
        }
        Update: {
          author_image?: string | null
          author_name?: string
          country_id?: string | null
          created_at?: string
          helpful_votes?: number | null
          id?: string
          is_active?: boolean | null
          rating?: number
          review_date?: string | null
          review_date_ar?: string | null
          review_images?: Json | null
          review_text_ar?: string | null
          review_text_en?: string | null
          sort_order?: number | null
        }
        Relationships: []
      }
      site_config: {
        Row: {
          country_code: string
          country_name: string
          created_at: string
          currency_code: string
          currency_symbol: string
          default_preparation_time: number | null
          default_preparation_unit: string | null
          default_timezone: string
          id: string
          is_active: boolean
          mapbox_token: string | null
          min_order_value_delivery: number | null
          notification_sound: string | null
          phone_country_code: string
          sound_enabled: boolean | null
          updated_at: string
          vat_enabled: boolean | null
          vat_percentage: number | null
          website_name: string
        }
        Insert: {
          country_code?: string
          country_name?: string
          created_at?: string
          currency_code?: string
          currency_symbol?: string
          default_preparation_time?: number | null
          default_preparation_unit?: string | null
          default_timezone?: string
          id?: string
          is_active?: boolean
          mapbox_token?: string | null
          min_order_value_delivery?: number | null
          notification_sound?: string | null
          phone_country_code?: string
          sound_enabled?: boolean | null
          updated_at?: string
          vat_enabled?: boolean | null
          vat_percentage?: number | null
          website_name?: string
        }
        Update: {
          country_code?: string
          country_name?: string
          created_at?: string
          currency_code?: string
          currency_symbol?: string
          default_preparation_time?: number | null
          default_preparation_unit?: string | null
          default_timezone?: string
          id?: string
          is_active?: boolean
          mapbox_token?: string | null
          min_order_value_delivery?: number | null
          notification_sound?: string | null
          phone_country_code?: string
          sound_enabled?: boolean | null
          updated_at?: string
          vat_enabled?: boolean | null
          vat_percentage?: number | null
          website_name?: string
        }
        Relationships: []
      }
      staff: {
        Row: {
          country_access: string[] | null
          country_id: string
          created_at: string
          employee_id: string
          first_name: string
          id: string
          is_active: boolean | null
          last_name: string
          permissions: Json | null
          role: Database["public"]["Enums"]["app_role"]
          staff_email: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          country_access?: string[] | null
          country_id?: string
          created_at?: string
          employee_id: string
          first_name: string
          id?: string
          is_active?: boolean | null
          last_name: string
          permissions?: Json | null
          role?: Database["public"]["Enums"]["app_role"]
          staff_email?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          country_access?: string[] | null
          country_id?: string
          created_at?: string
          employee_id?: string
          first_name?: string
          id?: string
          is_active?: boolean | null
          last_name?: string
          permissions?: Json | null
          role?: Database["public"]["Enums"]["app_role"]
          staff_email?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      staff_credentials: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          is_active: boolean
          last_login: string | null
          password_hash: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          is_active?: boolean
          last_login?: string | null
          password_hash: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          is_active?: boolean
          last_login?: string | null
          password_hash?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_login_attempts: {
        Row: {
          created_at: string
          email: string
          error_message: string | null
          id: string
          ip_address: string | null
          success: boolean
        }
        Insert: {
          created_at?: string
          email: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean
        }
        Update: {
          created_at?: string
          email?: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean
        }
        Relationships: []
      }
      time_slot_blocks: {
        Row: {
          block_date: string
          block_end: string | null
          block_severity: string | null
          block_start: string | null
          block_type: string | null
          country_id: string | null
          created_at: string | null
          created_by: string | null
          duration_hours: number | null
          fulfillment_type: string | null
          id: string
          is_active: boolean | null
          reason: string | null
          time_slot: string | null
          updated_at: string | null
        }
        Insert: {
          block_date: string
          block_end?: string | null
          block_severity?: string | null
          block_start?: string | null
          block_type?: string | null
          country_id?: string | null
          created_at?: string | null
          created_by?: string | null
          duration_hours?: number | null
          fulfillment_type?: string | null
          id?: string
          is_active?: boolean | null
          reason?: string | null
          time_slot?: string | null
          updated_at?: string | null
        }
        Update: {
          block_date?: string
          block_end?: string | null
          block_severity?: string | null
          block_start?: string | null
          block_type?: string | null
          country_id?: string | null
          created_at?: string | null
          created_by?: string | null
          duration_hours?: number | null
          fulfillment_type?: string | null
          id?: string
          is_active?: boolean | null
          reason?: string | null
          time_slot?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "time_slot_blocks_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      variant_presets: {
        Row: {
          country_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          sections_data: Json
          updated_at: string
        }
        Insert: {
          country_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          sections_data?: Json
          updated_at?: string
        }
        Update: {
          country_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          sections_data?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "variant_presets_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      voucher_usage: {
        Row: {
          created_at: string | null
          customer_id: string
          discount_applied: number
          id: string
          order_id: string | null
          used_at: string | null
          voucher_id: string
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          discount_applied: number
          id?: string
          order_id?: string | null
          used_at?: string | null
          voucher_id: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          discount_applied?: number
          id?: string
          order_id?: string | null
          used_at?: string | null
          voucher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voucher_usage_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voucher_usage_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_with_customer_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voucher_usage_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "recent_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voucher_usage_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      vouchers: {
        Row: {
          applicable_products: string[] | null
          country_id: string
          created_at: string
          customer_id: string | null
          description_ar: string | null
          description_en: string | null
          discount_amount: number | null
          discount_percentage: number | null
          happy_hour_days: string[] | null
          happy_hour_enabled: boolean | null
          happy_hour_end_time: string | null
          happy_hour_start_time: string | null
          id: string
          is_used: boolean | null
          max_usage: number | null
          max_uses_per_customer: number | null
          min_order_amount: number | null
          order_type: string | null
          show_on_website: boolean | null
          usage_count: number | null
          used_at: string | null
          used_by_customer_id: string | null
          valid_from: string
          valid_until: string
          voucher_code: string
          voucher_type: string
        }
        Insert: {
          applicable_products?: string[] | null
          country_id?: string
          created_at?: string
          customer_id?: string | null
          description_ar?: string | null
          description_en?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          happy_hour_days?: string[] | null
          happy_hour_enabled?: boolean | null
          happy_hour_end_time?: string | null
          happy_hour_start_time?: string | null
          id?: string
          is_used?: boolean | null
          max_usage?: number | null
          max_uses_per_customer?: number | null
          min_order_amount?: number | null
          order_type?: string | null
          show_on_website?: boolean | null
          usage_count?: number | null
          used_at?: string | null
          used_by_customer_id?: string | null
          valid_from: string
          valid_until: string
          voucher_code: string
          voucher_type: string
        }
        Update: {
          applicable_products?: string[] | null
          country_id?: string
          created_at?: string
          customer_id?: string | null
          description_ar?: string | null
          description_en?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          happy_hour_days?: string[] | null
          happy_hour_enabled?: boolean | null
          happy_hour_end_time?: string | null
          happy_hour_start_time?: string | null
          id?: string
          is_used?: boolean | null
          max_usage?: number | null
          max_uses_per_customer?: number | null
          min_order_amount?: number | null
          order_type?: string | null
          show_on_website?: boolean | null
          usage_count?: number | null
          used_at?: string | null
          used_by_customer_id?: string | null
          valid_from?: string
          valid_until?: string
          voucher_code?: string
          voucher_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_vouchers_used_by_customer"
            columns: ["used_by_customer_id"]
            isOneToOne: false
            referencedRelation: "Customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "Customers"
            referencedColumns: ["id"]
          },
        ]
      }
      website_popups: {
        Row: {
          accent_color: string | null
          background_color: string | null
          country_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          heading: string | null
          id: string
          is_active: boolean | null
          popup_type: string
          signup_image_url: string | null
          signup_subtitle: string | null
          signup_title: string | null
          signup_voucher_code: string | null
          signup_voucher_description: string | null
          text_color: string | null
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
          voucher_code: string | null
        }
        Insert: {
          accent_color?: string | null
          background_color?: string | null
          country_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          heading?: string | null
          id?: string
          is_active?: boolean | null
          popup_type: string
          signup_image_url?: string | null
          signup_subtitle?: string | null
          signup_title?: string | null
          signup_voucher_code?: string | null
          signup_voucher_description?: string | null
          text_color?: string | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
          voucher_code?: string | null
        }
        Update: {
          accent_color?: string | null
          background_color?: string | null
          country_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          heading?: string | null
          id?: string
          is_active?: boolean | null
          popup_type?: string
          signup_image_url?: string | null
          signup_subtitle?: string | null
          signup_title?: string | null
          signup_voucher_code?: string | null
          signup_voucher_description?: string | null
          text_color?: string | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
          voucher_code?: string | null
        }
        Relationships: []
      }
      whatsapp_logs: {
        Row: {
          country_id: string
          created_at: string
          customer_id: string
          error_message: string | null
          id: string
          message_content: string
          message_type: string
          phone_number: string
          sent_at: string | null
          status: string
        }
        Insert: {
          country_id?: string
          created_at?: string
          customer_id: string
          error_message?: string | null
          id?: string
          message_content: string
          message_type: string
          phone_number: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          country_id?: string
          created_at?: string
          customer_id?: string
          error_message?: string | null
          id?: string
          message_content?: string
          message_type?: string
          phone_number?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_logs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "Customers"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlist_items: {
        Row: {
          base_price: number
          category_id: string | null
          created_at: string | null
          customer_id: string
          id: string
          product_description: string | null
          product_id: string
          product_image: string | null
          product_name: string
        }
        Insert: {
          base_price?: number
          category_id?: string | null
          created_at?: string | null
          customer_id: string
          id?: string
          product_description?: string | null
          product_id: string
          product_image?: string | null
          product_name: string
        }
        Update: {
          base_price?: number
          category_id?: string | null
          created_at?: string | null
          customer_id?: string
          id?: string
          product_description?: string | null
          product_id?: string
          product_image?: string | null
          product_name?: string
        }
        Relationships: []
      }
    }
    Views: {
      menu_with_categories: {
        Row: {
          category: string | null
          category_id: string | null
          category_image_url: string | null
          category_name: string | null
          country_id: string | null
          created_at: string | null
          description: string | null
          id: string | null
          image_url: string | null
          is_active: boolean | null
          local_price: number | null
          name: string | null
          nutritional_info: Json | null
          preparation_time: number | null
          price: number | null
          sort_order: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_menu_items_category_id"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      orders_with_customer_details: {
        Row: {
          address_label: string | null
          assigned_driver_id: string | null
          assigned_driver_name: string | null
          birthdate: string | null
          cake_details: Json | null
          city: string | null
          country: string | null
          country_id: string | null
          created_at: string | null
          customer_id: string | null
          customer_notes: string | null
          delivery_address_id: string | null
          delivery_fee: number | null
          driver_notes: string | null
          email: string | null
          estimated_delivery_time: string | null
          first_name: string | null
          fulfillment_type: string | null
          id: string | null
          landmarks: string | null
          last_name: string | null
          latitude: number | null
          longitude: number | null
          loyalty_discount_amount: number | null
          loyalty_points: number | null
          order_number: string | null
          order_placed_at: string | null
          original_amount: number | null
          payment_method: string | null
          pickup_contact_name: string | null
          pickup_contact_phone: string | null
          pickup_location: string | null
          pickup_time: string | null
          platform_order_id: string | null
          platform_source: string | null
          staff_notes: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          street_address: string | null
          total_amount: number | null
          updated_at: string | null
          vat_amount: number | null
          vat_percentage: number | null
          voucher_discount_amount: number | null
          voucher_id: string | null
          whatsapp_number: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "Customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_delivery_address_id_fkey"
            columns: ["delivery_address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      recent_orders: {
        Row: {
          cake_details: Json | null
          country_id: string | null
          created_at: string | null
          customer_id: string | null
          customer_notes: string | null
          delivery_address_id: string | null
          estimated_delivery_time: string | null
          first_name: string | null
          hours_ago: number | null
          id: string | null
          last_name: string | null
          order_number: string | null
          order_placed_at: string | null
          payment_method: string | null
          platform_order_id: string | null
          platform_source: string | null
          staff_notes: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          total_amount: number | null
          updated_at: string | null
          whatsapp_number: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "Customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_delivery_address_id_fkey"
            columns: ["delivery_address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      apply_voucher: {
        Args: {
          country_code_param?: string
          customer_id_param: string
          order_amount: number
          voucher_code_param: string
        }
        Returns: {
          discount_amount: number
          final_amount: number
          message: string
          success: boolean
          voucher_id: string
        }[]
      }
      authenticate_system_user: {
        Args: { login_email: string; login_password: string }
        Returns: {
          country_access: string[]
          error_message: string
          permissions: Json
          role: Database["public"]["Enums"]["app_role"]
          success: boolean
          user_id: string
        }[]
      }
      create_birthday_vouchers:
        | { Args: never; Returns: number }
        | { Args: { country_code?: string }; Returns: number }
      create_manual_order: {
        Args: {
          p_cake_details: Json
          p_country_id: string
          p_customer_id: string
          p_customer_notes: string
          p_delivery_address_id: string
          p_delivery_fee: number
          p_delivery_zone_id: string
          p_estimated_delivery_time: string
          p_fulfillment_type: string
          p_loyalty_discount_amount: number
          p_payment_method: string
          p_pickup_contact_name: string
          p_pickup_contact_phone: string
          p_pickup_location: string
          p_pickup_time: string
          p_platform_source: string
          p_staff_notes: string
          p_total_amount: number
        }
        Returns: {
          order_id: string
          order_number: string
        }[]
      }
      create_manual_order_v2: {
        Args: {
          p_cake_details?: Json
          p_country_id?: string
          p_customer_id: string
          p_customer_notes?: string
          p_delivery_address_id?: string
          p_delivery_fee?: number
          p_delivery_zone_id?: string
          p_estimated_delivery_time?: string
          p_fulfillment_type?: string
          p_loyalty_discount_amount?: number
          p_payment_method?: string
          p_pickup_contact_name?: string
          p_pickup_contact_phone?: string
          p_pickup_location?: string
          p_pickup_time?: string
          p_platform_source?: string
          p_staff_notes?: string
          p_total_amount?: number
        }
        Returns: {
          order_id: string
          order_number: string
        }[]
      }
      debug_user_orders_access: {
        Args: never
        Returns: {
          orders_visible_count: number
          rls_context: string
          sample_order_ids: string[]
          session_user_id: string
          user_id_from_auth: string
        }[]
      }
      find_customer_by_email_or_phone: {
        Args: { input_text: string }
        Returns: {
          customer_id: string
          email: string
          whatsapp_number: string
        }[]
      }
      generate_country_order_number: {
        Args: { country_code?: string; delivery_date: string }
        Returns: string
      }
      generate_delivery_qr_data: {
        Args: { address_id: string }
        Returns: string
      }
      generate_loyalty_code: { Args: never; Returns: string }
      generate_order_number: { Args: never; Returns: string }
      generate_order_number_with_date: {
        Args: { delivery_date: string }
        Returns: string
      }
      generate_pbkdf2_hash: { Args: { password: string }; Returns: string }
      generate_voucher_code: { Args: never; Returns: string }
      get_analytics_category_data: {
        Args: {
          country_code?: string
          end_date: string
          limit_count?: number
          start_date: string
        }
        Returns: {
          avg_order_value: number
          category_id: string
          category_name: string
          order_count: number
          total_quantity: number
          total_revenue: number
        }[]
      }
      get_analytics_customer_data: {
        Args: { country_code?: string; end_date: string; start_date: string }
        Returns: {
          active_customers: number
          avg_customer_value: number
          new_customers: number
          top_customers: Json
          total_customers: number
        }[]
      }
      get_analytics_orders_data: {
        Args: { country_code?: string; end_date: string; start_date: string }
        Returns: {
          new_customers: number
          platform_breakdown: Json
          repeat_customers: number
          repeat_rate: number
          status_breakdown: Json
          total_orders: number
        }[]
      }
      get_analytics_product_data: {
        Args: {
          country_code?: string
          end_date: string
          limit_count?: number
          start_date: string
        }
        Returns: {
          category_name: string
          order_count: number
          product_id: string
          product_name: string
          total_quantity: number
          total_revenue: number
        }[]
      }
      get_analytics_sales_data: {
        Args: { country_code?: string; end_date: string; start_date: string }
        Returns: {
          avg_order_value: number
          currency_code: string
          currency_symbol: string
          order_count: number
          payment_method_breakdown: Json
          platform_breakdown: Json
          refunds_count: number
          refunds_total: number
          total_revenue: number
        }[]
      }
      get_auth_email_by_phone: {
        Args: { phone_input: string }
        Returns: string
      }
      get_auth_user_id_by_email: {
        Args: { email_input: string }
        Returns: string
      }
      get_available_bakepoints: {
        Args: { p_country_id?: string; p_customer_id: string }
        Returns: number
      }
      get_birthday_customers:
        | {
            Args: { days_ahead?: number }
            Returns: {
              birthdate: string
              customer_id: string
              days_until_birthday: number
              full_name: string
              loyalty_points: number
              whatsapp_number: string
            }[]
          }
        | {
            Args: { country_code?: string; days_ahead?: number }
            Returns: {
              birthdate: string
              customer_id: string
              days_until_birthday: number
              full_name: string
              loyalty_points: number
              whatsapp_number: string
            }[]
          }
      get_customer_growth_data: {
        Args: { country_code?: string; end_date: string; start_date: string }
        Returns: {
          date: string
          new_customer_revenue: number
          new_customers: number
          returning_customer_revenue: number
          returning_customers: number
          total_customers: number
        }[]
      }
      get_customer_segments_by_loyalty:
        | {
            Args: { min_points?: number }
            Returns: {
              customer_id: string
              days_since_last_order: number
              full_name: string
              last_order_date: string
              loyalty_points: number
              total_orders: number
              total_spent: number
              whatsapp_number: string
            }[]
          }
        | {
            Args: { country_code?: string; min_points?: number }
            Returns: {
              customer_id: string
              days_since_last_order: number
              full_name: string
              last_order_date: string
              loyalty_points: number
              total_orders: number
              total_spent: number
              whatsapp_number: string
            }[]
          }
      get_daily_revenue_trends: {
        Args: { country_code?: string; end_date: string; start_date: string }
        Returns: {
          avg_order_value: number
          date: string
          order_count: number
          order_growth: number
          revenue: number
          revenue_growth: number
        }[]
      }
      get_enhanced_menu_by_country: {
        Args: { country_code?: string }
        Returns: {
          addons: Json
          allergens: Json
          category_id: string
          category_name: string
          country_id: string
          currency_code: string
          currency_symbol: string
          description: string
          dietary_info: Json
          flavors: Json
          id: string
          image_url: string
          is_active: boolean
          local_price: number
          name: string
          popularity_score: number
          preparation_time: number
          price: number
          sizes: Json
        }[]
      }
      get_hourly_order_distribution: {
        Args: { country_code?: string; end_date: string; start_date: string }
        Returns: {
          hour_of_day: number
          order_count: number
          total_revenue: number
        }[]
      }
      get_order_with_details: {
        Args: { order_id_param: string }
        Returns: {
          city: string
          created_at: string
          customer_name: string
          estimated_delivery_time: string
          id: string
          latitude: number
          longitude: number
          order_number: string
          payment_method: string
          phone_number: string
          platform_source: string
          qr_maps_url: string
          state: string
          status: string
          street_address: string
          updated_at: string
        }[]
      }
      get_orders_by_period: {
        Args: { end_date: string; start_date: string }
        Returns: {
          avg_order_value: number
          order_count: number
          top_customer_id: string
          top_customer_name: string
          top_customer_orders: number
          total_revenue: number
        }[]
      }
      get_product_performance_trends: {
        Args: {
          country_code?: string
          end_date: string
          limit_count?: number
          start_date: string
        }
        Returns: {
          category_name: string
          daily_quantity: number
          daily_revenue: number
          date: string
          product_id: string
          product_name: string
        }[]
      }
      get_recent_urgent_orders: {
        Args: never
        Returns: {
          created_at: string
          customer_name: string
          hours_ago: number
          id: string
          order_number: string
          status: Database["public"]["Enums"]["order_status"]
          total_amount: number
          whatsapp_number: string
        }[]
      }
      is_authenticated_staff: { Args: never; Returns: boolean }
      is_system_account: { Args: { user_email: string }; Returns: boolean }
      log_system_login_attempt: {
        Args: {
          error_msg?: string
          ip_addr?: string
          login_email: string
          success: boolean
        }
        Returns: undefined
      }
      lookup_customer_by_loyalty_code: {
        Args: { code: string }
        Returns: {
          customer_id: string
          customer_name: string
          loyalty_points: number
          total_orders: number
          whatsapp_number: string
        }[]
      }
      lookup_customer_by_phone: {
        Args: { phone_input: string }
        Returns: {
          country_id: string
          customer_id: string
          customer_name: string
          loyalty_points: number
          total_orders: number
          whatsapp_number: string
        }[]
      }
      normalize_phone_for_lookup: {
        Args: { phone_input: string }
        Returns: string
      }
      record_voucher_usage: {
        Args: {
          p_customer_id: string
          p_discount_applied: number
          p_order_id: string
          p_voucher_id: string
        }
        Returns: boolean
      }
      redeem_bakepoints:
        | {
            Args: {
              p_country_id?: string
              p_customer_id: string
              p_order_id?: string
              p_points_to_redeem: number
            }
            Returns: {
              discount_amount: number
              message: string
              new_balance: number
              success: boolean
            }[]
          }
        | {
            Args: {
              p_country_id?: string
              p_customer_id: string
              p_order_id?: string
              p_points_to_redeem: number
            }
            Returns: {
              discount_amount: number
              message: string
              new_balance: number
              success: boolean
            }[]
          }
      redeem_loyalty_points: {
        Args: {
          code: string
          order_description: string
          points_to_redeem: number
        }
        Returns: {
          discount_amount: number
          message: string
          new_balance: number
          success: boolean
        }[]
      }
      search_customers_by_partial_phone: {
        Args: { phone_partial: string; result_limit?: number }
        Returns: {
          country_id: string
          customer_id: string
          customer_name: string
          loyalty_points: number
          total_orders: number
          whatsapp_number: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      update_order_status: {
        Args: {
          new_status: Database["public"]["Enums"]["order_status"]
          order_id_param: string
          staff_notes_param?: string
        }
        Returns: boolean
      }
      validate_voucher: {
        Args: {
          country_code_param?: string
          customer_id_param: string
          order_amount_param: number
          voucher_code_param: string
        }
        Returns: {
          applicable_products: string[]
          discount_amount: number
          discount_percentage: number
          error_message: string
          is_valid: boolean
          voucher_id: string
        }[]
      }
      verify_system_login: {
        Args: { login_id: string; login_password: string }
        Returns: {
          country_access: string[]
          is_valid: boolean
          permissions: Json
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "staff" | "customer"
      order_status:
        | "pending"
        | "confirmed"
        | "preparing"
        | "ready"
        | "out_for_delivery"
        | "completed"
        | "cancelled"
        | "pending_payment"
        | "rescheduled"
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
      app_role: ["admin", "staff", "customer"],
      order_status: [
        "pending",
        "confirmed",
        "preparing",
        "ready",
        "out_for_delivery",
        "completed",
        "cancelled",
        "pending_payment",
        "rescheduled",
      ],
    },
  },
} as const
