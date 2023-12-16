import {App, DataAdapter, Notice, Plugin, PluginSettingTab, Setting} from 'obsidian';
import {
	Boox2ObsidianSettings,
	DEFAULT_ONYXBOOX_SETTINGS,
	formatFiles,
	replaceFiles,
	setLocalFolder
} from './fileUtils';

// Inspired in some code ideas from:
// https://github.com/akosbalasko/Onyx-Boox-Annotation-Highlight-Extractor



const DEFAULT_SETTINGS: Boox2ObsidianSettings = {
	mainFolder: '_boox',
	outputFolder: 'notes',
	backupFolder: '.storage',
	onyxBoox: DEFAULT_ONYXBOOX_SETTINGS
}

export default class Boox2Obsidian extends Plugin {
	settings: Boox2ObsidianSettings;
	obsAdapter: DataAdapter;
	basePath: string;

	async checkFolders() {
		const BASE_FOLDER = this.basePath;

		const MAIN_FOLDER = this.settings.mainFolder;
		const OUTPUT_FOLDER = `${MAIN_FOLDER}/${this.settings.outputFolder}`;
		const BACKUP_FOLDER = `${MAIN_FOLDER}/${this.settings.backupFolder}`;

		const mainFolderIsAvailable = await this.obsAdapter.exists(MAIN_FOLDER);
		if(!mainFolderIsAvailable){
			const mainFolderPath = setLocalFolder(BASE_FOLDER, MAIN_FOLDER);
			console.log(`Main Folder Path is: ${mainFolderPath}`);
		}
		const outputFolderIsAvailable = await this.obsAdapter.exists(OUTPUT_FOLDER);
		if(!outputFolderIsAvailable){
			const outputFolderPath = setLocalFolder(BASE_FOLDER, OUTPUT_FOLDER);
			console.log(`Output Folder Path is: ${outputFolderPath}`);
		}
		const backupFolderIsAvailable = await this.obsAdapter.exists(BACKUP_FOLDER);
		if(!backupFolderIsAvailable){
			const backupFolderPath = setLocalFolder(BASE_FOLDER, BACKUP_FOLDER);
			console.log(`Backup Folder Path is: ${backupFolderPath}`);
		}
	}

	async getMainFolder() {
		return this.obsAdapter.getFullPath(this.settings.mainFolder)
	}

	async moveFiles() {
		replaceFiles(await this.getMainFolder(), this.settings)
	}

	async prepareFiles() {
		formatFiles(await this.getMainFolder(), this.settings.outputFolder, this.settings.onyxBoox, this.basePath)
	}

	async onload() {
		await this.loadSettings();

		const ribbonIconEl = this.addRibbonIcon('refresh-ccw-dot', 'Boox2Obsidian', async () => {
			new Notice('Checking Folders...')
			await this.checkFolders();
			new Notice('Preparing Files...')
			await this.moveFiles();
			new Notice('Creating Notes...')
			await this.prepareFiles();
		})

		ribbonIconEl.addClass('ribbon-container');

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new OnyxBooxExtractorSettingTab(this.app, this))

	}

	//onunload() {}

	async loadSettings() {
		this.obsAdapter = this.app.vault.adapter
		this.basePath = this.app.vault.adapter.getBasePath()
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
	}

	async saveSettings() {
		await this.saveData(this.settings)
	}
}

class OnyxBooxExtractorSettingTab extends PluginSettingTab {
	plugin: Boox2Obsidian

	constructor(app: App, plugin: Boox2Obsidian) {
		super(app, plugin)
		this.plugin = plugin
	}

	display(): void {
		const {containerEl} = this

		containerEl.empty()

		containerEl.createEl('h2', {text: 'Settings'})

		new Setting(containerEl)
			.setName('[WIP] Word Blacklist')
			.setDesc('Comma separated list of words to ignore')
			.addText(text => text
				.setValue(this.plugin.settings.onyxBoox.wordBlacklist)
				.onChange(async (value) => {
					this.plugin.settings.onyxBoox.wordBlacklist = value
					await this.plugin.saveSettings()
				}))

		new Setting(containerEl)
			.setName('[WIP] Beautiffy Note Names?')
			.setDesc('Tries to remove junk from file name')
			.addToggle(text => text
				.setValue(this.plugin.settings.onyxBoox.beautiffyNoteNames)
				.onChange(async (value) => {
					this.plugin.settings.onyxBoox.beautiffyNoteNames = value
					await this.plugin.saveSettings()
				}))
	}
}
