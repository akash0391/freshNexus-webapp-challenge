export type NutriScoreGrade = "a" | "b" | "c" | "d" | "e" | "unknown";

export interface OFFNutriments {
  "energy-kcal_100g"?: number;
  fat_100g?: number;
  "saturated-fat_100g"?: number;
  sugars_100g?: number;
  salt_100g?: number;
  proteins_100g?: number;
}

export interface OFFProduct {
  code: string;
  product_name?: string;
  brands?: string;
  image_url?: string;
  nutriscore_grade?: NutriScoreGrade;
  categories_tags?: string[];
  nutriments?: OFFNutriments;
  ingredients_text?: string;
}

export interface OFFSearchResponse {
  count: number;
  // false when search-a-licious truncated `count` at its 10,000-result cap.
  is_count_exact?: boolean;
  page: number;
  page_size: number;
  products: OFFProduct[];
}
