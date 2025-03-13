export interface Recipe {
    id: string;
    name: string;
    author: string;
    familyId: string;
    familyName: string;
    preparation: string;
    createdAt: string;
    ingredients?: string;
    photoUrl?: string;
}