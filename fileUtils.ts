const fs = require('fs')
const path = require('path')

interface ReferenceNoteDetails {
	title: string,
	authors: string,
}

interface ReadingNoteDetails {
	section?: string;
	creationTime?: Date;
	page?: number;
	originalText?: string;
	annotation?: string;
}

interface NoteSnipet {
	highlighPage: string;
	highlightDate: string;
	quote: string;
	section?: string;
}

export interface Boox2ObsidianSettings {
	mainFolder: string;
	outputFolder: string;
	backupFolder: string;
	onyxBoox: OnyxBooxExtractorSettings;
}

export interface OnyxBooxExtractorSettings {
	wordBlacklist: string;
	beautiffyNoteNames: boolean
}

export const DEFAULT_ONYXBOOX_SETTINGS: OnyxBooxExtractorSettings = {
	wordBlacklist: '',
	beautiffyNoteNames: true
}

export const setLocalFolder = (basePath: string, newFolder: string): string => {
	const localFolder = `${basePath}/${newFolder}`
	if (!fs.existsSync(localFolder)) {
		fs.mkdirSync(localFolder)
		console.log(`Folder '${newFolder}' created!`)
	}
	return localFolder
}

const getVersion = (fileContent: ReadingNoteDetails): string => {
	return fileContent ? 'v1' : ''
}

const groupBy = <T, K extends keyof any>(arr: T[], key: (i: T) => K) =>
	arr.reduce((groups, item) => {
		(groups[key(item)] ||= []).push(item)
		return groups
	}, {} as Record<K, T[]>)

export const formatFiles = (mainFolder: string, outputFolder: string, settings: OnyxBooxExtractorSettings, basePath: string) => {

	const notesPath = `${mainFolder}/${outputFolder}`
	let filesInFolder: string[] = []
	fs.readdirSync(notesPath)
		.forEach((f: any) => {
			if (path.extname(f) === '.b2o') filesInFolder.push(f)
		})

	const NOTE_SEPARATOR = '-------------------'
	for (let rawFile of filesInFolder) {
		try {
			const fileContent = fs.readFileSync(`${notesPath}/${rawFile}`, 'utf8')

			switch (getVersion(fileContent)) {

				case 'v1': {
					// Configuration 01
					let readingNotesArray = fileContent.split('\n')
					readingNotesArray.shift()
					readingNotesArray = readingNotesArray.join('\n').split(NOTE_SEPARATOR)

					const titleAndAuthor = rawFile.split('.')[0].split(' - ')
					const title = deepTrim(titleAndAuthor[0])
					const authors = deepTrim(titleAndAuthor[1])

					const referenceInfo: ReferenceNoteDetails = {
						title,
						authors,
					}

					let noteContent = `## ${referenceInfo.title}\n### ${referenceInfo.authors}\n\n`
					const readingNotesArrayObj = parseChapters(readingNotesArray)
					const contentList = groupBy(readingNotesArrayObj, i => i.section ?? '');

					Object.entries(contentList).forEach(([k, v]) => {
						let content = `#### ${k.length > 0 ? k : 'Annotations'}\n`
						v.forEach((e: NoteSnipet) => {
							const localDate = new Date(e.highlightDate.trim())
							const quote = e.quote.trim()
							const startContent = quote.charAt(0) === quote.charAt(0).toUpperCase() ? '' : '...'
							content += `>${startContent + quote}\n` +
								`>\n` +
								`>${localDate.toLocaleString()}\n` +
								`>${e.highlighPage.trim()}\n\n`
						})
						noteContent += content
					})

					fs.writeFileSync(`${notesPath}/${rawFile.split('.')[0]}.md`, noteContent)
					fs.rmSync(`${notesPath}/${rawFile}`, {recursive: true, force: true})
				}
			}
		} catch (err) {
			console.error('FORMAT_ERROR: ' + err)
		}
	}
}

