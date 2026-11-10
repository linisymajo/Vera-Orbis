import './login.css'
import { supabase } from './lib/supabase.js'
import { mountPasswordRecovery } from './components/passwordRecovery.js'

mountPasswordRecovery(document.querySelector('#app'), supabase)
