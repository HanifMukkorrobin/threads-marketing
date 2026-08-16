export interface ProductVariant {
  name: string;
  price: number;
  duration?: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string | null;
  variants: ProductVariant[];
  usp: string[];
  targetAudience: string | null;
  toneOfVoice: string | null;
  ctaTemplate: string | null;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface CreateProductInput {
  name: string;
  slug?: string;
  category: string;
  description?: string;
  variants: ProductVariant[];
  usp: string[];
  targetAudience?: string;
  toneOfVoice?: string;
  ctaTemplate?: string;
  isActive?: boolean;
}
