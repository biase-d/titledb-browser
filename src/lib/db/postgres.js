import postgres from 'postgres'
import { POSTGRES_URL } from '$env/static/private';

const isSSLRequired = POSTGRES_URL.includes('?sslmode=require');
export const sql = postgres(POSTGRES_URL, { ssl: isSSLRequired ? 'require' : undefined });
