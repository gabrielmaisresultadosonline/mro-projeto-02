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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ads_admins: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string | null
          password: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name?: string | null
          password: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          password?: string
        }
        Relationships: []
      }
      ads_balance_orders: {
        Row: {
          amount: number
          created_at: string
          id: string
          infinitepay_link: string | null
          leads_quantity: number
          nsu_order: string
          paid_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          infinitepay_link?: string | null
          leads_quantity: number
          nsu_order: string
          paid_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          infinitepay_link?: string | null
          leads_quantity?: number
          nsu_order?: string
          paid_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ads_balance_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "ads_users"
            referencedColumns: ["id"]
          },
        ]
      }
      ads_client_data: {
        Row: {
          campaign_activated_at: string | null
          campaign_active: boolean | null
          campaign_end_date: string | null
          competitor1_instagram: string | null
          competitor2_instagram: string | null
          created_at: string
          edit_count: number | null
          id: string
          instagram: string | null
          logo_url: string | null
          media_urls: string[] | null
          niche: string | null
          observations: string | null
          offer_description: string | null
          region: string | null
          sales_page_url: string | null
          telegram_group: string | null
          updated_at: string
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          campaign_activated_at?: string | null
          campaign_active?: boolean | null
          campaign_end_date?: string | null
          competitor1_instagram?: string | null
          competitor2_instagram?: string | null
          created_at?: string
          edit_count?: number | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          media_urls?: string[] | null
          niche?: string | null
          observations?: string | null
          offer_description?: string | null
          region?: string | null
          sales_page_url?: string | null
          telegram_group?: string | null
          updated_at?: string
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          campaign_activated_at?: string | null
          campaign_active?: boolean | null
          campaign_end_date?: string | null
          competitor1_instagram?: string | null
          competitor2_instagram?: string | null
          created_at?: string
          edit_count?: number | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          media_urls?: string[] | null
          niche?: string | null
          observations?: string | null
          offer_description?: string | null
          region?: string | null
          sales_page_url?: string | null
          telegram_group?: string | null
          updated_at?: string
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ads_client_data_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "ads_users"
            referencedColumns: ["id"]
          },
        ]
      }
      ads_orders: {
        Row: {
          amount: number
          created_at: string
          email: string
          expired_at: string | null
          id: string
          infinitepay_link: string | null
          invoice_slug: string | null
          name: string
          nsu_order: string
          paid_at: string | null
          status: string
          transaction_nsu: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          email: string
          expired_at?: string | null
          id?: string
          infinitepay_link?: string | null
          invoice_slug?: string | null
          name: string
          nsu_order: string
          paid_at?: string | null
          status?: string
          transaction_nsu?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          email?: string
          expired_at?: string | null
          id?: string
          infinitepay_link?: string | null
          invoice_slug?: string | null
          name?: string
          nsu_order?: string
          paid_at?: string | null
          status?: string
          transaction_nsu?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ads_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "ads_users"
            referencedColumns: ["id"]
          },
        ]
      }
      ads_users: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          password: string
          phone: string | null
          status: string
          subscription_end: string | null
          subscription_start: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          password: string
          phone?: string | null
          status?: string
          subscription_end?: string | null
          subscription_start?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          password?: string
          phone?: string | null
          status?: string
          subscription_end?: string | null
          subscription_start?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      agentemro_accounts: {
        Row: {
          created_at: string
          id: string
          meta_access_token: string | null
          meta_phone_number_id: string | null
          meta_verify_token: string | null
          meta_waba_id: string | null
          name: string
          owner_user_id: string
          plan: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          meta_access_token?: string | null
          meta_phone_number_id?: string | null
          meta_verify_token?: string | null
          meta_waba_id?: string | null
          name: string
          owner_user_id: string
          plan?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          meta_access_token?: string | null
          meta_phone_number_id?: string | null
          meta_verify_token?: string | null
          meta_waba_id?: string | null
          name?: string
          owner_user_id?: string
          plan?: string
          updated_at?: string
        }
        Relationships: []
      }
      agentemro_agents: {
        Row: {
          account_id: string
          created_at: string
          id: string
          is_active: boolean
          model: string
          name: string
          system_prompt: string
          temperature: number
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          model?: string
          name: string
          system_prompt?: string
          temperature?: number
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          model?: string
          name?: string
          system_prompt?: string
          temperature?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agentemro_agents_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "agentemro_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      agentemro_conversations: {
        Row: {
          account_id: string
          agent_id: string | null
          contact_name: string | null
          contact_phone: string
          created_at: string
          id: string
          last_message_at: string
          status: string
          updated_at: string
        }
        Insert: {
          account_id: string
          agent_id?: string | null
          contact_name?: string | null
          contact_phone: string
          created_at?: string
          id?: string
          last_message_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          agent_id?: string | null
          contact_name?: string | null
          contact_phone?: string
          created_at?: string
          id?: string
          last_message_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agentemro_conversations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "agentemro_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agentemro_conversations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agentemro_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agentemro_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          meta_message_id: string | null
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          meta_message_id?: string | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          meta_message_id?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "agentemro_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "agentemro_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      api_tokens: {
        Row: {
          created_at: string
          description: string | null
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          description?: string | null
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      audiobooks_orders: {
        Row: {
          amount: number
          created_at: string | null
          email: string
          has_bump_lifetime: boolean | null
          has_bump_profile_analysis: boolean | null
          id: string
          name: string | null
          order_nsu: string | null
          status: string | null
          updated_at: string | null
          whatsapp: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          email: string
          has_bump_lifetime?: boolean | null
          has_bump_profile_analysis?: boolean | null
          id?: string
          name?: string | null
          order_nsu?: string | null
          status?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          email?: string
          has_bump_lifetime?: boolean | null
          has_bump_profile_analysis?: boolean | null
          id?: string
          name?: string | null
          order_nsu?: string | null
          status?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      broadcast_email_logs: {
        Row: {
          body: string
          created_at: string
          error_message: string | null
          id: string
          recipient_email: string
          recipient_name: string | null
          sent_at: string
          status: string
          subject: string
        }
        Insert: {
          body: string
          created_at?: string
          error_message?: string | null
          id?: string
          recipient_email: string
          recipient_name?: string | null
          sent_at?: string
          status?: string
          subject: string
        }
        Update: {
          body?: string
          created_at?: string
          error_message?: string | null
          id?: string
          recipient_email?: string
          recipient_name?: string | null
          sent_at?: string
          status?: string
          subject?: string
        }
        Relationships: []
      }
      call_analytics: {
        Row: {
          created_at: string
          device_type: string | null
          event_type: string
          id: string
          referrer: string | null
          source_url: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          device_type?: string | null
          event_type: string
          id?: string
          referrer?: string | null
          source_url?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          device_type?: string | null
          event_type?: string
          id?: string
          referrer?: string | null
          source_url?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      comercialaaf_leads: {
        Row: {
          created_at: string
          email: string
          email_enviado: boolean
          empresa: string
          faturamento: string
          id: string
          nome: string
          o_que_vende: string | null
          whatsapp: string
        }
        Insert: {
          created_at?: string
          email: string
          email_enviado?: boolean
          empresa: string
          faturamento: string
          id?: string
          nome: string
          o_que_vende?: string | null
          whatsapp: string
        }
        Update: {
          created_at?: string
          email?: string
          email_enviado?: boolean
          empresa?: string
          faturamento?: string
          id?: string
          nome?: string
          o_que_vende?: string | null
          whatsapp?: string
        }
        Relationships: []
      }
      corretor_announcement_views: {
        Row: {
          announcement_id: string
          id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          announcement_id: string
          id?: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          announcement_id?: string
          id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "corretor_announcement_views_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "corretor_announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corretor_announcement_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "corretor_users"
            referencedColumns: ["id"]
          },
        ]
      }
      corretor_announcements: {
        Row: {
          content: string | null
          created_at: string
          display_duration: number | null
          end_date: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_blocking: boolean | null
          start_date: string | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          display_duration?: number | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_blocking?: boolean | null
          start_date?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          display_duration?: number | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_blocking?: boolean | null
          start_date?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      corretor_corrections_log: {
        Row: {
          correction_type: string | null
          created_at: string
          id: string
          text_length: number | null
          user_id: string
        }
        Insert: {
          correction_type?: string | null
          created_at?: string
          id?: string
          text_length?: number | null
          user_id: string
        }
        Update: {
          correction_type?: string | null
          created_at?: string
          id?: string
          text_length?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "corretor_corrections_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "corretor_users"
            referencedColumns: ["id"]
          },
        ]
      }
      corretor_orders: {
        Row: {
          access_created: boolean | null
          amount: number
          created_at: string
          email: string
          email_sent: boolean | null
          expired_at: string | null
          id: string
          infinitepay_link: string | null
          name: string | null
          nsu_order: string
          paid_at: string | null
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          access_created?: boolean | null
          amount?: number
          created_at?: string
          email: string
          email_sent?: boolean | null
          expired_at?: string | null
          id?: string
          infinitepay_link?: string | null
          name?: string | null
          nsu_order: string
          paid_at?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          access_created?: boolean | null
          amount?: number
          created_at?: string
          email?: string
          email_sent?: boolean | null
          expired_at?: string | null
          id?: string
          infinitepay_link?: string | null
          name?: string | null
          nsu_order?: string
          paid_at?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      corretor_settings: {
        Row: {
          created_at: string
          id: string
          setting_key: string
          setting_value: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          setting_key: string
          setting_value?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          setting_key?: string
          setting_value?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      corretor_users: {
        Row: {
          corrections_count: number | null
          created_at: string
          days_remaining: number
          email: string
          id: string
          last_access: string | null
          name: string | null
          status: string
          subscription_end: string | null
          subscription_start: string | null
          updated_at: string
        }
        Insert: {
          corrections_count?: number | null
          created_at?: string
          days_remaining?: number
          email: string
          id?: string
          last_access?: string | null
          name?: string | null
          status?: string
          subscription_end?: string | null
          subscription_start?: string | null
          updated_at?: string
        }
        Update: {
          corrections_count?: number | null
          created_at?: string
          days_remaining?: number
          email?: string
          id?: string
          last_access?: string | null
          name?: string | null
          status?: string
          subscription_end?: string | null
          subscription_start?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      created_accesses: {
        Row: {
          access_type: string
          api_created: boolean | null
          created_at: string
          customer_email: string
          customer_name: string | null
          days_access: number | null
          email_opened: boolean | null
          email_opened_at: string | null
          email_sent: boolean | null
          email_sent_at: string | null
          expiration_date: string | null
          expiration_warning_sent: boolean | null
          expiration_warning_sent_at: string | null
          expired_notification_sent: boolean | null
          expired_notification_sent_at: string | null
          id: string
          notes: string | null
          password: string
          service_type: string
          tracking_id: string | null
          updated_at: string
          username: string
        }
        Insert: {
          access_type: string
          api_created?: boolean | null
          created_at?: string
          customer_email: string
          customer_name?: string | null
          days_access?: number | null
          email_opened?: boolean | null
          email_opened_at?: string | null
          email_sent?: boolean | null
          email_sent_at?: string | null
          expiration_date?: string | null
          expiration_warning_sent?: boolean | null
          expiration_warning_sent_at?: string | null
          expired_notification_sent?: boolean | null
          expired_notification_sent_at?: string | null
          id?: string
          notes?: string | null
          password: string
          service_type: string
          tracking_id?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          access_type?: string
          api_created?: boolean | null
          created_at?: string
          customer_email?: string
          customer_name?: string | null
          days_access?: number | null
          email_opened?: boolean | null
          email_opened_at?: string | null
          email_sent?: boolean | null
          email_sent_at?: string | null
          expiration_date?: string | null
          expiration_warning_sent?: boolean | null
          expiration_warning_sent_at?: string | null
          expired_notification_sent?: boolean | null
          expired_notification_sent_at?: string | null
          id?: string
          notes?: string | null
          password?: string
          service_type?: string
          tracking_id?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      creatordev_requests: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          project_description: string
          status: string
          whatsapp: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          project_description: string
          status?: string
          whatsapp: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          project_description?: string
          status?: string
          whatsapp?: string
        }
        Relationships: []
      }
      creatordev_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      crm_activities: {
        Row: {
          activity_type: string
          contact_id: string | null
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          activity_type: string
          contact_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          activity_type?: string
          contact_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_broadcasts: {
        Row: {
          buttons: Json | null
          created_at: string | null
          failed_count: number | null
          flow_id: string | null
          id: string
          message_text: string
          name: string
          random_delay_max: number | null
          random_delay_min: number | null
          sent_count: number | null
          status: string | null
          target_type: string | null
          template_id: string | null
          total_contacts: number | null
          type: string | null
          uploaded_numbers: string[] | null
        }
        Insert: {
          buttons?: Json | null
          created_at?: string | null
          failed_count?: number | null
          flow_id?: string | null
          id?: string
          message_text: string
          name: string
          random_delay_max?: number | null
          random_delay_min?: number | null
          sent_count?: number | null
          status?: string | null
          target_type?: string | null
          template_id?: string | null
          total_contacts?: number | null
          type?: string | null
          uploaded_numbers?: string[] | null
        }
        Update: {
          buttons?: Json | null
          created_at?: string | null
          failed_count?: number | null
          flow_id?: string | null
          id?: string
          message_text?: string
          name?: string
          random_delay_max?: number | null
          random_delay_min?: number | null
          sent_count?: number | null
          status?: string | null
          target_type?: string | null
          template_id?: string | null
          total_contacts?: number | null
          type?: string | null
          uploaded_numbers?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_broadcasts_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "crm_flows"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contacts: {
        Row: {
          ai_active: boolean | null
          ai_analysis_history: Json | null
          ai_strategy_active: boolean | null
          ai_strategy_history: Json | null
          created_at: string | null
          current_flow_id: string | null
          current_node_id: string | null
          current_step_index: number | null
          custom_labels: string[] | null
          flow_state: string | null
          flow_timeout_minutes: number | null
          flow_timeout_node_id: string | null
          google_sync_account_id: string | null
          id: string
          is_qualified: boolean | null
          last_ai_strategy: string | null
          last_flow_interaction: string | null
          last_interaction: string | null
          last_message_received_at: string | null
          last_read_at: string | null
          metadata: Json | null
          name: string | null
          next_execution_time: string | null
          sale_closed: boolean | null
          source_type: string | null
          status: string | null
          total_messages_received: number | null
          total_messages_sent: number | null
          updated_at: string | null
          wa_id: string
        }
        Insert: {
          ai_active?: boolean | null
          ai_analysis_history?: Json | null
          ai_strategy_active?: boolean | null
          ai_strategy_history?: Json | null
          created_at?: string | null
          current_flow_id?: string | null
          current_node_id?: string | null
          current_step_index?: number | null
          custom_labels?: string[] | null
          flow_state?: string | null
          flow_timeout_minutes?: number | null
          flow_timeout_node_id?: string | null
          google_sync_account_id?: string | null
          id?: string
          is_qualified?: boolean | null
          last_ai_strategy?: string | null
          last_flow_interaction?: string | null
          last_interaction?: string | null
          last_message_received_at?: string | null
          last_read_at?: string | null
          metadata?: Json | null
          name?: string | null
          next_execution_time?: string | null
          sale_closed?: boolean | null
          source_type?: string | null
          status?: string | null
          total_messages_received?: number | null
          total_messages_sent?: number | null
          updated_at?: string | null
          wa_id: string
        }
        Update: {
          ai_active?: boolean | null
          ai_analysis_history?: Json | null
          ai_strategy_active?: boolean | null
          ai_strategy_history?: Json | null
          created_at?: string | null
          current_flow_id?: string | null
          current_node_id?: string | null
          current_step_index?: number | null
          custom_labels?: string[] | null
          flow_state?: string | null
          flow_timeout_minutes?: number | null
          flow_timeout_node_id?: string | null
          google_sync_account_id?: string | null
          id?: string
          is_qualified?: boolean | null
          last_ai_strategy?: string | null
          last_flow_interaction?: string | null
          last_interaction?: string | null
          last_message_received_at?: string | null
          last_read_at?: string | null
          metadata?: Json | null
          name?: string | null
          next_execution_time?: string | null
          sale_closed?: boolean | null
          source_type?: string | null
          status?: string | null
          total_messages_received?: number | null
          total_messages_sent?: number | null
          updated_at?: string | null
          wa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_contacts_current_flow_id_fkey"
            columns: ["current_flow_id"]
            isOneToOne: false
            referencedRelation: "crm_flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contacts_google_sync_account_id_fkey"
            columns: ["google_sync_account_id"]
            isOneToOne: false
            referencedRelation: "crm_google_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_flow_executions: {
        Row: {
          contact_id: string | null
          created_at: string | null
          current_node_id: string | null
          flow_id: string | null
          id: string
          last_interaction: string | null
          state: Json | null
          updated_at: string | null
          waiting_for_type: string | null
          waiting_since: string | null
        }
        Insert: {
          contact_id?: string | null
          created_at?: string | null
          current_node_id?: string | null
          flow_id?: string | null
          id?: string
          last_interaction?: string | null
          state?: Json | null
          updated_at?: string | null
          waiting_for_type?: string | null
          waiting_since?: string | null
        }
        Update: {
          contact_id?: string | null
          created_at?: string | null
          current_node_id?: string | null
          flow_id?: string | null
          id?: string
          last_interaction?: string | null
          state?: Json | null
          updated_at?: string | null
          waiting_for_type?: string | null
          waiting_since?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_flow_executions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_flow_executions_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "crm_flows"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_flow_steps: {
        Row: {
          buttons: Json | null
          created_at: string | null
          delay_seconds: number | null
          flow_id: string | null
          id: string
          media_type: string | null
          media_url: string | null
          message_text: string | null
          step_order: number
          step_type: string | null
        }
        Insert: {
          buttons?: Json | null
          created_at?: string | null
          delay_seconds?: number | null
          flow_id?: string | null
          id?: string
          media_type?: string | null
          media_url?: string | null
          message_text?: string | null
          step_order: number
          step_type?: string | null
        }
        Update: {
          buttons?: Json | null
          created_at?: string | null
          delay_seconds?: number | null
          flow_id?: string | null
          id?: string
          media_type?: string | null
          media_url?: string | null
          message_text?: string | null
          step_order?: number
          step_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_flow_steps_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "crm_flows"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_flows: {
        Row: {
          created_at: string | null
          description: string | null
          edges: Json | null
          id: string
          is_active: boolean | null
          name: string
          nodes: Json | null
          trigger_keyword: string | null
          trigger_keywords: string[] | null
          trigger_type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          edges?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          nodes?: Json | null
          trigger_keyword?: string | null
          trigger_keywords?: string[] | null
          trigger_type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          edges?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          nodes?: Json | null
          trigger_keyword?: string | null
          trigger_keywords?: string[] | null
          trigger_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      crm_google_accounts: {
        Row: {
          access_token: string
          created_at: string | null
          email: string
          expiry_date: number | null
          id: string
          refresh_token: string | null
          updated_at: string | null
        }
        Insert: {
          access_token: string
          created_at?: string | null
          email: string
          expiry_date?: number | null
          id?: string
          refresh_token?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string
          created_at?: string | null
          email?: string
          expiry_date?: number | null
          id?: string
          refresh_token?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      crm_google_tokens: {
        Row: {
          access_token: string
          expires_at: string | null
          id: string
          refresh_token: string | null
          updated_at: string | null
        }
        Insert: {
          access_token: string
          expires_at?: string | null
          id?: string
          refresh_token?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string
          expires_at?: string | null
          id?: string
          refresh_token?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      crm_messages: {
        Row: {
          contact_id: string | null
          content: string | null
          created_at: string | null
          direction: string | null
          error_code: string | null
          error_message: string | null
          id: string
          media_url: string | null
          message_type: string | null
          meta_message_id: string | null
          metadata: Json | null
          status: string | null
        }
        Insert: {
          contact_id?: string | null
          content?: string | null
          created_at?: string | null
          direction?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          media_url?: string | null
          message_type?: string | null
          meta_message_id?: string | null
          metadata?: Json | null
          status?: string | null
        }
        Update: {
          contact_id?: string | null
          content?: string | null
          created_at?: string | null
          direction?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          media_url?: string | null
          message_type?: string | null
          meta_message_id?: string | null
          metadata?: Json | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_metrics: {
        Row: {
          created_at: string | null
          date: string | null
          id: string
          qualified_count: number | null
          responded_count: number | null
          sales_count: number | null
          sent_count: number | null
        }
        Insert: {
          created_at?: string | null
          date?: string | null
          id?: string
          qualified_count?: number | null
          responded_count?: number | null
          sales_count?: number | null
          sent_count?: number | null
        }
        Update: {
          created_at?: string | null
          date?: string | null
          id?: string
          qualified_count?: number | null
          responded_count?: number | null
          sales_count?: number | null
          sent_count?: number | null
        }
        Relationships: []
      }
      crm_scheduled_messages: {
        Row: {
          contact_id: string | null
          created_at: string | null
          flow_id: string | null
          id: string
          message_data: Json
          node_id: string | null
          scheduled_for: string
          status: string | null
        }
        Insert: {
          contact_id?: string | null
          created_at?: string | null
          flow_id?: string | null
          id?: string
          message_data: Json
          node_id?: string | null
          scheduled_for: string
          status?: string | null
        }
        Update: {
          contact_id?: string | null
          created_at?: string | null
          flow_id?: string | null
          id?: string
          message_data?: Json
          node_id?: string | null
          scheduled_for?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_scheduled_messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_scheduled_messages_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "crm_flows"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_settings: {
        Row: {
          ai_agent_enabled: boolean | null
          ai_agent_trigger: string | null
          ai_agent_trigger_keyword: string | null
          ai_operation_mode: string | null
          ai_system_prompt: string | null
          auto_generate_strategy: boolean | null
          business_hours_enabled: boolean | null
          business_hours_end: string | null
          business_hours_start: string | null
          business_hours_tz: string | null
          created_at: string | null
          google_auto_sync: boolean | null
          google_client_id: string | null
          google_client_secret: string | null
          id: string
          initial_auto_response_enabled: boolean | null
          initial_flow_id: string | null
          initial_response_buttons: Json | null
          initial_response_text: string | null
          meta_access_token: string | null
          meta_app_id: string | null
          meta_app_secret: string | null
          meta_phone_number_id: string | null
          meta_waba_id: string | null
          openai_api_key: string | null
          outside_hours_message: string | null
          shortcut_size: number | null
          strategy_generation_prompt: string | null
          tag_size: number | null
          updated_at: string | null
          vps_transcoder_url: string | null
          webhook_verify_token: string | null
        }
        Insert: {
          ai_agent_enabled?: boolean | null
          ai_agent_trigger?: string | null
          ai_agent_trigger_keyword?: string | null
          ai_operation_mode?: string | null
          ai_system_prompt?: string | null
          auto_generate_strategy?: boolean | null
          business_hours_enabled?: boolean | null
          business_hours_end?: string | null
          business_hours_start?: string | null
          business_hours_tz?: string | null
          created_at?: string | null
          google_auto_sync?: boolean | null
          google_client_id?: string | null
          google_client_secret?: string | null
          id?: string
          initial_auto_response_enabled?: boolean | null
          initial_flow_id?: string | null
          initial_response_buttons?: Json | null
          initial_response_text?: string | null
          meta_access_token?: string | null
          meta_app_id?: string | null
          meta_app_secret?: string | null
          meta_phone_number_id?: string | null
          meta_waba_id?: string | null
          openai_api_key?: string | null
          outside_hours_message?: string | null
          shortcut_size?: number | null
          strategy_generation_prompt?: string | null
          tag_size?: number | null
          updated_at?: string | null
          vps_transcoder_url?: string | null
          webhook_verify_token?: string | null
        }
        Update: {
          ai_agent_enabled?: boolean | null
          ai_agent_trigger?: string | null
          ai_agent_trigger_keyword?: string | null
          ai_operation_mode?: string | null
          ai_system_prompt?: string | null
          auto_generate_strategy?: boolean | null
          business_hours_enabled?: boolean | null
          business_hours_end?: string | null
          business_hours_start?: string | null
          business_hours_tz?: string | null
          created_at?: string | null
          google_auto_sync?: boolean | null
          google_client_id?: string | null
          google_client_secret?: string | null
          id?: string
          initial_auto_response_enabled?: boolean | null
          initial_flow_id?: string | null
          initial_response_buttons?: Json | null
          initial_response_text?: string | null
          meta_access_token?: string | null
          meta_app_id?: string | null
          meta_app_secret?: string | null
          meta_phone_number_id?: string | null
          meta_waba_id?: string | null
          openai_api_key?: string | null
          outside_hours_message?: string | null
          shortcut_size?: number | null
          strategy_generation_prompt?: string | null
          tag_size?: number | null
          updated_at?: string | null
          vps_transcoder_url?: string | null
          webhook_verify_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_settings_initial_flow_id_fkey"
            columns: ["initial_flow_id"]
            isOneToOne: false
            referencedRelation: "crm_flows"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_statuses: {
        Row: {
          color: string
          created_at: string | null
          id: string
          is_starred: boolean | null
          label: string
          sort_order: number
          updated_at: string | null
          value: string
        }
        Insert: {
          color?: string
          created_at?: string | null
          id?: string
          is_starred?: boolean | null
          label: string
          sort_order?: number
          updated_at?: string | null
          value: string
        }
        Update: {
          color?: string
          created_at?: string | null
          id?: string
          is_starred?: boolean | null
          label?: string
          sort_order?: number
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      crm_templates: {
        Row: {
          category: string | null
          components: Json | null
          created_at: string | null
          id: string
          is_carousel: boolean | null
          is_pix: boolean | null
          knowledge_description: string | null
          language: string | null
          name: string
          pix_code: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          components?: Json | null
          created_at?: string | null
          id: string
          is_carousel?: boolean | null
          is_pix?: boolean | null
          knowledge_description?: string | null
          language?: string | null
          name: string
          pix_code?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          components?: Json | null
          created_at?: string | null
          id?: string
          is_carousel?: boolean | null
          is_pix?: boolean | null
          knowledge_description?: string | null
          language?: string | null
          name?: string
          pix_code?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      crm_webhook_delivery_logs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message: string | null
          order_id: string | null
          status: string
          to_number: string
          webhook_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message?: string | null
          order_id?: string | null
          status: string
          to_number: string
          webhook_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message?: string | null
          order_id?: string | null
          status?: string
          to_number?: string
          webhook_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_webhook_delivery_logs_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "crm_webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_webhooks: {
        Row: {
          created_at: string
          default_status: string
          id: string
          is_active: boolean
          last_used_at: string | null
          message_template: string | null
          metadata: Json | null
          name: string
          response_type: string
          secret_token: string
          template_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_status?: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          message_template?: string | null
          metadata?: Json | null
          name: string
          response_type?: string
          secret_token?: string
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_status?: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          message_template?: string | null
          metadata?: Json | null
          name?: string
          response_type?: string
          secret_token?: string
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_webhooks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "crm_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_email_logs: {
        Row: {
          created_at: string
          email_to: string
          email_type: string
          error_message: string | null
          id: string
          status: string
          subject: string | null
        }
        Insert: {
          created_at?: string
          email_to: string
          email_type: string
          error_message?: string | null
          id?: string
          status: string
          subject?: string | null
        }
        Update: {
          created_at?: string
          email_to?: string
          email_type?: string
          error_message?: string | null
          id?: string
          status?: string
          subject?: string | null
        }
        Relationships: []
      }
      delivery_orders: {
        Row: {
          amount: number
          created_at: string
          email: string
          email_sent: boolean | null
          email_sent_at: string | null
          expired_at: string | null
          fbc: string | null
          fbp: string | null
          id: string
          infinitepay_link: string | null
          nome_completo: string
          nsu_order: string
          paid_at: string | null
          pixel_sent: boolean | null
          pixel_sent_at: string | null
          status: string
          updated_at: string
          user_agent: string | null
          whatsapp: string
        }
        Insert: {
          amount?: number
          created_at?: string
          email: string
          email_sent?: boolean | null
          email_sent_at?: string | null
          expired_at?: string | null
          fbc?: string | null
          fbp?: string | null
          id?: string
          infinitepay_link?: string | null
          nome_completo: string
          nsu_order: string
          paid_at?: string | null
          pixel_sent?: boolean | null
          pixel_sent_at?: string | null
          status?: string
          updated_at?: string
          user_agent?: string | null
          whatsapp: string
        }
        Update: {
          amount?: number
          created_at?: string
          email?: string
          email_sent?: boolean | null
          email_sent_at?: string | null
          expired_at?: string | null
          fbc?: string | null
          fbp?: string | null
          id?: string
          infinitepay_link?: string | null
          nome_completo?: string
          nsu_order?: string
          paid_at?: string | null
          pixel_sent?: boolean | null
          pixel_sent_at?: string | null
          status?: string
          updated_at?: string
          user_agent?: string | null
          whatsapp?: string
        }
        Relationships: []
      }
      delivery_settings: {
        Row: {
          aula_data: string
          aula_titulo: string
          created_at: string
          hero_video_hls_url: string
          hero_video_url: string
          id: string
          preco: number
          updated_at: string
          whatsapp_group_link: string
        }
        Insert: {
          aula_data?: string
          aula_titulo?: string
          created_at?: string
          hero_video_hls_url?: string
          hero_video_url?: string
          id?: string
          preco?: number
          updated_at?: string
          whatsapp_group_link?: string
        }
        Update: {
          aula_data?: string
          aula_titulo?: string
          created_at?: string
          hero_video_hls_url?: string
          hero_video_url?: string
          id?: string
          preco?: number
          updated_at?: string
          whatsapp_group_link?: string
        }
        Relationships: []
      }
      delivery_visits: {
        Row: {
          created_at: string
          id: string
          referrer: string | null
          session_id: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      desconto_alunos_settings: {
        Row: {
          hls_url: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
          video_title: string | null
          video_url: string | null
        }
        Insert: {
          hls_url?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          video_title?: string | null
          video_url?: string | null
        }
        Update: {
          hls_url?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          video_title?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      empresas_email_logs: {
        Row: {
          created_at: string
          email_to: string
          email_type: string
          error_message: string | null
          id: string
          lead_id: string | null
          status: string | null
          subject: string | null
        }
        Insert: {
          created_at?: string
          email_to: string
          email_type: string
          error_message?: string | null
          id?: string
          lead_id?: string | null
          status?: string | null
          subject?: string | null
        }
        Update: {
          created_at?: string
          email_to?: string
          email_type?: string
          error_message?: string | null
          id?: string
          lead_id?: string | null
          status?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empresas_email_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "empresas_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas_leads: {
        Row: {
          created_at: string
          dispositivo: string | null
          email: string
          email_confirmacao_enviado: boolean | null
          email_confirmacao_enviado_at: string | null
          id: string
          iniciando_digital: string | null
          marca_e_passa: string | null
          nome_completo: string
          presta_servico: string | null
          tem_empresa: string | null
          updated_at: string
          vende_produto: string | null
          whatsapp: string
        }
        Insert: {
          created_at?: string
          dispositivo?: string | null
          email: string
          email_confirmacao_enviado?: boolean | null
          email_confirmacao_enviado_at?: string | null
          id?: string
          iniciando_digital?: string | null
          marca_e_passa?: string | null
          nome_completo: string
          presta_servico?: string | null
          tem_empresa?: string | null
          updated_at?: string
          vende_produto?: string | null
          whatsapp: string
        }
        Update: {
          created_at?: string
          dispositivo?: string | null
          email?: string
          email_confirmacao_enviado?: boolean | null
          email_confirmacao_enviado_at?: string | null
          id?: string
          iniciando_digital?: string | null
          marca_e_passa?: string | null
          nome_completo?: string
          presta_servico?: string | null
          tem_empresa?: string | null
          updated_at?: string
          vende_produto?: string | null
          whatsapp?: string
        }
        Relationships: []
      }
      empresas_settings: {
        Row: {
          created_at: string
          id: string
          page_subtitle: string | null
          page_title: string | null
          updated_at: string
          whatsapp_group_link: string
        }
        Insert: {
          created_at?: string
          id?: string
          page_subtitle?: string | null
          page_title?: string | null
          updated_at?: string
          whatsapp_group_link?: string
        }
        Update: {
          created_at?: string
          id?: string
          page_subtitle?: string | null
          page_title?: string | null
          updated_at?: string
          whatsapp_group_link?: string
        }
        Relationships: []
      }
      estrutura4_discount_leads: {
        Row: {
          accessed_discount_at: string | null
          auto_remarketing_enabled: boolean
          created_at: string
          email: string
          emails_sent_count: number
          expires_at: string
          id: string
          last_email_sent_at: string | null
          next_send_at: string | null
          nome: string
          remarketing_stage: number
          source: string | null
          token: string
          updated_at: string
          whatsapp: string
        }
        Insert: {
          accessed_discount_at?: string | null
          auto_remarketing_enabled?: boolean
          created_at?: string
          email: string
          emails_sent_count?: number
          expires_at: string
          id?: string
          last_email_sent_at?: string | null
          next_send_at?: string | null
          nome: string
          remarketing_stage?: number
          source?: string | null
          token: string
          updated_at?: string
          whatsapp: string
        }
        Update: {
          accessed_discount_at?: string | null
          auto_remarketing_enabled?: boolean
          created_at?: string
          email?: string
          emails_sent_count?: number
          expires_at?: string
          id?: string
          last_email_sent_at?: string | null
          next_send_at?: string | null
          nome?: string
          remarketing_stage?: number
          source?: string | null
          token?: string
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
      estrutura4_discount_video_log: {
        Row: {
          abandoned_email_sent_at: string | null
          accessed_at: string
          created_at: string
          email: string
          id: string
          last_milestone: string
          last_progress_at: string
          milestones_sent: Json
          nome: string | null
          updated_at: string
        }
        Insert: {
          abandoned_email_sent_at?: string | null
          accessed_at?: string
          created_at?: string
          email: string
          id?: string
          last_milestone?: string
          last_progress_at?: string
          milestones_sent?: Json
          nome?: string | null
          updated_at?: string
        }
        Update: {
          abandoned_email_sent_at?: string | null
          accessed_at?: string
          created_at?: string
          email?: string
          id?: string
          last_milestone?: string
          last_progress_at?: string
          milestones_sent?: Json
          nome?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      estrutura4_discount_visits: {
        Row: {
          created_at: string
          email: string | null
          id: string
          ip: string | null
          page: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          ip?: string | null
          page: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          ip?: string | null
          page?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      estrutura4_remarketing_logs: {
        Row: {
          email: string
          id: string
          link: string | null
          nome: string | null
          notes: string | null
          sent_at: string
          source_page: string | null
          success: boolean
          tipo_computador: string | null
          whatsapp: string | null
        }
        Insert: {
          email: string
          id?: string
          link?: string | null
          nome?: string | null
          notes?: string | null
          sent_at?: string
          source_page?: string | null
          success?: boolean
          tipo_computador?: string | null
          whatsapp?: string | null
        }
        Update: {
          email?: string
          id?: string
          link?: string | null
          nome?: string | null
          notes?: string | null
          sent_at?: string
          source_page?: string | null
          success?: boolean
          tipo_computador?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      ferramentamropromo_analytics: {
        Row: {
          created_at: string
          event_type: string
          id: string
          path: string | null
          progress_pct: number | null
          referrer: string | null
          user_agent: string | null
          visitor_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          path?: string | null
          progress_pct?: number | null
          referrer?: string | null
          user_agent?: string | null
          visitor_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          path?: string | null
          progress_pct?: number | null
          referrer?: string | null
          user_agent?: string | null
          visitor_id?: string
        }
        Relationships: []
      }
      ferramentamropromo_settings: {
        Row: {
          created_at: string
          hls_url: string | null
          id: string
          is_active: boolean
          updated_at: string
          video_title: string | null
          video_url: string | null
        }
        Insert: {
          created_at?: string
          hls_url?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
          video_title?: string | null
          video_url?: string | null
        }
        Update: {
          created_at?: string
          hls_url?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
          video_title?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      free_trial_registrations: {
        Row: {
          created_at: string
          email: string
          email_sent: boolean | null
          expiration_email_sent: boolean | null
          expires_at: string
          full_name: string
          generated_password: string
          generated_username: string
          id: string
          instagram_removed: boolean | null
          instagram_removed_at: string | null
          instagram_username: string
          mro_master_user: string
          profile_screenshot_url: string | null
          registered_at: string
          updated_at: string
          whatsapp: string
        }
        Insert: {
          created_at?: string
          email: string
          email_sent?: boolean | null
          expiration_email_sent?: boolean | null
          expires_at: string
          full_name: string
          generated_password: string
          generated_username: string
          id?: string
          instagram_removed?: boolean | null
          instagram_removed_at?: string | null
          instagram_username: string
          mro_master_user: string
          profile_screenshot_url?: string | null
          registered_at?: string
          updated_at?: string
          whatsapp: string
        }
        Update: {
          created_at?: string
          email?: string
          email_sent?: boolean | null
          expiration_email_sent?: boolean | null
          expires_at?: string
          full_name?: string
          generated_password?: string
          generated_username?: string
          id?: string
          instagram_removed?: boolean | null
          instagram_removed_at?: string | null
          instagram_username?: string
          mro_master_user?: string
          profile_screenshot_url?: string | null
          registered_at?: string
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
      free_trial_settings: {
        Row: {
          created_at: string
          download_link: string | null
          group_link: string | null
          id: string
          installation_video_thumbnail: string | null
          installation_video_url: string | null
          is_active: boolean | null
          mro_master_password: string
          mro_master_username: string
          trial_duration_hours: number | null
          updated_at: string
          usage_video_thumbnail: string | null
          usage_video_url: string | null
          welcome_video_thumbnail: string | null
          welcome_video_url: string | null
        }
        Insert: {
          created_at?: string
          download_link?: string | null
          group_link?: string | null
          id?: string
          installation_video_thumbnail?: string | null
          installation_video_url?: string | null
          is_active?: boolean | null
          mro_master_password: string
          mro_master_username: string
          trial_duration_hours?: number | null
          updated_at?: string
          usage_video_thumbnail?: string | null
          usage_video_url?: string | null
          welcome_video_thumbnail?: string | null
          welcome_video_url?: string | null
        }
        Update: {
          created_at?: string
          download_link?: string | null
          group_link?: string | null
          id?: string
          installation_video_thumbnail?: string | null
          installation_video_url?: string | null
          is_active?: boolean | null
          mro_master_password?: string
          mro_master_username?: string
          trial_duration_hours?: number | null
          updated_at?: string
          usage_video_thumbnail?: string | null
          usage_video_url?: string | null
          welcome_video_thumbnail?: string | null
          welcome_video_url?: string | null
        }
        Relationships: []
      }
      hub_access: {
        Row: {
          created_at: string
          email: string | null
          expires_at: string | null
          id: string
          product_id: string
          source: string
          username: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          expires_at?: string | null
          id?: string
          product_id: string
          source?: string
          username?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          expires_at?: string | null
          id?: string
          product_id?: string
          source?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hub_access_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "hub_products"
            referencedColumns: ["id"]
          },
        ]
      }
      hub_blocked_users: {
        Row: {
          created_at: string
          email: string | null
          id: string
          reason: string | null
          username: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          reason?: string | null
          username?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          reason?: string | null
          username?: string | null
        }
        Relationships: []
      }
      hub_merge_logs: {
        Row: {
          accounts: Json
          created_at: string
          email_sent: boolean
          id: string
          primary_tool: string | null
          primary_username: string | null
          reason: string | null
          reverted: boolean
          reverted_at: string | null
          target_email: string
        }
        Insert: {
          accounts?: Json
          created_at?: string
          email_sent?: boolean
          id?: string
          primary_tool?: string | null
          primary_username?: string | null
          reason?: string | null
          reverted?: boolean
          reverted_at?: string | null
          target_email: string
        }
        Update: {
          accounts?: Json
          created_at?: string
          email_sent?: boolean
          id?: string
          primary_tool?: string | null
          primary_username?: string | null
          reason?: string | null
          reverted?: boolean
          reverted_at?: string | null
          target_email?: string
        }
        Relationships: []
      }
      hub_orders: {
        Row: {
          amount: number
          created_at: string
          email: string
          id: string
          infinitepay_link: string | null
          name: string | null
          nsu_order: string | null
          paid_at: string | null
          product_id: string | null
          product_slug: string | null
          status: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          email: string
          id?: string
          infinitepay_link?: string | null
          name?: string | null
          nsu_order?: string | null
          paid_at?: string | null
          product_id?: string | null
          product_slug?: string | null
          status?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          email?: string
          id?: string
          infinitepay_link?: string | null
          name?: string | null
          nsu_order?: string | null
          paid_at?: string | null
          product_id?: string | null
          product_slug?: string | null
          status?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hub_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "hub_products"
            referencedColumns: ["id"]
          },
        ]
      }
      hub_product_ebooks: {
        Row: {
          audio_url: string | null
          cover_url: string | null
          created_at: string | null
          description: string | null
          ebook_url: string | null
          id: string
          order_index: number | null
          product_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          audio_url?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          ebook_url?: string | null
          id?: string
          order_index?: number | null
          product_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          audio_url?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          ebook_url?: string | null
          id?: string
          order_index?: number | null
          product_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hub_product_ebooks_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "hub_products"
            referencedColumns: ["id"]
          },
        ]
      }
      hub_product_tutorials: {
        Row: {
          cover_url: string | null
          created_at: string
          description: string | null
          download_url: string | null
          id: string
          is_active: boolean
          order_index: number
          product_id: string
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          download_url?: string | null
          id?: string
          is_active?: boolean
          order_index?: number
          product_id: string
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          download_url?: string | null
          id?: string
          is_active?: boolean
          order_index?: number
          product_id?: string
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hub_product_tutorials_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "hub_products"
            referencedColumns: ["id"]
          },
        ]
      }
      hub_products: {
        Row: {
          access_source: string
          app_route: string | null
          badge_text: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_ebook_hub: boolean | null
          is_pinned: boolean | null
          is_redirect_only: boolean | null
          new_until: string | null
          order_index: number
          plan_type: string | null
          price: number
          sales_page_url: string | null
          slug: string
          status: string | null
          thumb_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          access_source?: string
          app_route?: string | null
          badge_text?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_ebook_hub?: boolean | null
          is_pinned?: boolean | null
          is_redirect_only?: boolean | null
          new_until?: string | null
          order_index?: number
          plan_type?: string | null
          price?: number
          sales_page_url?: string | null
          slug: string
          status?: string | null
          thumb_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          access_source?: string
          app_route?: string | null
          badge_text?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_ebook_hub?: boolean | null
          is_pinned?: boolean | null
          is_redirect_only?: boolean | null
          new_until?: string | null
          order_index?: number
          plan_type?: string | null
          price?: number
          sales_page_url?: string | null
          slug?: string
          status?: string | null
          thumb_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      ig_accounts: {
        Row: {
          account_type: string | null
          connection_state: string
          created_at: string
          deleted_at: string | null
          followers_count: number | null
          id: string
          instagram_account_id: string
          instagram_user_id: string | null
          is_active: boolean
          last_error: string | null
          last_synced_at: string | null
          media_count: number | null
          name: string | null
          profile_picture_url: string | null
          tenant_id: string
          updated_at: string
          username: string | null
          webhook_subscribed: boolean
        }
        Insert: {
          account_type?: string | null
          connection_state?: string
          created_at?: string
          deleted_at?: string | null
          followers_count?: number | null
          id?: string
          instagram_account_id: string
          instagram_user_id?: string | null
          is_active?: boolean
          last_error?: string | null
          last_synced_at?: string | null
          media_count?: number | null
          name?: string | null
          profile_picture_url?: string | null
          tenant_id: string
          updated_at?: string
          username?: string | null
          webhook_subscribed?: boolean
        }
        Update: {
          account_type?: string | null
          connection_state?: string
          created_at?: string
          deleted_at?: string | null
          followers_count?: number | null
          id?: string
          instagram_account_id?: string
          instagram_user_id?: string | null
          is_active?: boolean
          last_error?: string | null
          last_synced_at?: string | null
          media_count?: number | null
          name?: string | null
          profile_picture_url?: string | null
          tenant_id?: string
          updated_at?: string
          username?: string | null
          webhook_subscribed?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "ig_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "ig_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ig_admin_accounts: {
        Row: {
          created_at: string
          email: string
          failed_attempts: number
          id: string
          last_login_at: string | null
          locked_until: string | null
          must_change_password: boolean
          password_hash: string
          password_salt: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          failed_attempts?: number
          id?: string
          last_login_at?: string | null
          locked_until?: string | null
          must_change_password?: boolean
          password_hash: string
          password_salt: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          failed_attempts?: number
          id?: string
          last_login_at?: string | null
          locked_until?: string | null
          must_change_password?: boolean
          password_hash?: string
          password_salt?: string
          updated_at?: string
        }
        Relationships: []
      }
      ig_app_config: {
        Row: {
          app_id: string | null
          app_secret: string | null
          created_at: string
          id: string
          redirect_uri: string | null
          scopes: string | null
          updated_at: string
          updated_by: string | null
          webhook_verify_token: string | null
        }
        Insert: {
          app_id?: string | null
          app_secret?: string | null
          created_at?: string
          id?: string
          redirect_uri?: string | null
          scopes?: string | null
          updated_at?: string
          updated_by?: string | null
          webhook_verify_token?: string | null
        }
        Update: {
          app_id?: string | null
          app_secret?: string | null
          created_at?: string
          id?: string
          redirect_uri?: string | null
          scopes?: string | null
          updated_at?: string
          updated_by?: string | null
          webhook_verify_token?: string | null
        }
        Relationships: []
      }
      ig_audit_logs: {
        Row: {
          action: string
          actor_type: string
          actor_user_id: string | null
          created_at: string
          id: string
          ip: string | null
          metadata: Json
          result: string
          target: string | null
          tenant_id: string | null
        }
        Insert: {
          action: string
          actor_type?: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          metadata?: Json
          result?: string
          target?: string | null
          tenant_id?: string | null
        }
        Update: {
          action?: string
          actor_type?: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          metadata?: Json
          result?: string
          target?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ig_audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "ig_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ig_conversations: {
        Row: {
          created_at: string
          id: string
          ig_account_id: string
          last_direction: string | null
          last_message_at: string | null
          last_message_text: string | null
          participant_id: string
          participant_name: string | null
          participant_picture_url: string | null
          participant_username: string | null
          tenant_id: string
          unread_count: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          ig_account_id: string
          last_direction?: string | null
          last_message_at?: string | null
          last_message_text?: string | null
          participant_id: string
          participant_name?: string | null
          participant_picture_url?: string | null
          participant_username?: string | null
          tenant_id: string
          unread_count?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          ig_account_id?: string
          last_direction?: string | null
          last_message_at?: string | null
          last_message_text?: string | null
          participant_id?: string
          participant_name?: string | null
          participant_picture_url?: string | null
          participant_username?: string | null
          tenant_id?: string
          unread_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ig_conversations_ig_account_id_fkey"
            columns: ["ig_account_id"]
            isOneToOne: false
            referencedRelation: "ig_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ig_conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "ig_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ig_jobs: {
        Row: {
          attempts: number
          created_at: string
          dedupe_key: string | null
          id: string
          last_error: string | null
          max_attempts: number
          payload: Json
          run_after: string
          status: string
          tenant_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          dedupe_key?: string | null
          id?: string
          last_error?: string | null
          max_attempts?: number
          payload?: Json
          run_after?: string
          status?: string
          tenant_id?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          dedupe_key?: string | null
          id?: string
          last_error?: string | null
          max_attempts?: number
          payload?: Json
          run_after?: string
          status?: string
          tenant_id?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ig_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "ig_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ig_messages: {
        Row: {
          attachments: Json
          conversation_id: string
          created_at: string
          direction: string
          id: string
          ig_account_id: string
          mid: string | null
          recipient_id: string | null
          sender_id: string | null
          sent_at: string
          tenant_id: string
          text: string | null
        }
        Insert: {
          attachments?: Json
          conversation_id: string
          created_at?: string
          direction: string
          id?: string
          ig_account_id: string
          mid?: string | null
          recipient_id?: string | null
          sender_id?: string | null
          sent_at?: string
          tenant_id: string
          text?: string | null
        }
        Update: {
          attachments?: Json
          conversation_id?: string
          created_at?: string
          direction?: string
          id?: string
          ig_account_id?: string
          mid?: string | null
          recipient_id?: string | null
          sender_id?: string | null
          sent_at?: string
          tenant_id?: string
          text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ig_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ig_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ig_messages_ig_account_id_fkey"
            columns: ["ig_account_id"]
            isOneToOne: false
            referencedRelation: "ig_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ig_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "ig_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ig_notification_settings: {
        Row: {
          account_disconnected: boolean
          automation_executed: boolean
          growth_alert: boolean
          meta_error: boolean
          new_comment: boolean
          new_message: boolean
          publish_failed: boolean
          tenant_id: string
          updated_at: string
        }
        Insert: {
          account_disconnected?: boolean
          automation_executed?: boolean
          growth_alert?: boolean
          meta_error?: boolean
          new_comment?: boolean
          new_message?: boolean
          publish_failed?: boolean
          tenant_id: string
          updated_at?: string
        }
        Update: {
          account_disconnected?: boolean
          automation_executed?: boolean
          growth_alert?: boolean
          meta_error?: boolean
          new_comment?: boolean
          new_message?: boolean
          publish_failed?: boolean
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ig_notification_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "ig_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ig_notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          read_at: string | null
          tenant_id: string
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          tenant_id: string
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          tenant_id?: string
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ig_notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "ig_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ig_plans: {
        Row: {
          created_at: string
          features: Json
          history_days: number
          id: string
          is_active: boolean
          max_accounts: number
          max_ai_calls_month: number
          max_automations: number
          max_members: number
          max_messages_month: number
          name: string
          price_cents: number
        }
        Insert: {
          created_at?: string
          features?: Json
          history_days?: number
          id: string
          is_active?: boolean
          max_accounts?: number
          max_ai_calls_month?: number
          max_automations?: number
          max_members?: number
          max_messages_month?: number
          name: string
          price_cents?: number
        }
        Update: {
          created_at?: string
          features?: Json
          history_days?: number
          id?: string
          is_active?: boolean
          max_accounts?: number
          max_ai_calls_month?: number
          max_automations?: number
          max_members?: number
          max_messages_month?: number
          name?: string
          price_cents?: number
        }
        Relationships: []
      }
      ig_profiles: {
        Row: {
          avatar_url: string | null
          company: string | null
          created_at: string
          email: string | null
          full_name: string | null
          is_blocked: boolean
          last_login_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          is_blocked?: boolean
          last_login_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          is_blocked?: boolean
          last_login_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ig_rate_limits: {
        Row: {
          bucket: string
          count: number
          window_start: string
        }
        Insert: {
          bucket: string
          count?: number
          window_start?: string
        }
        Update: {
          bucket?: string
          count?: number
          window_start?: string
        }
        Relationships: []
      }
      ig_subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          plan_id: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan_id: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan_id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ig_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "ig_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ig_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "ig_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ig_super_admins: {
        Row: {
          created_at: string
          email: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          user_id?: string
        }
        Relationships: []
      }
      ig_tenant_members: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["ig_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["ig_role"]
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["ig_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ig_tenant_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "ig_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ig_tenants: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_blocked: boolean
          name: string
          onboarding_done: boolean
          plan_id: string
          slug: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_blocked?: boolean
          name: string
          onboarding_done?: boolean
          plan_id?: string
          slug?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_blocked?: boolean
          name?: string
          onboarding_done?: boolean
          plan_id?: string
          slug?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ig_tenants_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "ig_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      ig_tokens: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string | null
          id: string
          ig_account_id: string
          tenant_id: string
          token_type: string
          updated_at: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at?: string | null
          id?: string
          ig_account_id: string
          tenant_id: string
          token_type?: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          ig_account_id?: string
          tenant_id?: string
          token_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ig_tokens_ig_account_id_fkey"
            columns: ["ig_account_id"]
            isOneToOne: false
            referencedRelation: "ig_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ig_tokens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "ig_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ig_usage: {
        Row: {
          id: string
          metric: string
          period_start: string
          tenant_id: string
          updated_at: string
          value: number
        }
        Insert: {
          id?: string
          metric: string
          period_start?: string
          tenant_id: string
          updated_at?: string
          value?: number
        }
        Update: {
          id?: string
          metric?: string
          period_start?: string
          tenant_id?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "ig_usage_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "ig_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ig_webhook_events: {
        Row: {
          error: string | null
          event_key: string
          field: string | null
          id: string
          instagram_account_id: string | null
          object: string | null
          payload: Json
          processed_at: string | null
          received_at: string
          status: string
          tenant_id: string | null
        }
        Insert: {
          error?: string | null
          event_key: string
          field?: string | null
          id?: string
          instagram_account_id?: string | null
          object?: string | null
          payload: Json
          processed_at?: string | null
          received_at?: string
          status?: string
          tenant_id?: string | null
        }
        Update: {
          error?: string | null
          event_key?: string
          field?: string | null
          id?: string
          instagram_account_id?: string | null
          object?: string | null
          payload?: Json
          processed_at?: string | null
          received_at?: string
          status?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ig_webhook_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "ig_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      infinitepay_webhook_logs: {
        Row: {
          affiliate_id: string | null
          amount: number | null
          created_at: string
          email: string | null
          event_type: string
          id: string
          order_found: boolean | null
          order_id: string | null
          order_nsu: string | null
          payload: Json | null
          result_message: string | null
          status: string
          transaction_nsu: string | null
          username: string | null
        }
        Insert: {
          affiliate_id?: string | null
          amount?: number | null
          created_at?: string
          email?: string | null
          event_type?: string
          id?: string
          order_found?: boolean | null
          order_id?: string | null
          order_nsu?: string | null
          payload?: Json | null
          result_message?: string | null
          status?: string
          transaction_nsu?: string | null
          username?: string | null
        }
        Update: {
          affiliate_id?: string | null
          amount?: number | null
          created_at?: string
          email?: string | null
          event_type?: string
          id?: string
          order_found?: boolean | null
          order_id?: string | null
          order_nsu?: string | null
          payload?: Json | null
          result_message?: string | null
          status?: string
          transaction_nsu?: string | null
          username?: string | null
        }
        Relationships: []
      }
      instagrammnew_leads: {
        Row: {
          accessed_page_at: string | null
          auto_remarketing_enabled: boolean
          created_at: string
          email: string
          emails_sent_count: number
          expires_at: string
          id: string
          last_email_sent_at: string | null
          next_send_at: string | null
          nome: string
          remarketing_stage: number
          source: string | null
          token: string
          updated_at: string
          whatsapp: string
        }
        Insert: {
          accessed_page_at?: string | null
          auto_remarketing_enabled?: boolean
          created_at?: string
          email: string
          emails_sent_count?: number
          expires_at: string
          id?: string
          last_email_sent_at?: string | null
          next_send_at?: string | null
          nome: string
          remarketing_stage?: number
          source?: string | null
          token: string
          updated_at?: string
          whatsapp: string
        }
        Update: {
          accessed_page_at?: string | null
          auto_remarketing_enabled?: boolean
          created_at?: string
          email?: string
          emails_sent_count?: number
          expires_at?: string
          id?: string
          last_email_sent_at?: string | null
          next_send_at?: string | null
          nome?: string
          remarketing_stage?: number
          source?: string | null
          token?: string
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
      instagrammnew_settings: {
        Row: {
          created_at: string
          hls_url: string | null
          id: string
          is_active: boolean
          updated_at: string
          video_title: string | null
          video_url: string | null
        }
        Insert: {
          created_at?: string
          hls_url?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
          video_title?: string | null
          video_url?: string | null
        }
        Update: {
          created_at?: string
          hls_url?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
          video_title?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      instagrammnew_video_log: {
        Row: {
          abandoned_email_sent_at: string | null
          accessed_at: string
          created_at: string
          email: string
          id: string
          last_milestone: string | null
          last_progress_at: string
          milestones_sent: Json
          nome: string | null
          updated_at: string
        }
        Insert: {
          abandoned_email_sent_at?: string | null
          accessed_at?: string
          created_at?: string
          email: string
          id?: string
          last_milestone?: string | null
          last_progress_at?: string
          milestones_sent?: Json
          nome?: string | null
          updated_at?: string
        }
        Update: {
          abandoned_email_sent_at?: string | null
          accessed_at?: string
          created_at?: string
          email?: string
          id?: string
          last_milestone?: string | null
          last_progress_at?: string
          milestones_sent?: Json
          nome?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      inteligencia_fotos_admins: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string | null
          password: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name?: string | null
          password: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          password?: string
        }
        Relationships: []
      }
      inteligencia_fotos_generations: {
        Row: {
          created_at: string
          format: string
          generated_image_url: string
          id: string
          input_image_url: string
          saved: boolean | null
          template_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          format?: string
          generated_image_url: string
          id?: string
          input_image_url: string
          saved?: boolean | null
          template_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          format?: string
          generated_image_url?: string
          id?: string
          input_image_url?: string
          saved?: boolean | null
          template_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inteligencia_fotos_generations_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "inteligencia_fotos_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inteligencia_fotos_generations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "inteligencia_fotos_users"
            referencedColumns: ["id"]
          },
        ]
      }
      inteligencia_fotos_settings: {
        Row: {
          created_at: string
          id: string
          setting_key: string
          setting_value: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          setting_key: string
          setting_value?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          setting_key?: string
          setting_value?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      inteligencia_fotos_templates: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string
          is_active: boolean | null
          order_index: number | null
          prompt: string
          title: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url: string
          is_active?: boolean | null
          order_index?: number | null
          prompt: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          order_index?: number | null
          prompt?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      inteligencia_fotos_users: {
        Row: {
          created_at: string
          email: string
          id: string
          last_access: string | null
          name: string
          password: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          last_access?: string | null
          name: string
          password: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          last_access?: string | null
          name?: string
          password?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      license_keys: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean
          last_validated_at: string | null
          license_key: string
          password: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          last_validated_at?: string | null
          license_key: string
          password: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          last_validated_at?: string | null
          license_key?: string
          password?: string
          updated_at?: string
        }
        Relationships: []
      }
      license_settings: {
        Row: {
          admin_email: string
          admin_password: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          admin_email?: string
          admin_password?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          admin_email?: string
          admin_password?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      live_analytics: {
        Row: {
          created_at: string
          device_type: string | null
          id: string
          session_id: string
          updated_at: string
          user_agent: string | null
          visitor_id: string
          watch_percentage: number
        }
        Insert: {
          created_at?: string
          device_type?: string | null
          id?: string
          session_id: string
          updated_at?: string
          user_agent?: string | null
          visitor_id: string
          watch_percentage?: number
        }
        Update: {
          created_at?: string
          device_type?: string | null
          id?: string
          session_id?: string
          updated_at?: string
          user_agent?: string | null
          visitor_id?: string
          watch_percentage?: number
        }
        Relationships: [
          {
            foreignKeyName: "live_analytics_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_sessions: {
        Row: {
          created_at: string
          cta_button_link: string | null
          cta_button_text: string | null
          cta_description: string | null
          cta_title: string | null
          description: string | null
          ended_at: string | null
          fake_viewers_max: number
          fake_viewers_min: number
          hls_url: string | null
          id: string
          status: string
          title: string
          updated_at: string
          video_url: string | null
          whatsapp_group_link: string | null
        }
        Insert: {
          created_at?: string
          cta_button_link?: string | null
          cta_button_text?: string | null
          cta_description?: string | null
          cta_title?: string | null
          description?: string | null
          ended_at?: string | null
          fake_viewers_max?: number
          fake_viewers_min?: number
          hls_url?: string | null
          id?: string
          status?: string
          title?: string
          updated_at?: string
          video_url?: string | null
          whatsapp_group_link?: string | null
        }
        Update: {
          created_at?: string
          cta_button_link?: string | null
          cta_button_text?: string | null
          cta_description?: string | null
          cta_title?: string | null
          description?: string | null
          ended_at?: string | null
          fake_viewers_max?: number
          fake_viewers_min?: number
          hls_url?: string | null
          id?: string
          status?: string
          title?: string
          updated_at?: string
          video_url?: string | null
          whatsapp_group_link?: string | null
        }
        Relationships: []
      }
      live_settings: {
        Row: {
          admin_email: string
          admin_password: string
          created_at: string
          default_whatsapp_group: string | null
          id: string
          updated_at: string
        }
        Insert: {
          admin_email?: string
          admin_password?: string
          created_at?: string
          default_whatsapp_group?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          admin_email?: string
          admin_password?: string
          created_at?: string
          default_whatsapp_group?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      livve_analytics: {
        Row: {
          created_at: string
          device_type: string | null
          id: string
          session_id: string
          updated_at: string
          user_agent: string | null
          visitor_id: string
          watch_percentage: number
        }
        Insert: {
          created_at?: string
          device_type?: string | null
          id?: string
          session_id: string
          updated_at?: string
          user_agent?: string | null
          visitor_id: string
          watch_percentage?: number
        }
        Update: {
          created_at?: string
          device_type?: string | null
          id?: string
          session_id?: string
          updated_at?: string
          user_agent?: string | null
          visitor_id?: string
          watch_percentage?: number
        }
        Relationships: [
          {
            foreignKeyName: "livve_analytics_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "livve_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      livve_sessions: {
        Row: {
          created_at: string
          cta_button_link: string | null
          cta_button_text: string | null
          cta_description: string | null
          cta_title: string | null
          description: string | null
          ended_at: string | null
          fake_viewers_max: number
          fake_viewers_min: number
          hls_url: string | null
          id: string
          status: string
          title: string
          updated_at: string
          video_url: string | null
          whatsapp_group_link: string | null
        }
        Insert: {
          created_at?: string
          cta_button_link?: string | null
          cta_button_text?: string | null
          cta_description?: string | null
          cta_title?: string | null
          description?: string | null
          ended_at?: string | null
          fake_viewers_max?: number
          fake_viewers_min?: number
          hls_url?: string | null
          id?: string
          status?: string
          title?: string
          updated_at?: string
          video_url?: string | null
          whatsapp_group_link?: string | null
        }
        Update: {
          created_at?: string
          cta_button_link?: string | null
          cta_button_text?: string | null
          cta_description?: string | null
          cta_title?: string | null
          description?: string | null
          ended_at?: string | null
          fake_viewers_max?: number
          fake_viewers_min?: number
          hls_url?: string | null
          id?: string
          status?: string
          title?: string
          updated_at?: string
          video_url?: string | null
          whatsapp_group_link?: string | null
        }
        Relationships: []
      }
      livve_settings: {
        Row: {
          admin_email: string
          admin_password: string
          created_at: string
          default_whatsapp_group: string | null
          id: string
          updated_at: string
        }
        Insert: {
          admin_email?: string
          admin_password?: string
          created_at?: string
          default_whatsapp_group?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          admin_email?: string
          admin_password?: string
          created_at?: string
          default_whatsapp_group?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      localvpp_email_logs: {
        Row: {
          created_at: string
          email_to: string
          email_type: string
          error_message: string | null
          id: string
          status: string
          subject: string | null
        }
        Insert: {
          created_at?: string
          email_to: string
          email_type: string
          error_message?: string | null
          id?: string
          status: string
          subject?: string | null
        }
        Update: {
          created_at?: string
          email_to?: string
          email_type?: string
          error_message?: string | null
          id?: string
          status?: string
          subject?: string | null
        }
        Relationships: []
      }
      localvpp_leads: {
        Row: {
          business_type: string
          created_at: string
          device_type: string
          email: string | null
          empresa: string | null
          id: string
          instagram: string | null
          nome_completo: string
          objetivo: string | null
          referrer: string | null
          updated_at: string
          user_agent: string | null
          whatsapp: string
        }
        Insert: {
          business_type: string
          created_at?: string
          device_type: string
          email?: string | null
          empresa?: string | null
          id?: string
          instagram?: string | null
          nome_completo: string
          objetivo?: string | null
          referrer?: string | null
          updated_at?: string
          user_agent?: string | null
          whatsapp: string
        }
        Update: {
          business_type?: string
          created_at?: string
          device_type?: string
          email?: string | null
          empresa?: string | null
          id?: string
          instagram?: string | null
          nome_completo?: string
          objetivo?: string | null
          referrer?: string | null
          updated_at?: string
          user_agent?: string | null
          whatsapp?: string
        }
        Relationships: []
      }
      localvpp_orders: {
        Row: {
          amount: number
          created_at: string
          email: string
          email_sent: boolean | null
          email_sent_at: string | null
          expired_at: string | null
          fbc: string | null
          fbp: string | null
          id: string
          infinitepay_link: string | null
          nome_completo: string
          nsu_order: string
          paid_at: string | null
          pixel_sent: boolean | null
          pixel_sent_at: string | null
          status: string
          updated_at: string
          user_agent: string | null
          whatsapp: string
        }
        Insert: {
          amount?: number
          created_at?: string
          email: string
          email_sent?: boolean | null
          email_sent_at?: string | null
          expired_at?: string | null
          fbc?: string | null
          fbp?: string | null
          id?: string
          infinitepay_link?: string | null
          nome_completo: string
          nsu_order: string
          paid_at?: string | null
          pixel_sent?: boolean | null
          pixel_sent_at?: string | null
          status?: string
          updated_at?: string
          user_agent?: string | null
          whatsapp: string
        }
        Update: {
          amount?: number
          created_at?: string
          email?: string
          email_sent?: boolean | null
          email_sent_at?: string | null
          expired_at?: string | null
          fbc?: string | null
          fbp?: string | null
          id?: string
          infinitepay_link?: string | null
          nome_completo?: string
          nsu_order?: string
          paid_at?: string | null
          pixel_sent?: boolean | null
          pixel_sent_at?: string | null
          status?: string
          updated_at?: string
          user_agent?: string | null
          whatsapp?: string
        }
        Relationships: []
      }
      localvpp_settings: {
        Row: {
          aula_data: string
          aula_titulo: string
          created_at: string
          hero_video_hls_url: string
          hero_video_url: string
          id: string
          preco: number
          updated_at: string
          whatsapp_group_link: string
        }
        Insert: {
          aula_data?: string
          aula_titulo?: string
          created_at?: string
          hero_video_hls_url?: string
          hero_video_url?: string
          id?: string
          preco?: number
          updated_at?: string
          whatsapp_group_link?: string
        }
        Update: {
          aula_data?: string
          aula_titulo?: string
          created_at?: string
          hero_video_hls_url?: string
          hero_video_url?: string
          id?: string
          preco?: number
          updated_at?: string
          whatsapp_group_link?: string
        }
        Relationships: []
      }
      localvpp_visits: {
        Row: {
          created_at: string
          id: string
          referrer: string | null
          session_id: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      lotargrupos_lessons: {
        Row: {
          buttons: Json | null
          created_at: string | null
          description: string | null
          id: string
          order_index: number
          status: string
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          buttons?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          order_index?: number
          status?: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          buttons?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          order_index?: number
          status?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      lotargrupos_users: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string | null
          hwid: string | null
          id: string
          last_login: string | null
          name: string
          status: Database["public"]["Enums"]["access_status"]
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at?: string | null
          hwid?: string | null
          id?: string
          last_login?: string | null
          name: string
          status?: Database["public"]["Enums"]["access_status"]
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string | null
          hwid?: string | null
          id?: string
          last_login?: string | null
          name?: string
          status?: Database["public"]["Enums"]["access_status"]
          user_id?: string | null
        }
        Relationships: []
      }
      lovablack_orders: {
        Row: {
          amount: number
          created_at: string
          email: string
          expired_at: string | null
          id: string
          infinitepay_link: string | null
          name: string
          nsu_order: string
          paid_at: string | null
          password: string
          plan_type: string
          status: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          email: string
          expired_at?: string | null
          id?: string
          infinitepay_link?: string | null
          name: string
          nsu_order: string
          paid_at?: string | null
          password: string
          plan_type?: string
          status?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          email?: string
          expired_at?: string | null
          id?: string
          infinitepay_link?: string | null
          name?: string
          nsu_order?: string
          paid_at?: string | null
          password?: string
          plan_type?: string
          status?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      lovablack_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string | null
          value: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: string | null
        }
        Relationships: []
      }
      lovablack_users: {
        Row: {
          blocked: boolean | null
          created_at: string | null
          custom_message: string | null
          email: string
          id: string
          last_access: string | null
          name: string
          password: string
          plan_type: Database["public"]["Enums"]["lovablack_plan_type"]
          session_id: string | null
          trial_expires_at: string | null
          updated_at: string | null
          whatsapp: string | null
        }
        Insert: {
          blocked?: boolean | null
          created_at?: string | null
          custom_message?: string | null
          email: string
          id?: string
          last_access?: string | null
          name: string
          password: string
          plan_type?: Database["public"]["Enums"]["lovablack_plan_type"]
          session_id?: string | null
          trial_expires_at?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          blocked?: boolean | null
          created_at?: string | null
          custom_message?: string | null
          email?: string
          id?: string
          last_access?: string | null
          name?: string
          password?: string
          plan_type?: Database["public"]["Enums"]["lovablack_plan_type"]
          session_id?: string | null
          trial_expires_at?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      lovable_extension_users: {
        Row: {
          created_at: string
          credits: number
          current_session_id: string | null
          email: string
          expires_at: string | null
          id: string
          is_banned: boolean
          last_validated_at: string | null
          license_key: string
          notes: string | null
          plan_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credits?: number
          current_session_id?: string | null
          email: string
          expires_at?: string | null
          id?: string
          is_banned?: boolean
          last_validated_at?: string | null
          license_key: string
          notes?: string | null
          plan_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credits?: number
          current_session_id?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          is_banned?: boolean
          last_validated_at?: string | null
          license_key?: string
          notes?: string | null
          plan_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      metodo_seguidor_admins: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string | null
          password: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name?: string | null
          password: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          password?: string
        }
        Relationships: []
      }
      metodo_seguidor_banners: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string
          is_active: boolean | null
          link_text: string | null
          link_url: string | null
          order_index: number | null
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url: string
          is_active?: boolean | null
          link_text?: string | null
          link_url?: string | null
          order_index?: number | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          link_text?: string | null
          link_url?: string | null
          order_index?: number | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      metodo_seguidor_modules: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          order_index: number | null
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          order_index?: number | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          order_index?: number | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      metodo_seguidor_orders: {
        Row: {
          amount: number
          created_at: string
          email: string
          expired_at: string | null
          id: string
          infinitepay_link: string | null
          instagram_username: string | null
          nsu_order: string
          paid_at: string | null
          phone: string | null
          status: string | null
          updated_at: string
          user_id: string | null
          verified_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          email: string
          expired_at?: string | null
          id?: string
          infinitepay_link?: string | null
          instagram_username?: string | null
          nsu_order: string
          paid_at?: string | null
          phone?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
          verified_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          email?: string
          expired_at?: string | null
          id?: string
          infinitepay_link?: string | null
          instagram_username?: string | null
          nsu_order?: string
          paid_at?: string | null
          phone?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "metodo_seguidor_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "metodo_seguidor_users"
            referencedColumns: ["id"]
          },
        ]
      }
      metodo_seguidor_upsells: {
        Row: {
          button_text: string | null
          button_url: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          module_id: string | null
          order_index: number | null
          original_price: string | null
          price: string | null
          show_after_days: number | null
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          button_text?: string | null
          button_url: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          module_id?: string | null
          order_index?: number | null
          original_price?: string | null
          price?: string | null
          show_after_days?: number | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          button_text?: string | null
          button_url?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          module_id?: string | null
          order_index?: number | null
          original_price?: string | null
          price?: string | null
          show_after_days?: number | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "metodo_seguidor_upsells_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "metodo_seguidor_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      metodo_seguidor_users: {
        Row: {
          created_at: string
          email: string
          email_sent: boolean | null
          email_sent_at: string | null
          id: string
          instagram_username: string | null
          last_access: string | null
          password: string
          payment_id: string | null
          phone: string | null
          subscription_end: string | null
          subscription_start: string | null
          subscription_status: string | null
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          email: string
          email_sent?: boolean | null
          email_sent_at?: string | null
          id?: string
          instagram_username?: string | null
          last_access?: string | null
          password: string
          payment_id?: string | null
          phone?: string | null
          subscription_end?: string | null
          subscription_start?: string | null
          subscription_status?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          email?: string
          email_sent?: boolean | null
          email_sent_at?: string | null
          id?: string
          instagram_username?: string | null
          last_access?: string | null
          password?: string
          payment_id?: string | null
          phone?: string | null
          subscription_end?: string | null
          subscription_start?: string | null
          subscription_status?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      metodo_seguidor_videos: {
        Row: {
          created_at: string
          description: string | null
          duration: string | null
          id: string
          is_active: boolean | null
          module_id: string | null
          order_index: number | null
          show_number: boolean | null
          show_play_button: boolean | null
          show_title: boolean | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_type: string | null
          video_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration?: string | null
          id?: string
          is_active?: boolean | null
          module_id?: string | null
          order_index?: number | null
          show_number?: boolean | null
          show_play_button?: boolean | null
          show_title?: boolean | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_type?: string | null
          video_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          duration?: string | null
          id?: string
          is_active?: boolean | null
          module_id?: string | null
          order_index?: number | null
          show_number?: boolean | null
          show_play_button?: boolean | null
          show_title?: boolean | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_type?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "metodo_seguidor_videos_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "metodo_seguidor_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      mktcc_automation_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          post_id: string | null
          project_id: string | null
          status: string
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          post_id?: string | null
          project_id?: string | null
          status: string
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          post_id?: string | null
          project_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "mktcc_automation_logs_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "mktcc_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mktcc_automation_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "mktcc_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      mktcc_cycles: {
        Row: {
          auto_publish_on_approval: boolean | null
          completed_at: string | null
          created_at: string
          id: string
          next_steps_text: string
          note: string
          order_index: number
          project_id: string
          publish_interval_days: number | null
          scheduled_date: string | null
          show_before: boolean
          show_strategy: boolean
          show_summary: boolean
          status: string
          strategy_text: string
          strategy_title: string
          summary_text: string
          title: string
          updated_at: string
        }
        Insert: {
          auto_publish_on_approval?: boolean | null
          completed_at?: string | null
          created_at?: string
          id?: string
          next_steps_text?: string
          note?: string
          order_index?: number
          project_id: string
          publish_interval_days?: number | null
          scheduled_date?: string | null
          show_before?: boolean
          show_strategy?: boolean
          show_summary?: boolean
          status?: string
          strategy_text?: string
          strategy_title?: string
          summary_text?: string
          title?: string
          updated_at?: string
        }
        Update: {
          auto_publish_on_approval?: boolean | null
          completed_at?: string | null
          created_at?: string
          id?: string
          next_steps_text?: string
          note?: string
          order_index?: number
          project_id?: string
          publish_interval_days?: number | null
          scheduled_date?: string | null
          show_before?: boolean
          show_strategy?: boolean
          show_summary?: boolean
          status?: string
          strategy_text?: string
          strategy_title?: string
          summary_text?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mktcc_cycles_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "mktcc_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      mktcc_fb_configs: {
        Row: {
          app_id: string
          app_secret: string
          client_token: string | null
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          app_id: string
          app_secret: string
          client_token?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          app_id?: string
          app_secret?: string
          client_token?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      mktcc_posts: {
        Row: {
          aspect_ratio: string
          caption: string
          client_note: string
          created_at: string
          cycle_id: string | null
          id: string
          is_published: boolean
          media_urls: Json
          order_index: number
          post_type: string
          poster_url: string
          previous_caption: string
          previous_media_urls: Json
          project_id: string
          publish_error: string | null
          publish_status: string | null
          published_at: string | null
          reviewed_at: string | null
          revised_at: string | null
          revision_count: number
          revision_note: string
          scheduled_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          aspect_ratio?: string
          caption?: string
          client_note?: string
          created_at?: string
          cycle_id?: string | null
          id?: string
          is_published?: boolean
          media_urls?: Json
          order_index?: number
          post_type?: string
          poster_url?: string
          previous_caption?: string
          previous_media_urls?: Json
          project_id: string
          publish_error?: string | null
          publish_status?: string | null
          published_at?: string | null
          reviewed_at?: string | null
          revised_at?: string | null
          revision_count?: number
          revision_note?: string
          scheduled_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          aspect_ratio?: string
          caption?: string
          client_note?: string
          created_at?: string
          cycle_id?: string | null
          id?: string
          is_published?: boolean
          media_urls?: Json
          order_index?: number
          post_type?: string
          poster_url?: string
          previous_caption?: string
          previous_media_urls?: Json
          project_id?: string
          publish_error?: string | null
          publish_status?: string | null
          published_at?: string | null
          reviewed_at?: string | null
          revised_at?: string | null
          revision_count?: number
          revision_note?: string
          scheduled_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mktcc_posts_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "mktcc_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mktcc_posts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "mktcc_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      mktcc_project_connections: {
        Row: {
          connected_as_name: string | null
          created_at: string | null
          fb_page_access_token: string | null
          fb_page_id: string | null
          id: string
          ig_business_id: string | null
          project_id: string
          updated_at: string | null
          user_access_token: string | null
        }
        Insert: {
          connected_as_name?: string | null
          created_at?: string | null
          fb_page_access_token?: string | null
          fb_page_id?: string | null
          id?: string
          ig_business_id?: string | null
          project_id: string
          updated_at?: string | null
          user_access_token?: string | null
        }
        Update: {
          connected_as_name?: string | null
          created_at?: string | null
          fb_page_access_token?: string | null
          fb_page_id?: string | null
          id?: string
          ig_business_id?: string | null
          project_id?: string
          updated_at?: string | null
          user_access_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mktcc_project_connections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "mktcc_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      mktcc_projects: {
        Row: {
          access_code: string
          all_approved_at: string | null
          avatar_url: string
          before_facebook_urls: string[]
          before_instagram_urls: string[]
          before_note: string
          before_profile_full_url: string
          company_name: string
          created_at: string
          drive_url: string | null
          id: string
          instagram_bio: string
          instagram_handle: string
          is_active: boolean
          logo_after_url: string
          logo_before_url: string
          logo_client_note: string
          logo_enabled: boolean
          logo_reason: string
          logo_reviewed_at: string | null
          logo_status: string
          next_step_released: boolean
          next_steps_text: string
          strategy_text: string
          strategy_title: string
          summary_text: string
          updated_at: string
        }
        Insert: {
          access_code: string
          all_approved_at?: string | null
          avatar_url?: string
          before_facebook_urls?: string[]
          before_instagram_urls?: string[]
          before_note?: string
          before_profile_full_url?: string
          company_name: string
          created_at?: string
          drive_url?: string | null
          id?: string
          instagram_bio?: string
          instagram_handle?: string
          is_active?: boolean
          logo_after_url?: string
          logo_before_url?: string
          logo_client_note?: string
          logo_enabled?: boolean
          logo_reason?: string
          logo_reviewed_at?: string | null
          logo_status?: string
          next_step_released?: boolean
          next_steps_text?: string
          strategy_text?: string
          strategy_title?: string
          summary_text?: string
          updated_at?: string
        }
        Update: {
          access_code?: string
          all_approved_at?: string | null
          avatar_url?: string
          before_facebook_urls?: string[]
          before_instagram_urls?: string[]
          before_note?: string
          before_profile_full_url?: string
          company_name?: string
          created_at?: string
          drive_url?: string | null
          id?: string
          instagram_bio?: string
          instagram_handle?: string
          is_active?: boolean
          logo_after_url?: string
          logo_before_url?: string
          logo_client_note?: string
          logo_enabled?: boolean
          logo_reason?: string
          logo_reviewed_at?: string | null
          logo_status?: string
          next_step_released?: boolean
          next_steps_text?: string
          strategy_text?: string
          strategy_title?: string
          summary_text?: string
          updated_at?: string
        }
        Relationships: []
      }
      mro_direct_ai_pauses: {
        Row: {
          created_at: string
          id: string
          is_paused: boolean
          paused_at: string | null
          sender_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_paused?: boolean
          paused_at?: string | null
          sender_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_paused?: boolean
          paused_at?: string | null
          sender_id?: string
        }
        Relationships: []
      }
      mro_direct_automations: {
        Row: {
          ai_prompt: string | null
          automation_type: string
          comment_reply_text: string | null
          created_at: string
          delay_seconds: number | null
          id: string
          is_active: boolean | null
          reply_message: string
          response_mode: string
          target_post_id: string | null
          trigger_keywords: string[] | null
          updated_at: string
        }
        Insert: {
          ai_prompt?: string | null
          automation_type: string
          comment_reply_text?: string | null
          created_at?: string
          delay_seconds?: number | null
          id?: string
          is_active?: boolean | null
          reply_message: string
          response_mode?: string
          target_post_id?: string | null
          trigger_keywords?: string[] | null
          updated_at?: string
        }
        Update: {
          ai_prompt?: string | null
          automation_type?: string
          comment_reply_text?: string | null
          created_at?: string
          delay_seconds?: number | null
          id?: string
          is_active?: boolean | null
          reply_message?: string
          response_mode?: string
          target_post_id?: string | null
          trigger_keywords?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      mro_direct_known_followers: {
        Row: {
          created_at: string
          follower_id: string
          follower_username: string | null
          id: string
          instagram_account_id: string
          welcomed: boolean | null
        }
        Insert: {
          created_at?: string
          follower_id: string
          follower_username?: string | null
          id?: string
          instagram_account_id: string
          welcomed?: boolean | null
        }
        Update: {
          created_at?: string
          follower_id?: string
          follower_username?: string | null
          id?: string
          instagram_account_id?: string
          welcomed?: boolean | null
        }
        Relationships: []
      }
      mro_direct_logs: {
        Row: {
          automation_id: string | null
          created_at: string
          direction: string
          error_message: string | null
          event_type: string
          id: string
          incoming_text: string | null
          message_sent: string | null
          sender_id: string | null
          sender_username: string | null
          status: string | null
          trigger_content: string | null
        }
        Insert: {
          automation_id?: string | null
          created_at?: string
          direction?: string
          error_message?: string | null
          event_type: string
          id?: string
          incoming_text?: string | null
          message_sent?: string | null
          sender_id?: string | null
          sender_username?: string | null
          status?: string | null
          trigger_content?: string | null
        }
        Update: {
          automation_id?: string | null
          created_at?: string
          direction?: string
          error_message?: string | null
          event_type?: string
          id?: string
          incoming_text?: string | null
          message_sent?: string | null
          sender_id?: string | null
          sender_username?: string | null
          status?: string | null
          trigger_content?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mro_direct_logs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "mro_direct_automations"
            referencedColumns: ["id"]
          },
        ]
      }
      mro_direct_settings: {
        Row: {
          created_at: string
          follower_check_threshold: number | null
          follower_count_baseline: number | null
          follower_polling_active: boolean | null
          id: string
          instagram_account_id: string | null
          instagram_user_id: string | null
          instagram_username: string | null
          is_active: boolean | null
          last_follower_check: string | null
          page_access_token: string | null
          updated_at: string
          webhook_verify_token: string | null
        }
        Insert: {
          created_at?: string
          follower_check_threshold?: number | null
          follower_count_baseline?: number | null
          follower_polling_active?: boolean | null
          id?: string
          instagram_account_id?: string | null
          instagram_user_id?: string | null
          instagram_username?: string | null
          is_active?: boolean | null
          last_follower_check?: string | null
          page_access_token?: string | null
          updated_at?: string
          webhook_verify_token?: string | null
        }
        Update: {
          created_at?: string
          follower_check_threshold?: number | null
          follower_count_baseline?: number | null
          follower_polling_active?: boolean | null
          id?: string
          instagram_account_id?: string | null
          instagram_user_id?: string | null
          instagram_username?: string | null
          is_active?: boolean | null
          last_follower_check?: string | null
          page_access_token?: string | null
          updated_at?: string
          webhook_verify_token?: string | null
        }
        Relationships: []
      }
      mro_euro_orders: {
        Row: {
          amount: number
          api_created: boolean | null
          completed_at: string | null
          created_at: string
          email: string
          email_sent: boolean | null
          id: string
          paid_at: string | null
          phone: string | null
          plan_type: string
          status: string
          stripe_payment_intent: string | null
          stripe_session_id: string | null
          updated_at: string
          username: string
        }
        Insert: {
          amount?: number
          api_created?: boolean | null
          completed_at?: string | null
          created_at?: string
          email: string
          email_sent?: boolean | null
          id?: string
          paid_at?: string | null
          phone?: string | null
          plan_type?: string
          status?: string
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          amount?: number
          api_created?: boolean | null
          completed_at?: string | null
          created_at?: string
          email?: string
          email_sent?: boolean | null
          id?: string
          paid_at?: string | null
          phone?: string | null
          plan_type?: string
          status?: string
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      mro_images: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          prompt: string | null
          url: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          prompt?: string | null
          url: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          prompt?: string | null
          url?: string
          user_id?: string | null
        }
        Relationships: []
      }
      mro_orders: {
        Row: {
          amount: number
          api_created: boolean | null
          completed_at: string | null
          created_at: string
          email: string
          email_sent: boolean | null
          expired_at: string | null
          id: string
          infinitepay_link: string | null
          invoice_slug: string | null
          nsu_order: string
          paid_at: string | null
          partner_id: string | null
          payment_method: string | null
          phone: string | null
          plan_type: string
          source: string | null
          status: string
          transaction_nsu: string | null
          updated_at: string
          username: string
          whatsapp_sent: boolean | null
        }
        Insert: {
          amount: number
          api_created?: boolean | null
          completed_at?: string | null
          created_at?: string
          email: string
          email_sent?: boolean | null
          expired_at?: string | null
          id?: string
          infinitepay_link?: string | null
          invoice_slug?: string | null
          nsu_order: string
          paid_at?: string | null
          partner_id?: string | null
          payment_method?: string | null
          phone?: string | null
          plan_type?: string
          source?: string | null
          status?: string
          transaction_nsu?: string | null
          updated_at?: string
          username: string
          whatsapp_sent?: boolean | null
        }
        Update: {
          amount?: number
          api_created?: boolean | null
          completed_at?: string | null
          created_at?: string
          email?: string
          email_sent?: boolean | null
          expired_at?: string | null
          id?: string
          infinitepay_link?: string | null
          invoice_slug?: string | null
          nsu_order?: string
          paid_at?: string | null
          partner_id?: string | null
          payment_method?: string | null
          phone?: string | null
          plan_type?: string
          source?: string | null
          status?: string
          transaction_nsu?: string | null
          updated_at?: string
          username?: string
          whatsapp_sent?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "mro_orders_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      mro_profiles: {
        Row: {
          created_at: string | null
          id: string
          instagram_id: string | null
          instagram_username: string | null
          meta_access_token: string | null
          settings: Json | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          instagram_id?: string | null
          instagram_username?: string | null
          meta_access_token?: string | null
          settings?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          instagram_id?: string | null
          instagram_username?: string | null
          meta_access_token?: string | null
          settings?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      mro_schedules: {
        Row: {
          content_text: string | null
          created_at: string | null
          id: string
          image_id: string | null
          metadata: Json | null
          scheduled_for: string
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          content_text?: string | null
          created_at?: string | null
          id?: string
          image_id?: string | null
          metadata?: Json | null
          scheduled_for: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          content_text?: string | null
          created_at?: string | null
          id?: string
          image_id?: string | null
          metadata?: Json | null
          scheduled_for?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mro_schedules_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "mro_images"
            referencedColumns: ["id"]
          },
        ]
      }
      mro_settings: {
        Row: {
          created_at: string | null
          id: string
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          created_at?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          created_at?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      mro_strategies: {
        Row: {
          content: string
          created_at: string | null
          id: string
          title: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          title: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          title?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      mro_tool_accounts: {
        Row: {
          created_at: string
          id: string
          instagram_username: string
          is_trial: boolean
          trial_expires_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          instagram_username: string
          is_trial?: boolean
          trial_expires_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          instagram_username?: string
          is_trial?: boolean
          trial_expires_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mro_tool_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mro_tool_users"
            referencedColumns: ["id"]
          },
        ]
      }
      mro_tool_logs: {
        Row: {
          action_type: string
          created_at: string | null
          details: Json | null
          id: string
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string | null
          details?: Json | null
          id?: string
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mro_tool_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mro_tool_users"
            referencedColumns: ["id"]
          },
        ]
      }
      mro_tool_users: {
        Row: {
          created_at: string
          email: string | null
          expiration_days: number
          expired_email_sent_at: string | null
          expires_at: string | null
          extra_accounts: number
          id: string
          is_active: boolean
          last_access: string | null
          name: string | null
          password_hash: string | null
          password_plain: string | null
          plan_accounts: number
          source: string | null
          trials_period_start: string
          trials_used: number
          updated_at: string
          username: string
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          expiration_days?: number
          expired_email_sent_at?: string | null
          expires_at?: string | null
          extra_accounts?: number
          id?: string
          is_active?: boolean
          last_access?: string | null
          name?: string | null
          password_hash?: string | null
          password_plain?: string | null
          plan_accounts?: number
          source?: string | null
          trials_period_start?: string
          trials_used?: number
          updated_at?: string
          username: string
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          expiration_days?: number
          expired_email_sent_at?: string | null
          expires_at?: string | null
          extra_accounts?: number
          id?: string
          is_active?: boolean
          last_access?: string | null
          name?: string | null
          password_hash?: string | null
          password_plain?: string | null
          plan_accounts?: number
          source?: string | null
          trials_period_start?: string
          trials_used?: number
          updated_at?: string
          username?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      paid_users: {
        Row: {
          created_at: string
          creatives_used: number | null
          email: string
          id: string
          instagram_username: string | null
          password: string | null
          strategies_generated: number | null
          stripe_customer_id: string | null
          subscription_end: string | null
          subscription_id: string | null
          subscription_status: string | null
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          creatives_used?: number | null
          email: string
          id?: string
          instagram_username?: string | null
          password?: string | null
          strategies_generated?: number | null
          stripe_customer_id?: string | null
          subscription_end?: string | null
          subscription_id?: string | null
          subscription_status?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          creatives_used?: number | null
          email?: string
          id?: string
          instagram_username?: string | null
          password?: string | null
          strategies_generated?: number | null
          stripe_customer_id?: string | null
          subscription_end?: string | null
          subscription_id?: string | null
          subscription_status?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      partner_visits: {
        Row: {
          created_at: string
          id: string
          partner_id: string
          referer: string | null
          user_agent: string | null
          visitor_ip: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          partner_id: string
          referer?: string | null
          user_agent?: string | null
          visitor_ip?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          partner_id?: string
          referer?: string | null
          user_agent?: string | null
          visitor_ip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_visits_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          commission_rate: number
          created_at: string
          email: string
          id: string
          last_name: string | null
          name: string
          password: string | null
          photo_url: string | null
          pix_key: string | null
          show_promo_banner: boolean
          slug: string
          source: string
          squarecloud_username: string | null
          status: string
          updated_at: string
          user_id: string | null
          whatsapp: string | null
        }
        Insert: {
          commission_rate?: number
          created_at?: string
          email: string
          id?: string
          last_name?: string | null
          name: string
          password?: string | null
          photo_url?: string | null
          pix_key?: string | null
          show_promo_banner?: boolean
          slug: string
          source?: string
          squarecloud_username?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Update: {
          commission_rate?: number
          created_at?: string
          email?: string
          id?: string
          last_name?: string | null
          name?: string
          password?: string | null
          photo_url?: string | null
          pix_key?: string | null
          show_promo_banner?: boolean
          slug?: string
          source?: string
          squarecloud_username?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      payment_orders: {
        Row: {
          amount: number
          created_at: string
          email: string
          expires_at: string
          id: string
          infinitepay_link: string | null
          nsu_order: string
          paid_at: string | null
          status: string
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          infinitepay_link?: string | null
          nsu_order: string
          paid_at?: string | null
          status?: string
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          infinitepay_link?: string | null
          nsu_order?: string
          paid_at?: string | null
          status?: string
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      postscomia_analytics: {
        Row: {
          created_at: string
          event_type: string
          id: string
          session_id: string | null
          user_agent: string | null
          video_id: string | null
          video_title: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          session_id?: string | null
          user_agent?: string | null
          video_id?: string | null
          video_title?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          session_id?: string | null
          user_agent?: string | null
          video_id?: string | null
          video_title?: string | null
        }
        Relationships: []
      }
      postscomia_modules: {
        Row: {
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          order_index: number
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          order_index?: number
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          order_index?: number
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      postscomia_orders: {
        Row: {
          access_granted: boolean
          amount: number
          created_at: string
          email: string
          expired_at: string | null
          id: string
          infinitepay_link: string | null
          name: string
          nsu_order: string
          orderbump: boolean
          paid_at: string | null
          password: string | null
          status: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          access_granted?: boolean
          amount?: number
          created_at?: string
          email: string
          expired_at?: string | null
          id?: string
          infinitepay_link?: string | null
          name: string
          nsu_order: string
          orderbump?: boolean
          paid_at?: string | null
          password?: string | null
          status?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          access_granted?: boolean
          amount?: number
          created_at?: string
          email?: string
          expired_at?: string | null
          id?: string
          infinitepay_link?: string | null
          name?: string
          nsu_order?: string
          orderbump?: boolean
          paid_at?: string | null
          password?: string | null
          status?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      postscomia_settings: {
        Row: {
          created_at: string
          fb_pixel_id: string | null
          hero_video_poster: string | null
          hero_video_url: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fb_pixel_id?: string | null
          hero_video_poster?: string | null
          hero_video_url?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fb_pixel_id?: string | null
          hero_video_poster?: string | null
          hero_video_url?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      postsprompts_buyers: {
        Row: {
          created_at: string
          email: string
          id: string
          kiwify_event: string | null
          kiwify_order_id: string | null
          last_event_at: string | null
          name: string | null
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          kiwify_event?: string | null
          kiwify_order_id?: string | null
          last_event_at?: string | null
          name?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          kiwify_event?: string | null
          kiwify_order_id?: string | null
          last_event_at?: string | null
          name?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      postsprompts_settings: {
        Row: {
          id: string
          openai_api_key: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          openai_api_key?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          openai_api_key?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      promo33_users: {
        Row: {
          created_at: string
          email: string
          id: string
          instagram_data: Json | null
          instagram_username: string | null
          name: string | null
          password: string
          payment_id: string | null
          phone: string | null
          strategies_generated: Json | null
          subscription_end: string | null
          subscription_start: string | null
          subscription_status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          instagram_data?: Json | null
          instagram_username?: string | null
          name?: string | null
          password: string
          payment_id?: string | null
          phone?: string | null
          strategies_generated?: Json | null
          subscription_end?: string | null
          subscription_start?: string | null
          subscription_status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          instagram_data?: Json | null
          instagram_username?: string | null
          name?: string | null
          password?: string
          payment_id?: string | null
          phone?: string | null
          strategies_generated?: Json | null
          subscription_end?: string | null
          subscription_start?: string | null
          subscription_status?: string
          updated_at?: string
        }
        Relationships: []
      }
      prompts_mro_items: {
        Row: {
          category: string | null
          created_at: string
          folder_name: string
          id: string
          image_url: string | null
          is_active: boolean | null
          order_index: number | null
          prompt_text: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          folder_name: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          order_index?: number | null
          prompt_text: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          folder_name?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          order_index?: number | null
          prompt_text?: string
          updated_at?: string
        }
        Relationships: []
      }
      prompts_mro_orders: {
        Row: {
          access_created: boolean | null
          amount: number
          completed_at: string | null
          created_at: string
          email: string
          email_sent: boolean | null
          expired_at: string | null
          id: string
          infinitepay_link: string | null
          invoice_slug: string | null
          name: string | null
          nsu_order: string
          paid_at: string | null
          phone: string | null
          plan_type: string
          status: string
          transaction_nsu: string | null
          updated_at: string
        }
        Insert: {
          access_created?: boolean | null
          amount?: number
          completed_at?: string | null
          created_at?: string
          email: string
          email_sent?: boolean | null
          expired_at?: string | null
          id?: string
          infinitepay_link?: string | null
          invoice_slug?: string | null
          name?: string | null
          nsu_order: string
          paid_at?: string | null
          phone?: string | null
          plan_type?: string
          status?: string
          transaction_nsu?: string | null
          updated_at?: string
        }
        Update: {
          access_created?: boolean | null
          amount?: number
          completed_at?: string | null
          created_at?: string
          email?: string
          email_sent?: boolean | null
          expired_at?: string | null
          id?: string
          infinitepay_link?: string | null
          invoice_slug?: string | null
          name?: string | null
          nsu_order?: string
          paid_at?: string | null
          phone?: string | null
          plan_type?: string
          status?: string
          transaction_nsu?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      prompts_mro_payment_orders: {
        Row: {
          amount: number
          created_at: string
          email: string
          expired_at: string | null
          id: string
          infinitepay_link: string | null
          nsu_order: string
          paid_at: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          email: string
          expired_at?: string | null
          id?: string
          infinitepay_link?: string | null
          nsu_order: string
          paid_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          email?: string
          expired_at?: string | null
          id?: string
          infinitepay_link?: string | null
          nsu_order?: string
          paid_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prompts_mro_payment_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "prompts_mro_users"
            referencedColumns: ["id"]
          },
        ]
      }
      prompts_mro_settings: {
        Row: {
          admin_email: string
          admin_password: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          admin_email?: string
          admin_password?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          admin_email?: string
          admin_password?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      prompts_mro_users: {
        Row: {
          copies_count: number
          copies_limit: number
          created_at: string
          email: string
          id: string
          is_paid: boolean
          last_access: string | null
          name: string
          paid_at: string | null
          password: string
          payment_nsu: string | null
          phone: string | null
          status: string
          subscription_end: string | null
          updated_at: string
        }
        Insert: {
          copies_count?: number
          copies_limit?: number
          created_at?: string
          email: string
          id?: string
          is_paid?: boolean
          last_access?: string | null
          name: string
          paid_at?: string | null
          password: string
          payment_nsu?: string | null
          phone?: string | null
          status?: string
          subscription_end?: string | null
          updated_at?: string
        }
        Update: {
          copies_count?: number
          copies_limit?: number
          created_at?: string
          email?: string
          id?: string
          is_paid?: boolean
          last_access?: string | null
          name?: string
          paid_at?: string | null
          password?: string
          payment_nsu?: string | null
          phone?: string | null
          status?: string
          subscription_end?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      promptsin_orders: {
        Row: {
          access_created: boolean | null
          amount: number
          completed_at: string | null
          created_at: string
          email: string
          email_sent: boolean | null
          id: string
          name: string | null
          paid_at: string | null
          phone: string | null
          plan_type: string
          status: string
          stripe_payment_intent: string | null
          stripe_session_id: string | null
          updated_at: string
        }
        Insert: {
          access_created?: boolean | null
          amount?: number
          completed_at?: string | null
          created_at?: string
          email: string
          email_sent?: boolean | null
          id?: string
          name?: string | null
          paid_at?: string | null
          phone?: string | null
          plan_type?: string
          status?: string
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          updated_at?: string
        }
        Update: {
          access_created?: boolean | null
          amount?: number
          completed_at?: string | null
          created_at?: string
          email?: string
          email_sent?: boolean | null
          id?: string
          name?: string | null
          paid_at?: string | null
          phone?: string | null
          plan_type?: string
          status?: string
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      promptsin_settings: {
        Row: {
          admin_email: string
          admin_password: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          admin_email?: string
          admin_password?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          admin_email?: string
          admin_password?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      promptsin_users: {
        Row: {
          copies_count: number
          copies_limit: number
          created_at: string
          email: string
          id: string
          is_paid: boolean
          last_access: string | null
          name: string
          paid_at: string | null
          password: string
          phone: string | null
          plan_type: string | null
          status: string
          stripe_customer_id: string | null
          stripe_session_id: string | null
          subscription_end: string | null
          updated_at: string
        }
        Insert: {
          copies_count?: number
          copies_limit?: number
          created_at?: string
          email: string
          id?: string
          is_paid?: boolean
          last_access?: string | null
          name: string
          paid_at?: string | null
          password: string
          phone?: string | null
          plan_type?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_session_id?: string | null
          subscription_end?: string | null
          updated_at?: string
        }
        Update: {
          copies_count?: number
          copies_limit?: number
          created_at?: string
          email?: string
          id?: string
          is_paid?: boolean
          last_access?: string | null
          name?: string
          paid_at?: string | null
          password?: string
          phone?: string | null
          plan_type?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_session_id?: string | null
          subscription_end?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      renda_extra_analytics: {
        Row: {
          created_at: string
          device_type: string | null
          event_type: string
          id: string
          referrer: string | null
          source_url: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          device_type?: string | null
          event_type: string
          id?: string
          referrer?: string | null
          source_url?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          device_type?: string | null
          event_type?: string
          id?: string
          referrer?: string | null
          source_url?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      renda_extra_aula_analytics: {
        Row: {
          created_at: string
          device_type: string | null
          event_type: string
          id: string
          referrer: string | null
          source_url: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          device_type?: string | null
          event_type: string
          id?: string
          referrer?: string | null
          source_url?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          device_type?: string | null
          event_type?: string
          id?: string
          referrer?: string | null
          source_url?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      renda_extra_aula_leads: {
        Row: {
          aula_liberada: boolean | null
          created_at: string
          email: string
          email_enviado: boolean | null
          id: string
          nome_completo: string
          whatsapp: string
        }
        Insert: {
          aula_liberada?: boolean | null
          created_at?: string
          email: string
          email_enviado?: boolean | null
          id?: string
          nome_completo: string
          whatsapp: string
        }
        Update: {
          aula_liberada?: boolean | null
          created_at?: string
          email?: string
          email_enviado?: boolean | null
          id?: string
          nome_completo?: string
          whatsapp?: string
        }
        Relationships: []
      }
      renda_extra_aula_settings: {
        Row: {
          admin_email: string
          admin_password: string
          created_at: string
          id: string
          updated_at: string
          youtube_url: string | null
        }
        Insert: {
          admin_email?: string
          admin_password?: string
          created_at?: string
          id?: string
          updated_at?: string
          youtube_url?: string | null
        }
        Update: {
          admin_email?: string
          admin_password?: string
          created_at?: string
          id?: string
          updated_at?: string
          youtube_url?: string | null
        }
        Relationships: []
      }
      renda_extra_email_logs: {
        Row: {
          created_at: string
          email_to: string
          email_type: string
          error_message: string | null
          id: string
          lead_id: string | null
          status: string
          subject: string | null
        }
        Insert: {
          created_at?: string
          email_to: string
          email_type: string
          error_message?: string | null
          id?: string
          lead_id?: string | null
          status?: string
          subject?: string | null
        }
        Update: {
          created_at?: string
          email_to?: string
          email_type?: string
          error_message?: string | null
          id?: string
          lead_id?: string | null
          status?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "renda_extra_email_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "renda_extra_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      renda_extra_lead_analytics: {
        Row: {
          created_at: string
          device_type: string | null
          event_type: string
          id: string
          referrer: string | null
          source_url: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          device_type?: string | null
          event_type: string
          id?: string
          referrer?: string | null
          source_url?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          device_type?: string | null
          event_type?: string
          id?: string
          referrer?: string | null
          source_url?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      renda_extra_lead_email_logs: {
        Row: {
          created_at: string
          email_to: string
          email_type: string
          error_message: string | null
          id: string
          lead_id: string | null
          status: string | null
          subject: string | null
        }
        Insert: {
          created_at?: string
          email_to: string
          email_type: string
          error_message?: string | null
          id?: string
          lead_id?: string | null
          status?: string | null
          subject?: string | null
        }
        Update: {
          created_at?: string
          email_to?: string
          email_type?: string
          error_message?: string | null
          id?: string
          lead_id?: string | null
          status?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "renda_extra_lead_email_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "renda_extra_lead_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      renda_extra_lead_leads: {
        Row: {
          created_at: string
          desconto_email_sent_at: string | null
          desconto_last_access_at: string | null
          desconto_unlocked_at: string | null
          desconto_video_percent: number
          email: string
          email_confirmacao_enviado: boolean | null
          email_confirmacao_enviado_at: string | null
          email_lembrete_enviado: boolean | null
          email_lembrete_enviado_at: string | null
          id: string
          instagram_username: string | null
          lead_source: string
          media_salarial: string
          nome_completo: string
          promo_video_last_watched_at: string | null
          promo_video_percent: number | null
          tipo_computador: string
          trabalha_atualmente: boolean | null
          whatsapp: string
        }
        Insert: {
          created_at?: string
          desconto_email_sent_at?: string | null
          desconto_last_access_at?: string | null
          desconto_unlocked_at?: string | null
          desconto_video_percent?: number
          email: string
          email_confirmacao_enviado?: boolean | null
          email_confirmacao_enviado_at?: string | null
          email_lembrete_enviado?: boolean | null
          email_lembrete_enviado_at?: string | null
          id?: string
          instagram_username?: string | null
          lead_source?: string
          media_salarial: string
          nome_completo: string
          promo_video_last_watched_at?: string | null
          promo_video_percent?: number | null
          tipo_computador: string
          trabalha_atualmente?: boolean | null
          whatsapp: string
        }
        Update: {
          created_at?: string
          desconto_email_sent_at?: string | null
          desconto_last_access_at?: string | null
          desconto_unlocked_at?: string | null
          desconto_video_percent?: number
          email?: string
          email_confirmacao_enviado?: boolean | null
          email_confirmacao_enviado_at?: string | null
          email_lembrete_enviado?: boolean | null
          email_lembrete_enviado_at?: string | null
          id?: string
          instagram_username?: string | null
          lead_source?: string
          media_salarial?: string
          nome_completo?: string
          promo_video_last_watched_at?: string | null
          promo_video_percent?: number | null
          tipo_computador?: string
          trabalha_atualmente?: boolean | null
          whatsapp?: string
        }
        Relationships: []
      }
      renda_extra_lead_settings: {
        Row: {
          admin_email: string | null
          admin_password: string | null
          created_at: string
          id: string
          launch_date: string | null
          launch_date_enabled: boolean | null
          updated_at: string
          whatsapp_group_link: string | null
          whatsapp_message: string | null
          whatsapp_number: string | null
        }
        Insert: {
          admin_email?: string | null
          admin_password?: string | null
          created_at?: string
          id?: string
          launch_date?: string | null
          launch_date_enabled?: boolean | null
          updated_at?: string
          whatsapp_group_link?: string | null
          whatsapp_message?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          admin_email?: string | null
          admin_password?: string | null
          created_at?: string
          id?: string
          launch_date?: string | null
          launch_date_enabled?: boolean | null
          updated_at?: string
          whatsapp_group_link?: string | null
          whatsapp_message?: string | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      renda_extra_leads: {
        Row: {
          created_at: string
          email: string
          email_confirmacao_enviado: boolean | null
          email_confirmacao_enviado_at: string | null
          email_lembrete_enviado: boolean | null
          email_lembrete_enviado_at: string | null
          id: string
          instagram_username: string | null
          media_salarial: string
          nome_completo: string
          tipo_computador: string
          trabalha_atualmente: boolean | null
          whatsapp: string
        }
        Insert: {
          created_at?: string
          email: string
          email_confirmacao_enviado?: boolean | null
          email_confirmacao_enviado_at?: string | null
          email_lembrete_enviado?: boolean | null
          email_lembrete_enviado_at?: string | null
          id?: string
          instagram_username?: string | null
          media_salarial: string
          nome_completo: string
          tipo_computador: string
          trabalha_atualmente?: boolean | null
          whatsapp: string
        }
        Update: {
          created_at?: string
          email?: string
          email_confirmacao_enviado?: boolean | null
          email_confirmacao_enviado_at?: string | null
          email_lembrete_enviado?: boolean | null
          email_lembrete_enviado_at?: string | null
          id?: string
          instagram_username?: string | null
          media_salarial?: string
          nome_completo?: string
          tipo_computador?: string
          trabalha_atualmente?: boolean | null
          whatsapp?: string
        }
        Relationships: []
      }
      renda_extra_materiais: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          id: string
          is_active: boolean | null
          order_index: number | null
          title: string
          updated_at: string
          video_url: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          id?: string
          is_active?: boolean | null
          order_index?: number | null
          title?: string
          updated_at?: string
          video_url: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          id?: string
          is_active?: boolean | null
          order_index?: number | null
          title?: string
          updated_at?: string
          video_url?: string
        }
        Relationships: []
      }
      renda_extra_settings: {
        Row: {
          admin_email: string | null
          admin_password: string | null
          created_at: string
          id: string
          launch_date: string | null
          updated_at: string
          whatsapp_group_link: string | null
        }
        Insert: {
          admin_email?: string | null
          admin_password?: string | null
          created_at?: string
          id?: string
          launch_date?: string | null
          updated_at?: string
          whatsapp_group_link?: string | null
        }
        Update: {
          admin_email?: string | null
          admin_password?: string | null
          created_at?: string
          id?: string
          launch_date?: string | null
          updated_at?: string
          whatsapp_group_link?: string | null
        }
        Relationships: []
      }
      renda_extra_v2_analytics: {
        Row: {
          created_at: string
          event_type: string
          id: string
          source_url: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          source_url?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          source_url?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      renda_extra_v2_email_logs: {
        Row: {
          created_at: string
          email_to: string
          email_type: string
          error_message: string | null
          id: string
          lead_id: string | null
          status: string
          subject: string | null
        }
        Insert: {
          created_at?: string
          email_to: string
          email_type: string
          error_message?: string | null
          id?: string
          lead_id?: string | null
          status?: string
          subject?: string | null
        }
        Update: {
          created_at?: string
          email_to?: string
          email_type?: string
          error_message?: string | null
          id?: string
          lead_id?: string | null
          status?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "renda_extra_v2_email_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "renda_extra_v2_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      renda_extra_v2_leads: {
        Row: {
          created_at: string
          email: string
          email_confirmacao_enviado: boolean | null
          email_confirmacao_enviado_at: string | null
          id: string
          instagram_username: string | null
          media_salarial: string | null
          nome_completo: string
          tipo_computador: string | null
          trabalha_atualmente: string | null
          updated_at: string
          whatsapp: string
        }
        Insert: {
          created_at?: string
          email: string
          email_confirmacao_enviado?: boolean | null
          email_confirmacao_enviado_at?: string | null
          id?: string
          instagram_username?: string | null
          media_salarial?: string | null
          nome_completo: string
          tipo_computador?: string | null
          trabalha_atualmente?: string | null
          updated_at?: string
          whatsapp: string
        }
        Update: {
          created_at?: string
          email?: string
          email_confirmacao_enviado?: boolean | null
          email_confirmacao_enviado_at?: string | null
          id?: string
          instagram_username?: string | null
          media_salarial?: string | null
          nome_completo?: string
          tipo_computador?: string | null
          trabalha_atualmente?: string | null
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
      renda_extra_v2_settings: {
        Row: {
          admin_email: string
          admin_password: string
          created_at: string
          id: string
          launch_date: string | null
          launch_date_enabled: boolean | null
          updated_at: string
          whatsapp_group_link: string | null
        }
        Insert: {
          admin_email?: string
          admin_password?: string
          created_at?: string
          id?: string
          launch_date?: string | null
          launch_date_enabled?: boolean | null
          updated_at?: string
          whatsapp_group_link?: string | null
        }
        Update: {
          admin_email?: string
          admin_password?: string
          created_at?: string
          id?: string
          launch_date?: string | null
          launch_date_enabled?: boolean | null
          updated_at?: string
          whatsapp_group_link?: string | null
        }
        Relationships: []
      }
      renda_extrass_leads: {
        Row: {
          access_liberated: boolean
          created_at: string
          email: string
          has_desktop: boolean
          id: string
          name: string
          offer_email_sent_at: string | null
          offer_expired: boolean
          offer_expires_at: string | null
          reminder1_sent_at: string | null
          reminder2_sent_at: string | null
          updated_at: string
          user_agent: string | null
          video_100_at: string | null
          video_25_at: string | null
          video_50_at: string | null
          video_completed: boolean
          whatsapp: string
        }
        Insert: {
          access_liberated?: boolean
          created_at?: string
          email: string
          has_desktop?: boolean
          id?: string
          name: string
          offer_email_sent_at?: string | null
          offer_expired?: boolean
          offer_expires_at?: string | null
          reminder1_sent_at?: string | null
          reminder2_sent_at?: string | null
          updated_at?: string
          user_agent?: string | null
          video_100_at?: string | null
          video_25_at?: string | null
          video_50_at?: string | null
          video_completed?: boolean
          whatsapp: string
        }
        Update: {
          access_liberated?: boolean
          created_at?: string
          email?: string
          has_desktop?: boolean
          id?: string
          name?: string
          offer_email_sent_at?: string | null
          offer_expired?: boolean
          offer_expires_at?: string | null
          reminder1_sent_at?: string | null
          reminder2_sent_at?: string | null
          updated_at?: string
          user_agent?: string | null
          video_100_at?: string | null
          video_25_at?: string | null
          video_50_at?: string | null
          video_completed?: boolean
          whatsapp?: string
        }
        Relationships: []
      }
      rendaext_analytics: {
        Row: {
          created_at: string
          event_type: string
          id: string
          referrer: string | null
          source_url: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          referrer?: string | null
          source_url?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          referrer?: string | null
          source_url?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      rendaext_audio_events: {
        Row: {
          created_at: string
          email: string | null
          id: string
          percent: number
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          percent: number
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          percent?: number
        }
        Relationships: []
      }
      rendaext_email_logs: {
        Row: {
          created_at: string
          email_to: string | null
          email_type: string | null
          error_message: string | null
          id: string
          lead_id: string | null
          recipient_email: string
          status: string
          subject: string | null
        }
        Insert: {
          created_at?: string
          email_to?: string | null
          email_type?: string | null
          error_message?: string | null
          id?: string
          lead_id?: string | null
          recipient_email: string
          status?: string
          subject?: string | null
        }
        Update: {
          created_at?: string
          email_to?: string | null
          email_type?: string | null
          error_message?: string | null
          id?: string
          lead_id?: string | null
          recipient_email?: string
          status?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rendaext_email_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "rendaext_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      rendaext_leads: {
        Row: {
          audio_listened_at: string | null
          audio_listened_percent: number | null
          created_at: string
          email: string
          email_confirmacao_enviado: boolean | null
          email_confirmacao_enviado_at: string | null
          email_lembrete_enviado: boolean | null
          id: string
          instagram_username: string | null
          media_salarial: string | null
          nome_completo: string
          source: string | null
          tipo_computador: string | null
          trabalha_atualmente: boolean | null
          whatsapp: string
        }
        Insert: {
          audio_listened_at?: string | null
          audio_listened_percent?: number | null
          created_at?: string
          email: string
          email_confirmacao_enviado?: boolean | null
          email_confirmacao_enviado_at?: string | null
          email_lembrete_enviado?: boolean | null
          id?: string
          instagram_username?: string | null
          media_salarial?: string | null
          nome_completo: string
          source?: string | null
          tipo_computador?: string | null
          trabalha_atualmente?: boolean | null
          whatsapp: string
        }
        Update: {
          audio_listened_at?: string | null
          audio_listened_percent?: number | null
          created_at?: string
          email?: string
          email_confirmacao_enviado?: boolean | null
          email_confirmacao_enviado_at?: string | null
          email_lembrete_enviado?: boolean | null
          id?: string
          instagram_username?: string | null
          media_salarial?: string | null
          nome_completo?: string
          source?: string | null
          tipo_computador?: string | null
          trabalha_atualmente?: boolean | null
          whatsapp?: string
        }
        Relationships: []
      }
      rendaext_orders: {
        Row: {
          amount: number
          audio_listened_at: string | null
          audio_listened_percent: number | null
          created_at: string
          email: string
          email_sent: boolean | null
          email_sent_at: string | null
          expired_at: string | null
          id: string
          infinitepay_link: string | null
          lead_id: string | null
          nome_completo: string
          nsu_order: string
          paid_at: string | null
          status: string
          updated_at: string
          whatsapp: string
        }
        Insert: {
          amount?: number
          audio_listened_at?: string | null
          audio_listened_percent?: number | null
          created_at?: string
          email: string
          email_sent?: boolean | null
          email_sent_at?: string | null
          expired_at?: string | null
          id?: string
          infinitepay_link?: string | null
          lead_id?: string | null
          nome_completo: string
          nsu_order: string
          paid_at?: string | null
          status?: string
          updated_at?: string
          whatsapp: string
        }
        Update: {
          amount?: number
          audio_listened_at?: string | null
          audio_listened_percent?: number | null
          created_at?: string
          email?: string
          email_sent?: boolean | null
          email_sent_at?: string | null
          expired_at?: string | null
          id?: string
          infinitepay_link?: string | null
          lead_id?: string | null
          nome_completo?: string
          nsu_order?: string
          paid_at?: string | null
          status?: string
          updated_at?: string
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "rendaext_orders_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "rendaext_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      rendaext_settings: {
        Row: {
          admin_email: string
          admin_password: string
          created_at: string
          id: string
          launch_date: string | null
          session_secret: string
          updated_at: string
          whatsapp_group_link: string | null
        }
        Insert: {
          admin_email?: string
          admin_password?: string
          created_at?: string
          id?: string
          launch_date?: string | null
          session_secret?: string
          updated_at?: string
          whatsapp_group_link?: string | null
        }
        Update: {
          admin_email?: string
          admin_password?: string
          created_at?: string
          id?: string
          launch_date?: string | null
          session_secret?: string
          updated_at?: string
          whatsapp_group_link?: string | null
        }
        Relationships: []
      }
      rendasaovivo_email_logs: {
        Row: {
          created_at: string
          email_to: string
          email_type: string
          error_message: string | null
          id: string
          status: string
          subject: string | null
        }
        Insert: {
          created_at?: string
          email_to: string
          email_type: string
          error_message?: string | null
          id?: string
          status: string
          subject?: string | null
        }
        Update: {
          created_at?: string
          email_to?: string
          email_type?: string
          error_message?: string | null
          id?: string
          status?: string
          subject?: string | null
        }
        Relationships: []
      }
      rendasaovivo_orders: {
        Row: {
          amount: number
          created_at: string
          email: string
          email_sent: boolean | null
          email_sent_at: string | null
          expired_at: string | null
          fbc: string | null
          fbp: string | null
          id: string
          infinitepay_link: string | null
          nome_completo: string
          nsu_order: string
          paid_at: string | null
          pixel_sent: boolean | null
          pixel_sent_at: string | null
          status: string
          updated_at: string
          user_agent: string | null
          whatsapp: string
        }
        Insert: {
          amount?: number
          created_at?: string
          email: string
          email_sent?: boolean | null
          email_sent_at?: string | null
          expired_at?: string | null
          fbc?: string | null
          fbp?: string | null
          id?: string
          infinitepay_link?: string | null
          nome_completo: string
          nsu_order: string
          paid_at?: string | null
          pixel_sent?: boolean | null
          pixel_sent_at?: string | null
          status?: string
          updated_at?: string
          user_agent?: string | null
          whatsapp: string
        }
        Update: {
          amount?: number
          created_at?: string
          email?: string
          email_sent?: boolean | null
          email_sent_at?: string | null
          expired_at?: string | null
          fbc?: string | null
          fbp?: string | null
          id?: string
          infinitepay_link?: string | null
          nome_completo?: string
          nsu_order?: string
          paid_at?: string | null
          pixel_sent?: boolean | null
          pixel_sent_at?: string | null
          status?: string
          updated_at?: string
          user_agent?: string | null
          whatsapp?: string
        }
        Relationships: []
      }
      rendasaovivo_settings: {
        Row: {
          aula_data: string
          aula_titulo: string
          created_at: string
          hero_video_hls_url: string
          hero_video_url: string
          id: string
          preco: number
          updated_at: string
          whatsapp_group_link: string
        }
        Insert: {
          aula_data?: string
          aula_titulo?: string
          created_at?: string
          hero_video_hls_url?: string
          hero_video_url?: string
          id?: string
          preco?: number
          updated_at?: string
          whatsapp_group_link?: string
        }
        Update: {
          aula_data?: string
          aula_titulo?: string
          created_at?: string
          hero_video_hls_url?: string
          hero_video_url?: string
          id?: string
          preco?: number
          updated_at?: string
          whatsapp_group_link?: string
        }
        Relationships: []
      }
      rendasaovivo_visits: {
        Row: {
          created_at: string
          id: string
          referrer: string | null
          session_id: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      renddx_leads: {
        Row: {
          created_at: string | null
          email: string
          id: string
          ip_address: string | null
          name: string
          user_agent: string | null
          whatsapp: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          ip_address?: string | null
          name: string
          user_agent?: string | null
          whatsapp: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          ip_address?: string | null
          name?: string
          user_agent?: string | null
          whatsapp?: string
        }
        Relationships: []
      }
      salaobel_email_logs: {
        Row: {
          created_at: string
          email_to: string
          email_type: string
          error_message: string | null
          id: string
          status: string
          subject: string | null
        }
        Insert: {
          created_at?: string
          email_to: string
          email_type: string
          error_message?: string | null
          id?: string
          status: string
          subject?: string | null
        }
        Update: {
          created_at?: string
          email_to?: string
          email_type?: string
          error_message?: string | null
          id?: string
          status?: string
          subject?: string | null
        }
        Relationships: []
      }
      salaobel_orders: {
        Row: {
          amount: number
          created_at: string
          email: string
          email_sent: boolean | null
          email_sent_at: string | null
          expired_at: string | null
          fbc: string | null
          fbp: string | null
          id: string
          infinitepay_link: string | null
          nome_completo: string
          nsu_order: string
          paid_at: string | null
          pixel_sent: boolean | null
          pixel_sent_at: string | null
          status: string
          updated_at: string
          user_agent: string | null
          whatsapp: string
        }
        Insert: {
          amount?: number
          created_at?: string
          email: string
          email_sent?: boolean | null
          email_sent_at?: string | null
          expired_at?: string | null
          fbc?: string | null
          fbp?: string | null
          id?: string
          infinitepay_link?: string | null
          nome_completo: string
          nsu_order: string
          paid_at?: string | null
          pixel_sent?: boolean | null
          pixel_sent_at?: string | null
          status?: string
          updated_at?: string
          user_agent?: string | null
          whatsapp: string
        }
        Update: {
          amount?: number
          created_at?: string
          email?: string
          email_sent?: boolean | null
          email_sent_at?: string | null
          expired_at?: string | null
          fbc?: string | null
          fbp?: string | null
          id?: string
          infinitepay_link?: string | null
          nome_completo?: string
          nsu_order?: string
          paid_at?: string | null
          pixel_sent?: boolean | null
          pixel_sent_at?: string | null
          status?: string
          updated_at?: string
          user_agent?: string | null
          whatsapp?: string
        }
        Relationships: []
      }
      salaobel_settings: {
        Row: {
          aula_data: string
          aula_titulo: string
          created_at: string
          hero_video_hls_url: string
          hero_video_url: string
          id: string
          preco: number
          updated_at: string
          whatsapp_group_link: string
        }
        Insert: {
          aula_data?: string
          aula_titulo?: string
          created_at?: string
          hero_video_hls_url?: string
          hero_video_url?: string
          id?: string
          preco?: number
          updated_at?: string
          whatsapp_group_link?: string
        }
        Update: {
          aula_data?: string
          aula_titulo?: string
          created_at?: string
          hero_video_hls_url?: string
          hero_video_url?: string
          id?: string
          preco?: number
          updated_at?: string
          whatsapp_group_link?: string
        }
        Relationships: []
      }
      salaobel_visits: {
        Row: {
          created_at: string
          id: string
          referrer: string | null
          session_id: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      squarecloud_user_profiles: {
        Row: {
          created_at: string | null
          id: string
          instagram_username: string
          profile_data: Json
          profile_screenshot_url: string | null
          squarecloud_username: string
          synced_at: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          instagram_username: string
          profile_data?: Json
          profile_screenshot_url?: string | null
          squarecloud_username: string
          synced_at?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          instagram_username?: string
          profile_data?: Json
          profile_screenshot_url?: string | null
          squarecloud_username?: string
          synced_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          admin_notes: string | null
          created_at: string
          email: string | null
          id: string
          message: string
          platform: string
          priority: string
          resolved_at: string | null
          status: string
          subject: string
          ticket_number: string
          updated_at: string
          username: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          email?: string | null
          id?: string
          message: string
          platform: string
          priority?: string
          resolved_at?: string | null
          status?: string
          subject: string
          ticket_number: string
          updated_at?: string
          username: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          email?: string | null
          id?: string
          message?: string
          platform?: string
          priority?: string
          resolved_at?: string | null
          status?: string
          subject?: string
          ticket_number?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      trial_users: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          partner_id: string | null
          password: string
          status: string | null
          updated_at: string | null
          username: string
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          partner_id?: string | null
          password: string
          status?: string | null
          updated_at?: string | null
          username: string
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          partner_id?: string | null
          password?: string
          status?: string | null
          updated_at?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "trial_users_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
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
          role: Database["public"]["Enums"]["app_role"]
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
      user_sessions: {
        Row: {
          archived_profiles: Json | null
          created_at: string
          days_remaining: number | null
          email: string | null
          id: string
          last_access: string | null
          lifetime_creative_used_at: string | null
          profile_sessions: Json | null
          squarecloud_username: string
          updated_at: string
        }
        Insert: {
          archived_profiles?: Json | null
          created_at?: string
          days_remaining?: number | null
          email?: string | null
          id?: string
          last_access?: string | null
          lifetime_creative_used_at?: string | null
          profile_sessions?: Json | null
          squarecloud_username: string
          updated_at?: string
        }
        Update: {
          archived_profiles?: Json | null
          created_at?: string
          days_remaining?: number | null
          email?: string | null
          id?: string
          last_access?: string | null
          lifetime_creative_used_at?: string | null
          profile_sessions?: Json | null
          squarecloud_username?: string
          updated_at?: string
        }
        Relationships: []
      }
      vender_pagamentos: {
        Row: {
          created_at: string
          id: string
          infinitepay_transaction_id: string | null
          payment_url: string | null
          status: string
          updated_at: string
          usuario_id: string | null
          valor: number
        }
        Insert: {
          created_at?: string
          id?: string
          infinitepay_transaction_id?: string | null
          payment_url?: string | null
          status?: string
          updated_at?: string
          usuario_id?: string | null
          valor?: number
        }
        Update: {
          created_at?: string
          id?: string
          infinitepay_transaction_id?: string | null
          payment_url?: string | null
          status?: string
          updated_at?: string
          usuario_id?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "vender_pagamentos_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "vender_usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      vender_settings: {
        Row: {
          created_at: string
          grupo_vip_link: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          grupo_vip_link?: string
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          grupo_vip_link?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      vender_usuarios: {
        Row: {
          acesso_liberado: boolean | null
          created_at: string
          email: string
          email_enviado: boolean
          email_enviado_at: string | null
          id: string
          nome: string
          senha: string
          updated_at: string
          whatsapp: string
        }
        Insert: {
          acesso_liberado?: boolean | null
          created_at?: string
          email: string
          email_enviado?: boolean
          email_enviado_at?: string | null
          id?: string
          nome: string
          senha: string
          updated_at?: string
          whatsapp: string
        }
        Update: {
          acesso_liberado?: boolean | null
          created_at?: string
          email?: string
          email_enviado?: boolean
          email_enviado_at?: string | null
          id?: string
          nome?: string
          senha?: string
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
      whatsapp_page_options: {
        Row: {
          color: string
          created_at: string
          icon_type: string
          id: string
          is_active: boolean
          label: string
          message: string
          order_index: number
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon_type?: string
          id?: string
          is_active?: boolean
          label: string
          message: string
          order_index?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          icon_type?: string
          id?: string
          is_active?: boolean
          label?: string
          message?: string
          order_index?: number
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_page_settings: {
        Row: {
          admin_email: string
          admin_password: string
          button_text: string
          created_at: string
          id: string
          page_subtitle: string
          page_title: string
          photo_url: string | null
          session_secret: string | null
          updated_at: string
          whatsapp_message: string
          whatsapp_number: string
        }
        Insert: {
          admin_email?: string
          admin_password?: string
          button_text?: string
          created_at?: string
          id?: string
          page_subtitle?: string
          page_title?: string
          photo_url?: string | null
          session_secret?: string | null
          updated_at?: string
          whatsapp_message?: string
          whatsapp_number?: string
        }
        Update: {
          admin_email?: string
          admin_password?: string
          button_text?: string
          created_at?: string
          id?: string
          page_subtitle?: string
          page_title?: string
          photo_url?: string | null
          session_secret?: string | null
          updated_at?: string
          whatsapp_message?: string
          whatsapp_number?: string
        }
        Relationships: []
      }
      wpp_bot_messages: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          lead_id: string | null
          lead_name: string | null
          message: string
          phone: string
          scheduled_for: string
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          lead_id?: string | null
          lead_name?: string | null
          message: string
          phone: string
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          lead_id?: string | null
          lead_name?: string | null
          message?: string
          phone?: string
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      wpp_bot_messages_v2: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          lead_id: string | null
          lead_name: string | null
          message: string
          phone: string
          scheduled_for: string
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          lead_id?: string | null
          lead_name?: string | null
          message: string
          phone: string
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          lead_id?: string | null
          lead_name?: string | null
          message?: string
          phone?: string
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      wpp_bot_session: {
        Row: {
          created_at: string
          id: string
          last_heartbeat: string | null
          phone_number: string | null
          qr_code: string | null
          request_logout: boolean
          request_qr: boolean
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_heartbeat?: string | null
          phone_number?: string | null
          qr_code?: string | null
          request_logout?: boolean
          request_qr?: boolean
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_heartbeat?: string | null
          phone_number?: string | null
          qr_code?: string | null
          request_logout?: boolean
          request_qr?: boolean
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      wpp_bot_session_v2: {
        Row: {
          created_at: string
          id: string
          last_heartbeat: string | null
          phone_number: string | null
          qr_code: string | null
          request_logout: boolean
          request_qr: boolean
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          last_heartbeat?: string | null
          phone_number?: string | null
          qr_code?: string | null
          request_logout?: boolean
          request_qr?: boolean
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_heartbeat?: string | null
          phone_number?: string | null
          qr_code?: string | null
          request_logout?: boolean
          request_qr?: boolean
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      wpp_bot_settings: {
        Row: {
          created_at: string
          delay_minutes: number
          enabled: boolean
          id: string
          message_template: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          delay_minutes?: number
          enabled?: boolean
          id?: string
          message_template?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          delay_minutes?: number
          enabled?: boolean
          id?: string
          message_template?: string
          updated_at?: string
        }
        Relationships: []
      }
      wpp_bot_settings_v2: {
        Row: {
          created_at: string
          delay_minutes: number
          enabled: boolean
          id: string
          message_template: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          delay_minutes?: number
          enabled?: boolean
          id: string
          message_template?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          delay_minutes?: number
          enabled?: boolean
          id?: string
          message_template?: string
          updated_at?: string
        }
        Relationships: []
      }
      wpp_connection_logs: {
        Row: {
          created_at: string | null
          details: string | null
          error_message: string | null
          event_type: string
          id: string
          status: string
        }
        Insert: {
          created_at?: string | null
          details?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          status: string
        }
        Update: {
          created_at?: string | null
          details?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          status?: string
        }
        Relationships: []
      }
      zapi_contacts: {
        Row: {
          created_at: string
          crm_status: string | null
          id: string
          is_group: boolean | null
          is_hot_lead: boolean | null
          last_message_at: string | null
          name: string | null
          notes: string | null
          phone: string
          profile_pic_url: string | null
          source: string | null
          tags: string[] | null
          unread_count: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          crm_status?: string | null
          id?: string
          is_group?: boolean | null
          is_hot_lead?: boolean | null
          last_message_at?: string | null
          name?: string | null
          notes?: string | null
          phone: string
          profile_pic_url?: string | null
          source?: string | null
          tags?: string[] | null
          unread_count?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          crm_status?: string | null
          id?: string
          is_group?: boolean | null
          is_hot_lead?: boolean | null
          last_message_at?: string | null
          name?: string | null
          notes?: string | null
          phone?: string
          profile_pic_url?: string | null
          source?: string | null
          tags?: string[] | null
          unread_count?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      zapi_flow_executions: {
        Row: {
          completed_at: string | null
          current_step: number | null
          flow_id: string
          id: string
          last_step_at: string | null
          paused_at: string | null
          phone: string
          started_at: string
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          current_step?: number | null
          flow_id: string
          id?: string
          last_step_at?: string | null
          paused_at?: string | null
          phone: string
          started_at?: string
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          current_step?: number | null
          flow_id?: string
          id?: string
          last_step_at?: string | null
          paused_at?: string | null
          phone?: string
          started_at?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zapi_flow_executions_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "zapi_flows"
            referencedColumns: ["id"]
          },
        ]
      }
      zapi_flow_steps: {
        Row: {
          button_actions: Json | null
          button_options: Json | null
          button_text: string | null
          content: string | null
          created_at: string
          delay_seconds: number | null
          flow_id: string
          followup_content: string | null
          followup_delay_seconds: number | null
          followup_enabled: boolean | null
          followup_flow_id: string | null
          followup_media_url: string | null
          followup_type: string | null
          id: string
          media_url: string | null
          simulate_typing: boolean | null
          step_order: number
          step_type: string
          typing_duration_ms: number | null
          updated_at: string
          wait_for_reply: boolean | null
          wait_indefinitely: boolean | null
          wait_timeout_seconds: number | null
        }
        Insert: {
          button_actions?: Json | null
          button_options?: Json | null
          button_text?: string | null
          content?: string | null
          created_at?: string
          delay_seconds?: number | null
          flow_id: string
          followup_content?: string | null
          followup_delay_seconds?: number | null
          followup_enabled?: boolean | null
          followup_flow_id?: string | null
          followup_media_url?: string | null
          followup_type?: string | null
          id?: string
          media_url?: string | null
          simulate_typing?: boolean | null
          step_order?: number
          step_type?: string
          typing_duration_ms?: number | null
          updated_at?: string
          wait_for_reply?: boolean | null
          wait_indefinitely?: boolean | null
          wait_timeout_seconds?: number | null
        }
        Update: {
          button_actions?: Json | null
          button_options?: Json | null
          button_text?: string | null
          content?: string | null
          created_at?: string
          delay_seconds?: number | null
          flow_id?: string
          followup_content?: string | null
          followup_delay_seconds?: number | null
          followup_enabled?: boolean | null
          followup_flow_id?: string | null
          followup_media_url?: string | null
          followup_type?: string | null
          id?: string
          media_url?: string | null
          simulate_typing?: boolean | null
          step_order?: number
          step_type?: string
          typing_duration_ms?: number | null
          updated_at?: string
          wait_for_reply?: boolean | null
          wait_indefinitely?: boolean | null
          wait_timeout_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "zapi_flow_steps_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "zapi_flows"
            referencedColumns: ["id"]
          },
        ]
      }
      zapi_flows: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          trigger_keywords: string[] | null
          trigger_on_first_message: boolean | null
          trigger_on_specific_message: boolean | null
          trigger_specific_text: string | null
          trigger_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          trigger_keywords?: string[] | null
          trigger_on_first_message?: boolean | null
          trigger_on_specific_message?: boolean | null
          trigger_specific_text?: string | null
          trigger_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          trigger_keywords?: string[] | null
          trigger_on_first_message?: boolean | null
          trigger_on_specific_message?: boolean | null
          trigger_specific_text?: string | null
          trigger_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      zapi_messages: {
        Row: {
          contact_name: string | null
          content: string | null
          created_at: string
          direction: string
          id: string
          is_read: boolean | null
          media_url: string | null
          message_id: string | null
          message_type: string
          metadata: Json | null
          phone: string
          status: string | null
          timestamp: number | null
        }
        Insert: {
          contact_name?: string | null
          content?: string | null
          created_at?: string
          direction?: string
          id?: string
          is_read?: boolean | null
          media_url?: string | null
          message_id?: string | null
          message_type?: string
          metadata?: Json | null
          phone: string
          status?: string | null
          timestamp?: number | null
        }
        Update: {
          contact_name?: string | null
          content?: string | null
          created_at?: string
          direction?: string
          id?: string
          is_read?: boolean | null
          media_url?: string | null
          message_id?: string | null
          message_type?: string
          metadata?: Json | null
          phone?: string
          status?: string | null
          timestamp?: number | null
        }
        Relationships: []
      }
      zapi_settings: {
        Row: {
          client_token: string | null
          created_at: string
          id: string
          instance_id: string | null
          is_connected: boolean | null
          phone_number: string | null
          token: string | null
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          client_token?: string | null
          created_at?: string
          id?: string
          instance_id?: string | null
          is_connected?: boolean | null
          phone_number?: string | null
          token?: string | null
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          client_token?: string | null
          created_at?: string
          id?: string
          instance_id?: string | null
          is_connected?: boolean | null
          phone_number?: string | null
          token?: string | null
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      zapmro_announcements: {
        Row: {
          content: string | null
          created_at: string
          display_duration: number
          end_date: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_blocking: boolean
          start_date: string | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          display_duration?: number
          end_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_blocking?: boolean
          start_date?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          display_duration?: number
          end_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_blocking?: boolean
          start_date?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      zapmro_blocked_ips: {
        Row: {
          created_at: string
          id: string
          ip: string
          reason: string | null
          username: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ip: string
          reason?: string | null
          username?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ip?: string
          reason?: string | null
          username?: string | null
        }
        Relationships: []
      }
      zapmro_orders: {
        Row: {
          amount: number
          api_created: boolean | null
          client_ip: string | null
          completed_at: string | null
          created_at: string
          email: string
          email_sent: boolean | null
          expired_at: string | null
          id: string
          infinitepay_link: string | null
          metadata: Json | null
          nsu_order: string
          paid_at: string | null
          phone: string | null
          plan_type: string
          status: string
          updated_at: string
          user_agent: string | null
          username: string
        }
        Insert: {
          amount?: number
          api_created?: boolean | null
          client_ip?: string | null
          completed_at?: string | null
          created_at?: string
          email: string
          email_sent?: boolean | null
          expired_at?: string | null
          id?: string
          infinitepay_link?: string | null
          metadata?: Json | null
          nsu_order: string
          paid_at?: string | null
          phone?: string | null
          plan_type?: string
          status?: string
          updated_at?: string
          user_agent?: string | null
          username: string
        }
        Update: {
          amount?: number
          api_created?: boolean | null
          client_ip?: string | null
          completed_at?: string | null
          created_at?: string
          email?: string
          email_sent?: boolean | null
          expired_at?: string | null
          id?: string
          infinitepay_link?: string | null
          metadata?: Json | null
          nsu_order?: string
          paid_at?: string | null
          phone?: string | null
          plan_type?: string
          status?: string
          updated_at?: string
          user_agent?: string | null
          username?: string
        }
        Relationships: []
      }
      zapmro_upgrade_fees: {
        Row: {
          amount: number
          created_at: string
          email: string
          id: string
          infinitepay_link: string | null
          manual_approval: boolean | null
          nsu_order: string
          paid_at: string | null
          status: string
          updated_at: string
          username: string
        }
        Insert: {
          amount?: number
          created_at?: string
          email: string
          id?: string
          infinitepay_link?: string | null
          manual_approval?: boolean | null
          nsu_order: string
          paid_at?: string | null
          status?: string
          updated_at?: string
          username: string
        }
        Update: {
          amount?: number
          created_at?: string
          email?: string
          id?: string
          infinitepay_link?: string | null
          manual_approval?: boolean | null
          nsu_order?: string
          paid_at?: string | null
          status?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      zapmro_user_sessions: {
        Row: {
          created_at: string
          device_label: string | null
          first_seen: string
          id: string
          ip: string
          is_active: boolean
          last_seen: string
          revoked_at: string | null
          session_token: string | null
          updated_at: string
          user_agent: string | null
          user_id: string | null
          username: string
        }
        Insert: {
          created_at?: string
          device_label?: string | null
          first_seen?: string
          id?: string
          ip?: string
          is_active?: boolean
          last_seen?: string
          revoked_at?: string | null
          session_token?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
          username: string
        }
        Update: {
          created_at?: string
          device_label?: string | null
          first_seen?: string
          id?: string
          ip?: string
          is_active?: boolean
          last_seen?: string
          revoked_at?: string | null
          session_token?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "zapmro_user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "zapmro_users"
            referencedColumns: ["id"]
          },
        ]
      }
      zapmro_users: {
        Row: {
          created_at: string
          days_remaining: number | null
          email: string | null
          email_locked: boolean | null
          expires_at: string | null
          id: string
          is_active: boolean
          last_access: string | null
          name: string | null
          password_hash: string | null
          password_plain: string | null
          registered_numbers: string[] | null
          updated_at: string
          username: string
          whatsapp: string | null
          whatsapp_limit: number | null
        }
        Insert: {
          created_at?: string
          days_remaining?: number | null
          email?: string | null
          email_locked?: boolean | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_access?: string | null
          name?: string | null
          password_hash?: string | null
          password_plain?: string | null
          registered_numbers?: string[] | null
          updated_at?: string
          username: string
          whatsapp?: string | null
          whatsapp_limit?: number | null
        }
        Update: {
          created_at?: string
          days_remaining?: number | null
          email?: string | null
          email_locked?: boolean | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_access?: string | null
          name?: string | null
          password_hash?: string | null
          password_plain?: string | null
          registered_numbers?: string[] | null
          updated_at?: string
          username?: string
          whatsapp?: string | null
          whatsapp_limit?: number | null
        }
        Relationships: []
      }
      zapzap_leads: {
        Row: {
          created_at: string
          email: string
          email_enviado: boolean
          id: string
          nome: string
          whatsapp: string
        }
        Insert: {
          created_at?: string
          email: string
          email_enviado?: boolean
          id?: string
          nome: string
          whatsapp: string
        }
        Update: {
          created_at?: string
          email?: string
          email_enviado?: boolean
          id?: string
          nome?: string
          whatsapp?: string
        }
        Relationships: []
      }
      zapzap_settings: {
        Row: {
          created_at: string
          grupo_link: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          grupo_link?: string
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          grupo_link?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      mro_orders_public: {
        Row: {
          amount: number | null
          api_created: boolean | null
          completed_at: string | null
          created_at: string | null
          email_sent: boolean | null
          id: string | null
          nsu_order: string | null
          paid_at: string | null
          plan_type: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number | null
          api_created?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          email_sent?: boolean | null
          id?: string | null
          nsu_order?: string | null
          paid_at?: string | null
          plan_type?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number | null
          api_created?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          email_sent?: boolean | null
          id?: string | null
          nsu_order?: string | null
          paid_at?: string | null
          plan_type?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      dump_list_tables: {
        Args: never
        Returns: {
          row_count: number
          table_name: string
        }[]
      }
      dump_schema_info: { Args: never; Returns: Json }
      dump_table_rows: {
        Args: { p_limit?: number; p_offset?: number; p_table: string }
        Returns: Json
      }
      get_whatsapp_public_config: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      ig_has_tenant_role: {
        Args: {
          _roles: Database["public"]["Enums"]["ig_role"][]
          _tenant_id: string
        }
        Returns: boolean
      }
      ig_is_super_admin: { Args: never; Returns: boolean }
      ig_is_tenant_member: { Args: { _tenant_id: string }; Returns: boolean }
      ig_rate_limit_hit: {
        Args: { _bucket: string; _limit: number; _window_seconds: number }
        Returns: boolean
      }
      increment_broadcast_failed: { Args: { b_id: string }; Returns: undefined }
      increment_broadcast_sent: { Args: { b_id: string }; Returns: undefined }
      increment_corretor_corrections: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      increment_crm_metric: {
        Args: { metric_column: string }
        Returns: undefined
      }
      sync_zapmro_days: { Args: never; Returns: undefined }
      trigger_process_scheduled_messages: { Args: never; Returns: undefined }
      whatsapp_admin_login: {
        Args: { login_email: string; login_password: string }
        Returns: Json
      }
    }
    Enums: {
      access_status: "active" | "blocked" | "expired"
      app_role: "admin" | "user"
      ig_role: "owner" | "admin" | "manager" | "agent" | "analyst"
      lovablack_plan_type: "trial" | "monthly" | "lifetime"
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
      access_status: ["active", "blocked", "expired"],
      app_role: ["admin", "user"],
      ig_role: ["owner", "admin", "manager", "agent", "analyst"],
      lovablack_plan_type: ["trial", "monthly", "lifetime"],
    },
  },
} as const
