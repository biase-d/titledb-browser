export class Game {
	id;
	groupId;
	names;
	regions;
	publisher;
	releaseDate;
	sizeInBytes;
	iconUrl;
	bannerUrl;
	screenshots;
	graphics;
	performanceHistory;
	contributor;
	sourcePrUrl;

	allTitlesInGroup;
	youtubeLinks;
	youtubeContributors;

	/**
	 * @param {object} rawData - The raw, combined data from getGameDetails() OR a plain object from transport
	 */
	constructor(rawData) {
		if (rawData.game) {
			// This is the original, nested structure from the server load function
			Object.assign(this, rawData.game);
			this.allTitlesInGroup = rawData.allTitlesInGroup || [];
			this.youtubeLinks = rawData.youtubeLinks || [];
			this.youtubeContributors = rawData.youtubeContributors || [];
		} else {
			// This is a "flat" object, already processed or coming from the client
			Object.assign(this, rawData);
		}
	}

	/** The primary display name of the game */
	get name() {
		return this.names?.[0] || 'Unknown Title';
	}

	/** The game's file size, formatted for display (e.g., "1.23 GB") */
	get formattedSize() {
		if (!this.sizeInBytes || isNaN(this.sizeInBytes)) return 'N/A';
		if (this.sizeInBytes === 0) return '0 Bytes';
		const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
		const i = Math.floor(Math.log(this.sizeInBytes) / Math.log(1024));
		const value = this.sizeInBytes / Math.pow(1024, i);
		return `${value.toFixed(value % 1 === 0 ? 0 : 2)} ${sizes[i]}`;
	}

	/** The game's release date, formatted for display (e.g., "October 26, 2023") */
	get formattedReleaseDate() {
		if (!this.releaseDate) return 'N/A';
		const dateStr = this.releaseDate.toString();
		const year = dateStr.substring(0, 4);
		const month = dateStr.substring(4, 6);
		const day = dateStr.substring(6, 8);
		return new Date(`${year}-${month}-${day}`).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	/** Determines if the game is unreleased */
	get isUnreleased() {
		if (!this.releaseDate) return false;
		const dateStr = this.releaseDate.toString();
		const year = parseInt(dateStr.substring(0, 4), 10);
		const month = parseInt(dateStr.substring(4, 6), 10) - 1;
		const day = parseInt(dateStr.substring(6, 8), 10);
		const release = new Date(year, month, day);
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		return release > today;
	}

	/** Aggregates all unique contributors from all data sources. */
	get allContributors() {
		const contributors = new Set();
		if (this.contributor) this.contributor.forEach(c => contributors.add(c));
		if (this.graphics?.contributor) this.graphics.contributor.forEach(c => contributors.add(c));
		if (this.youtubeLinks) this.youtubeLinks.forEach(c => contributors.add(c.submittedBy));
		return [...contributors];
	}

	/** The latest performance profile available. */
	get latestPerformanceProfile() {
		return this.performanceHistory?.[0] || null;
	}

}