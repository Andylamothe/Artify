export type Role = "guest" | "viewer" | "artist";
export type ArtProfile = "renaissance" | "modern" | "abstract" | "surreal";

export interface GalleryLocation {
  floor: number;
  section: string;
  piece: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  createdAt: string;
  artProfile?: ArtProfile;
}

export interface Artwork {
  id: string;
  title: string;
  artistName: string;
  artistId: string;
  medium: string;
  year: number;
  dimensions?: string;
  museum?: string;
  location?: string;
  categories: string[];
  galleryLocation?: GalleryLocation;
  imageUrl: string;
  has3D: boolean;
  arWebId?: string;
  description?: string;
  likes: number;
  dislikes: number;
  likedBy: string[];
  dislikedBy: string[];
  savedBy: string[];
  isLikedByMe?: boolean;
  isDislikedByMe?: boolean;
  isSavedByMe?: boolean;
  createdAt: string;
}
