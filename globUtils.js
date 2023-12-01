const {glob} = require('glob')

// custom ignores can be done like this, for example by saying
// you'll ignore all markdown files, and all folders named 'docs'
const customIgnoreResults = await glob('**', {
	ignore: {
		ignored: p => /\.md$/.test(p.name),
		childrenIgnored: p => p.isNamed('docs'),
	},
})

