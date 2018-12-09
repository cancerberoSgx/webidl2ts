console.log('hello')

import './styles.css'

import { parse, write } from 'webidl2'
const text = document.querySelector('#input').value
var tree = parse(text)
var output = write(tree)
document.querySelector('#outputAST').innerHTML = JSON.stringify(tree, null, 2)

import { webidl2ts } from '../src/webidl2ts'

const typescript = webidl2ts(text)
document.querySelector('#outputTS').innerHTML = typescript
