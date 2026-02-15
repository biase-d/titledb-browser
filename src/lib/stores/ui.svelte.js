/**
 * @file UI Store
 * @description Manages global UI state like modal visibility and targeted scrolling.
 */

class UIStore {
	/** @type {boolean} */
	showSettings = $state(false)

	/** @type {string | undefined} */
	settingsSection = $state()

	/**
     * Open the settings modal, optionally targeting a specific section.
     * @param {string} [section] - The section ID to scroll to (e.g., 'appearance', 'beta')
     */
	openSettings (section) {
		this.settingsSection = section
		this.showSettings = true
	}

	/**
     * Close the settings modal.
     */
	closeSettings () {
		this.showSettings = false
		this.settingsSection = undefined
	}
}

export const uiStore = new UIStore()
