export interface FeRecipe {
    id: string;
    name: string;
    author: string;
    familyId: string;
    familyName: string;
    preparation: string;
    createdAt: string;
    ingredients?: string;
    photoUrl?: string;
    likes?: Record<string, boolean>;
}

export interface CreateRecipeRequestInput {
    name: string;
    ingredients?: string;
    preparation: string;
    photoUrl?: string;
}