// const getBookName = (folderNameStr: string) => {
// 	// This tries very hard to find some logic in a complete chaotic world
// 	// (ノಠ益ಠ)ノ彡┻━┻
// 	let authorAndTitle = ''
// 	level1Separator.forEach((separator: string) =>{
// 		try {
// 			const stringListIs = folderNameStr.split(separator)
// 			stringListIs.forEach((splitNames: string) => {
// 				const removeParenthesis = splitNames.replace(/ *\([^)]*\) */g, '')
// 				const stripSubContent = removeParenthesis.split('-')[0]
// 				const contentString = deepTrim(stripSubContent)
//
// 				if(!/\d/.test(contentString) && authorAndTitle.split(' | ').length < 2){
// 					if (!/[.\-]/.test(contentString)) {
// 						const blackList = settings.onyxBoox.wordBlacklist.split(',')
// 						if (!blackList.some((v: string) => contentString.includes(v.trim()))) {
// 							const stringList = contentString.split(' ')
// 							if(stringList.length === 2) {
// 								if (stringList[0].trim().length > 3 && stringList[1].trim().length > 3) {
// 									if(
// 										stringList[0].trim().charAt(0) === stringList[0].trim().charAt(0).toUpperCase() &&
// 										stringList[1].trim().charAt(0) === stringList[1].trim().charAt(0).toUpperCase()
// 									){
// 										// Probably Author Name
// 										if(contentString.contains('|')){
// 											authorAndTitle = contentString.trim() + authorAndTitle
// 										}
// 										else {
// 											authorAndTitle += contentString.trim() + '|'
// 										}
// 									}
// 								}
// 							}
// 							else if (contentString.contains('&') && (contentString.match(/,/g) || []).length > 1){
// 								// Probably Author Name
// 								if(contentString.contains('|')){
// 									authorAndTitle = contentString.trim() + authorAndTitle
// 								}
// 								else {
// 									authorAndTitle += contentString.trim() + ' | '
// 								}
// 							}
// 							else {
// 								// Probably Title Name
// 								if(contentString.contains('|')){
// 									authorAndTitle = authorAndTitle + contentString.trim()
// 								}
// 								else {
// 									authorAndTitle += ' | ' + contentString.trim()
// 								}
// 							}
// 						}
// 					}
// 				}
// 			})
// 		}
// 		catch (error) {
// 			console.log('Name extraction failed for: ', separator)
// 			console.log(error)
// 		}
// 	})
// 	return authorAndTitle
// }

export const replaceFiles = (mainFolder: string, settings: Boox2ObsidianSettings) => {
	let filteredFolders: string[] = []
	fs.readdirSync(mainFolder).forEach((t: any) => {
		if (!t.startsWith('.') && t !== settings.outputFolder) filteredFolders.push(t)
	})
	for (let folderName of filteredFolders) {
		const actualFolderIs = `${mainFolder}/${folderName}`

		let filesInFolder: string[] = []
		fs.readdirSync(actualFolderIs).forEach((fileName: any) => filesInFolder.push(fileName))
		filesInFolder.sort().reverse()

		// Name should be "Title - Author"
		const beautifiedName = folderName
		const outputFile = `${mainFolder}/${settings.outputFolder}/${beautifiedName}.b2o`
		const mostRecentFile = `${actualFolderIs}/${filesInFolder[0]}`
		fs.copyFile(mostRecentFile, outputFile, (err: any) => {
			if (err) {
				console.log('COPY_ERROR: ' + err)
			} else {
				const backupFolderFullPath = `${mainFolder}/${settings.backupFolder}/${beautifiedName}`
				moveDirectory(actualFolderIs, backupFolderFullPath)
			}
		});

		// ************************************************************************************* //
		// QUESTION:																			 //
		// Do I need to merge the files, or it'll always export everything and I just need to	 //
		// keep track of the most recent file version?											 //
		// ------------------------------------------------------------------------------------- //
		// const outStream = fs.createWriteStream(outputFile);									 //
		// for (let file in filesInFolder){														 //
		// 	console.log(`Will merge: ${actualFolderIs}/${file}`);								 //
		// 	fs.createReadStream(`${actualFolderIs}/${file}`).pipe(outStream);					 //
		// }																					 //
		// ************************************************************************************* //
	}

}
const deepTrim = (messyString: string) => {
	return messyString.replace(/^[^a-z\d]*|[^a-z\d]*$/gi, '')
}
const moveDirectory = (source: string, destination: string) => {
	fs.mkdirSync(destination, {recursive: true})
	fs.readdirSync(source, {withFileTypes: true})
		.forEach((entry: { name: any; isDirectory: () => any; }) => {
			let sourcePath = path.join(source, entry.name)
			let destinationPath = path.join(destination, entry.name)

			entry.isDirectory()
				? moveDirectory(sourcePath, destinationPath)
				: fs.copyFileSync(sourcePath, destinationPath)
		});
	fs.rmSync(source, {recursive: true, force: true})
}
const parseChapters = (readingNotesArray: Array<string>): Array<ReadingNoteDetails> => {
	let currentChapter
	const readingNotes = []
	for (const note of readingNotesArray) {
		const noteLines = note.split('\n').filter(line => line !== '')
		if(noteLines.length > 0){
			if(!noteLines[0].contains('|')) noteLines.shift()

			const fullFirstLine = noteLines[0]

			const creationTimeCandidate = fullFirstLine?.split('|')[0].trim()
			const creationTimeCandidateDate = new Date(creationTimeCandidate);
			if (creationTimeCandidateDate.toString() === 'Invalid Date') {
				currentChapter = fullFirstLine
				noteLines.splice(0, 1)
			}

			const chapterMeta = noteLines.shift()?.split('|')
			chapterMeta && readingNotes.push({
				highlightDate: chapterMeta[0].trim(),
				highlighPage: chapterMeta[1].trim(),
				section: currentChapter,
				quote: noteLines.join('\n')
			})
		}
	}

	return readingNotes
}
