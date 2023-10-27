const { spawn } = require('child_process')

module.exports = {
    hooks: {
        afterAllResolved: async (lockfile, context) => {
            const { workspaceDir } = context
            const myUiDir = `${workspaceDir}/packages/vueye-table`
            const docsDir = `${workspaceDir}/docs`

            // Install vueye-table package in docs package
            const installProcess = spawn('pnpm', ['add', myUiDir], {
                cwd: docsDir,
                stdio: 'inherit',
            })

            installProcess.on('exit', (code) => {
                if (code === 0) {
                    console.log('vueye-table package installed successfully in docs package')
                } else {
                    console.error('Failed to install vueye-table package in docs package')
                }
            })
        },
    },
}
