import { db } from '$lib/db';
import * as favoritesRepo from '$lib/repositories/favoritesRepository';

/**
 * Get favorites for a user
 * @param {string} userId
 * @returns {Promise<string[]>}
 */
export async function getFavorites(userId) {
    return favoritesRepo.getUserFavorites(db, userId);
}

/**
 * Add a game to favorites
 * @param {string} userId
 * @param {string} gameId
 * @returns {Promise<void>}
 */
export async function addFavorite(userId, gameId) {
    return favoritesRepo.addFavorite(db, userId, gameId);
}

/**
 * Remove a game from favorites
 * @param {string} userId
 * @param {string} gameId
 * @returns {Promise<void>}
 */
export async function removeFavorite(userId, gameId) {
    return favoritesRepo.removeFavorite(db, userId, gameId);
}
