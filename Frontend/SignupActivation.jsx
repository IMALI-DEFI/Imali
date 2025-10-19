import { useState } from 'react'
import { BotAPI } from '../utils/api'

export default function SignupActivation(){
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [token, setToken] = useState('')
  const [msg, setMsg] = useState('')

  const signup = async (e)=>{
    e.preventDefault()
    setMsg('Signing up...')
    try{
      const res = await BotAPI.signup({ email, password })
      setMsg('Signup successful. Check your email for activation.')
    }catch(e){
      setMsg(e?.response?.data?.message || 'Signup failed')
    }
  }

  const activate = async (e)=>{
    e.preventDefault()
    setMsg('Activating...')
    try{
      await BotAPI.activate(token)
      setMsg('Activation complete. You may now log in.')
    }catch(e){
      setMsg(e?.response?.data?.message || 'Activation failed')
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <form onSubmit={signup} className="card space-y-3">
        <h2 className="font-bold text-xl">Sign up</h2>
        <input required value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="border rounded-xl px-3 py-2 w-full"/>
        <input required type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" className="border rounded-xl px-3 py-2 w-full"/>
        <button className="btn btn-primary" type="submit">Create account</button>
      </form>

      <form onSubmit={activate} className="card space-y-3">
        <h2 className="font-bold text-xl">Activate account</h2>
        <input required value={token} onChange={e=>setToken(e.target.value)} placeholder="Activation token" className="border rounded-xl px-3 py-2 w-full"/>
        <button className="btn btn-primary" type="submit">Activate</button>
      </form>

      {msg && <div className="col-span-2 text-slate-600">{msg}</div>}
    </div>
  )
}
