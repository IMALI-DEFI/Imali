import React,{useEffect,useState} from 'react';
export default function VaultPlayers(){
 const [players,setPlayers]=useState([]),[status,setStatus]=useState('Loading Vault registrations...');
 const refresh=async()=>{setStatus('Loading Vault registrations...');try{const token=localStorage.getItem('imali_token');const r=await fetch('https://www.blackculturevault.com/vault/api/admin/players',{headers:{Authorization:'Bearer '+token}});if(!r.ok)throw Error('Admin verification failed ('+r.status+').');const d=await r.json();setPlayers(d.users||[]);setStatus((d.users||[]).length+' Black Culture Vault registrations')}catch(e){setStatus(e.message)}};
 useEffect(()=>{refresh()},[]);
 return <div style={{padding:20}}><h2>Black Culture Vault Players</h2><p>Separate game registrations — not IMALI trading accounts.</p><button onClick={refresh}>Refresh players</button><p>{status}</p><div style={{overflowX:'auto'}}><table style={{width:'100%',textAlign:'left'}}><thead><tr><th>Name</th><th>Email</th><th>Registered</th></tr></thead><tbody>{players.map(p=><tr key={p.id}><td>{p.name}</td><td>{p.email}</td><td>{new Date(p.createdAt).toLocaleString()}</td></tr>)}</tbody></table></div></div>
}
