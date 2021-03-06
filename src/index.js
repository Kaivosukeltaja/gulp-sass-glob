import path from 'path'
import fs from 'fs'
import through from 'through2'
import glob from 'glob'
import slash from 'slash'

const IMPORT_RE = /^([ \t]*(?:\/\*.*)?)@import\s+["']([^"']+\*[^"']*(?:\.scss|\.sass)?)["'];?([ \t]*(?:\/[\/\*].*)?)$/gm;

export default function gulpSassGlob(options = {}) {
    return through.obj((...args) => {
        transform(...args, options)
    })
}

function transform(file, env, callback, options = {}) {
    const includePaths = options.includePaths || [];
    for (let i = 0; i < includePaths.length; i++) {
        includePaths[i] = path.join(path.normalize(includePaths[i]), '/')
    }

    const isSass = path.extname(file.path) === '.sass'
    const base = path.normalize(path.join(path.dirname(file.path), '/'))


    const searchBases = [base, ...includePaths]
    let contents = file.contents.toString('utf-8')
    let contentsCount = contents.split('\n').length

    let result

    for (var i = 0; i < contentsCount; i++) {
        result = IMPORT_RE.exec(contents)

        if (result !== null) {
            const [importRule, startComment, globPattern, endComment] = result;

            var files = [];
            var _base_path;
            for (let i = 0; i < searchBases.length; i++) {
                _base_path = searchBases[i];

                files = glob.sync(path.join(_base_path, globPattern), {
                    cwd: _base_path
                })
                if (files.length > 0) {
                    break
                }
            }

            let imports = []

            files.forEach((filename) => {
                if (filename !== file.path && isSassOrScss(filename)) {
                    // remove parent base path
                    filename = path.normalize(filename).replace(_base_path, '');
                    imports.push('@import "' + slash(filename) + '"' + (isSass ? '' : ';'))
                }
            })

            if (startComment) {
                imports.unshift(startComment)
            }

            if (endComment) {
                imports.push(endComment)
            }


            const replaceString = imports.join('\n')
            contents = contents.replace(importRule, replaceString)
            file.contents = new Buffer(contents)
        }
    }

    callback(null, file)
}

function isSassOrScss(filename) {
    return (!fs.statSync(filename).isDirectory() && path.extname(filename).match(/\.sass|\.scss/i))
}
