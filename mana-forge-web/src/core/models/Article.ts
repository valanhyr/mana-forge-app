export interface Article {
    documentId: string;
    title: string;
    subtitle: string;
    imageUrl: string;
    author?: string;
    content?:  string;
    publishedAt?: string;
}