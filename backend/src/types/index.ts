// Database model types
export interface Donor {
	id: number;
	name: string;
	blood_group: string;
	phone: string;
	email: string | null;
	address: string | null;
	lat: number;
	lng: number;
	available: boolean;
	last_donation_date: string | null;
	created_at: Date;
	distance_km?: number;
}

// API Request types
export interface CreateDonorRequest {
	name: string;
	blood_group: string;
	phone: string;
	email?: string;
	address?: string;
	lat: number;
	lng: number;
}

export interface SearchDonorsQuery {
	blood_group?: string;
	lat?: string;
	lng?: string;
	radius_km?: string;
	availability?: string;
}

// API Response types
export interface ApiResponse<T> {
	data?: T;
	error?: string;
	message?: string;
}

export interface HealthResponse {
	ok: boolean;
	timestamp?: string;
	uptime?: number;
}

// Blood group enum for type safety
export enum BloodGroup {
	A_POSITIVE = 'A+',
	A_NEGATIVE = 'A-',
	B_POSITIVE = 'B+', 
	B_NEGATIVE = 'B-',
	AB_POSITIVE = 'AB+',
	AB_NEGATIVE = 'AB-',
	O_POSITIVE = 'O+',
	O_NEGATIVE = 'O-'
}

// Utility types
export type CreateDonorResponse = Donor;
export type SearchDonorsResponse = Donor[];

// Authentication types
export interface RegisterRequest {
	name: string;
	email: string;
	password: string;
	blood_group: string;
	phone: string;
	address: string;
	lat: number;
	lng: number;
}

export interface LoginRequest {
	email: string;
	password: string;
}

export interface AuthResponse {
	user: {
		id: number;
		name: string;
		email: string;
		blood_group: string;
		phone: string;
		address: string;
		lat: number;
		lng: number;
	};
	token: string;
	refreshToken?: string;
}