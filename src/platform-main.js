import './platform.css'

import { renderPlatform } from './pages/platform.js'
import { student } from './data/students.js'

document.querySelector('#app').innerHTML = renderPlatform(student)