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
          condition: Condition;
          category: Category;
          image_path: string | null;
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
          condition: Condition;
          category: Category;
          image_path?: string | null;
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
          condition?: Condition;
          category?: Category;
          image_path?: string | null;
          status?: ListingStatus;
          created_at?: string;
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
          created_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          buyer_id: string;
          seller_id: string;
          price: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          listing_id?: string;
          buyer_id?: string;
          seller_id?: string;
          price?: number;
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
