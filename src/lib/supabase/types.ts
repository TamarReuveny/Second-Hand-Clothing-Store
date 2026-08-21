export type Condition = "new" | "like-new" | "good" | "fair";

export type Category =
  | "tops"
  | "bottoms"
  | "dresses"
  | "outerwear"
  | "shoes"
  | "accessories";

export type ListingStatus = "active" | "sold";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      listings: {
        Row: {
          id: string;
          seller_id: string;
          title: string;
          description: string;
          price: number;
          size: string;
          color: string;
          condition: Condition;
          category: Category;
          status: ListingStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          seller_id: string;
          title: string;
          description?: string;
          price: number;
          size: string;
          color: string;
          condition: Condition;
          category: Category;
          status?: ListingStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          seller_id?: string;
          title?: string;
          description?: string;
          price?: number;
          size?: string;
          color?: string;
          condition?: Condition;
          category?: Category;
          status?: ListingStatus;
          created_at?: string;
        };
        Relationships: [];
      };
      listing_images: {
        Row: {
          id: string;
          listing_id: string;
          image_path: string;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          image_path: string;
          position?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          listing_id?: string;
          image_path?: string;
          position?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      cart_items: {
        Row: {
          id: string;
          user_id: string;
          listing_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          listing_id: string;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      reviews: {
        Row: {
          id: string;
          order_id: string;
          reviewer_id: string;
          seller_id: string;
          rating: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          reviewer_id: string;
          seller_id: string;
          rating: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          rating?: number;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          listing_id: string;
          buyer_id: string;
          seller_id: string;
          price: number;
          listing_title: string | null;
          listing_size: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          buyer_id: string;
          seller_id: string;
          price: number;
          listing_title?: string | null;
          listing_size?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          listing_id?: string;
          buyer_id?: string;
          seller_id?: string;
          price?: number;
          listing_title?: string | null;
          listing_size?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      purchase_listing: {
        Args: { p_listing_id: string };
        Returns: Database["public"]["Tables"]["orders"]["Row"];
      };
    };
  };
};

export type ListingRow = Database["public"]["Tables"]["listings"]["Row"];
export type ListingImageRow =
  Database["public"]["Tables"]["listing_images"]["Row"];
